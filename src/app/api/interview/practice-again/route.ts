import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

interface PracticeResult {
  newScore: number;
  verdict: 'strong' | 'adequate' | 'weak';
  whatImproved: string;
  whatStillNeedsWork: string;
  starCoverage: { situation: boolean; task: boolean; action: boolean; result: boolean };
  improvedKeywords: string[];
  comparison?: { status: 'improved' | 'stable' | 'weaker'; explanation: string };
  evidenceAdded?: string[];
  frameworkAssessment?: {
    preservedFacts: string[];
    placeholdersNeeded: string[];
    guidance: string;
  };
  nextPracticeQuestion?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question,
      previousAnswer,
      previousScore = 50,
      revisedAnswer,
      role = 'General',
    } = body;

    if (!question || !revisedAnswer) {
      return NextResponse.json(
        { error: 'Question and revised answer are required.' },
        { status: 400 }
      );
    }

    const prevScoreNum = Number(previousScore) || 50;

    const prompt = `You are an expert interview coach evaluating a candidate who is re-practicing their answer to a specific interview question.
Target Role: "${role}"

Original Question:
"${question}"

Previous Weak Answer:
"${previousAnswer || 'None provided'}"
(Previous Score: ${prevScoreNum}/100)

Candidate's NEW Revised Answer:
"${revisedAnswer}"

Evaluate how much the candidate improved.
Rules:
- Score the new answer strictly between 0 and 100 based on structure (STAR), concrete details/metrics, and clarity.
- Compare with the previous answer: explain what specifically improved (e.g. added quantifiable metrics, clearer personal action).
- Point out any remaining gap if not 90+.
- Check STAR coverage (situation, task, action, result).
- Never reward or invent a fabricated employer, project, action, number, or outcome.
- Identify which evidence was genuinely added. If a new claim cannot be checked against the previous answer, flag it for the candidate to verify.
- Give an honest framework using placeholders such as [verified metric] where facts are missing.
- Provide one different practice question that tests the same weak competency without encouraging memorization.

Return EXACTLY this JSON structure:
{
  "newScore": 0,
  "verdict": "strong|adequate|weak",
  "whatImproved": "...",
  "whatStillNeedsWork": "...",
  "starCoverage": {
    "situation": true,
    "task": true,
    "action": true,
    "result": true
  },
  "improvedKeywords": ["..."],
  "comparison": { "status": "improved|stable|weaker", "explanation": "..." },
  "evidenceAdded": ["..."],
  "frameworkAssessment": {
    "preservedFacts": ["..."],
    "placeholdersNeeded": ["[verified metric]"],
    "guidance": "..."
  },
  "nextPracticeQuestion": "..."
}`;

    let result: PracticeResult | null = null;

    if (isNimConfigured()) {
      try {
        const content = await nimChat(
          [
            {
              role: 'system',
              content:
                'You are an expert interview coach evaluating a candidate who is practicing a weak answer again. Compare their new answer with the previous attempt and return only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          { temperature: 0.3, maxTokens: 900, json: true, timeoutMs: 15000 }
        );
        result = parseJsonFromModel<PracticeResult>(content);
      } catch (aiErr) {
        console.warn('Practice Again AI call failed; using deterministic fallback:', aiErr);
      }
    }

    // Deterministic fallback if AI is slow / unavailable
    if (!result || typeof result.newScore !== 'number') {
      const len = revisedAnswer.length;
      const hasNumbers = /\d/.test(revisedAnswer);
      const hasActionVerbs = /\b(built|led|designed|implemented|reduced|increased|migrated|automated|shipped|managed)\b/i.test(revisedAnswer);
      const starCoverage = {
        situation: len > 60 && /\b(when|during|at my|in my|our team|the situation)\b/i.test(revisedAnswer),
        task: /\b(task|goal|responsible|had to|needed to|objective)\b/i.test(revisedAnswer),
        action: hasActionVerbs,
        result: hasNumbers || /\b(result|improved|saved|delivered|outcome|impact)\b/i.test(revisedAnswer),
      };
      const starCount = Object.values(starCoverage).filter(Boolean).length;
      let newScore = 28 + Math.min(24, Math.round(len / 18)) + starCount * 8;
      if (hasNumbers) newScore += 8;
      if (hasActionVerbs) newScore += 6;
      newScore = Math.max(20, Math.min(95, newScore));

      const verdict: PracticeResult['verdict'] = newScore >= 80 ? 'strong' : newScore >= 60 ? 'adequate' : 'weak';
      const delta = newScore - prevScoreNum;

      result = {
        newScore,
        verdict,
        whatImproved: delta > 0
          ? `This attempt was ${delta} points stronger: you provided ${revisedAnswer.split(/\s+/).length} words versus ${previousAnswer?.split(/\s+/).length || 0}${hasNumbers ? ' and added concrete metric detail' : ''}.`
          : `This attempt did not improve yet. It needs more specific personal action, evidence, and a clear result than the previous answer.`,
        whatStillNeedsWork: newScore < 85 ? 'Close with a strong concluding sentence tying your result back to team or business impact.' : 'Excellent structure and delivery.',
        starCoverage,
        improvedKeywords: [],
        comparison: {
          status: delta > 2 ? 'improved' : delta < -2 ? 'weaker' : 'stable',
          explanation: delta > 2
            ? 'The revised answer contains more assessable structure or evidence than the prior attempt.'
            : delta < -2
              ? 'The revised answer removed useful detail or structure that appeared previously.'
              : 'The evidence and structure are broadly similar to the prior attempt.',
        },
        evidenceAdded: hasNumbers && !/\d/.test(previousAnswer || '')
          ? revisedAnswer.match(/[^.!?]*\d[^.!?]*/g)?.map((item: string) => item.trim()).slice(0, 3) || []
          : [],
        frameworkAssessment: {
          preservedFacts: extractSharedFacts(previousAnswer || '', revisedAnswer),
          placeholdersNeeded: [
            ...(!hasNumbers ? ['[verified metric or observable outcome]'] : []),
            ...(!starCoverage.action ? ['[specific action you personally took]'] : []),
          ],
          guidance: 'Keep only details you can defend. Use placeholders while drafting instead of making up experience or results.',
        },
        nextPracticeQuestion: buildVariation(question, role),
      };
    }

    result.newScore = Math.max(0, Math.min(100, Math.round(result.newScore)));
    const scoreDelta = Math.round(result.newScore - prevScoreNum);
    result.comparison = sanitizeComparison(result.comparison, scoreDelta);
    result.evidenceAdded = stringList(result.evidenceAdded);
    result.frameworkAssessment = sanitizeFramework(result.frameworkAssessment);
    result.nextPracticeQuestion = typeof result.nextPracticeQuestion === 'string' && result.nextPracticeQuestion.trim()
      ? result.nextPracticeQuestion.trim()
      : buildVariation(question, role);

    return NextResponse.json({
      ...result,
      previousScore: prevScoreNum,
      scoreDelta,
    });
  } catch (error: unknown) {
    console.error('Practice Again Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

function extractSharedFacts(previous: string, revised: string): string[] {
  const previousTokens = new Set(previous.toLowerCase().match(/[a-z0-9%]+/g) || []);
  return (revised.match(/[^.!?]+[.!?]?/g) || [])
    .filter((sentence) => (sentence.toLowerCase().match(/[a-z0-9%]+/g) || []).filter((token) => previousTokens.has(token)).length >= 4)
    .map((sentence) => sentence.trim())
    .slice(0, 3);
}

function buildVariation(question: string, role: string): string {
  if (/conflict|stakeholder|team|lead/i.test(question)) {
    return `For a ${role} role, tell me about a different disagreement where your personal action changed the outcome.`;
  }
  if (/technical|system|design|architecture|data|tool/i.test(question)) {
    return `Describe a different ${role} decision, the alternatives you rejected, and the verified result.`;
  }
  return `Give a different example relevant to ${role}: what was the real situation, what did you personally do, and what outcome can you verify?`;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, 6)
    : [];
}

function sanitizeComparison(value: unknown, delta: number): NonNullable<PracticeResult['comparison']> {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const expected = delta > 2 ? 'improved' : delta < -2 ? 'weaker' : 'stable';
  return {
    status: expected,
    explanation: typeof record.explanation === 'string' && record.explanation.trim()
      ? record.explanation.trim()
      : expected === 'improved'
        ? 'The revised answer scored better on evidence, structure or clarity.'
        : expected === 'weaker'
          ? 'The revised answer lost useful evidence or structure from the prior attempt.'
          : 'The revised answer has not materially changed the assessable evidence yet.',
  };
}

function sanitizeFramework(value: unknown): NonNullable<PracticeResult['frameworkAssessment']> {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    preservedFacts: stringList(record.preservedFacts),
    placeholdersNeeded: stringList(record.placeholdersNeeded),
    guidance: typeof record.guidance === 'string' && record.guidance.trim()
      ? record.guidance.trim()
      : 'Use only facts you can defend; keep placeholders for any missing metric, action or outcome.',
  };
}
