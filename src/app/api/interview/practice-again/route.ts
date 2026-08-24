import { NextRequest, NextResponse } from 'next/server';
import { nimChat, isNimConfigured, parseJsonFromModel } from '@/lib/nim';

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
  "improvedKeywords": ["..."]
}`;

    let result: any = null;

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
        result = parseJsonFromModel(content);
      } catch (aiErr) {
        console.warn('Practice Again AI call failed; using deterministic fallback:', aiErr);
      }
    }

    // Deterministic fallback if AI is slow / unavailable
    if (!result || typeof result.newScore !== 'number') {
      const len = revisedAnswer.length;
      const hasNumbers = /\d/.test(revisedAnswer);
      const hasActionVerbs = /\b(built|led|designed|implemented|reduced|increased|migrated|automated|shipped|managed)\b/i.test(revisedAnswer);
      
      let baseScore = prevScoreNum;
      if (len > (previousAnswer?.length || 0) + 80) baseScore += 15;
      if (hasNumbers) baseScore += 12;
      if (hasActionVerbs) baseScore += 10;
      const newScore = Math.min(94, Math.max(prevScoreNum + 8, baseScore));
      
      const verdict = newScore >= 80 ? 'strong' : newScore >= 60 ? 'adequate' : 'weak';

      result = {
        newScore,
        verdict,
        whatImproved: `You provided more depth and clarity compared to your first attempt (${revisedAnswer.split(/\s+/).length} words vs ${previousAnswer?.split(/\s+/).length || 0} words)${hasNumbers ? ', including concrete metric details.' : '.'}`,
        whatStillNeedsWork: newScore < 85 ? 'Close with a strong concluding sentence tying your result back to team or business impact.' : 'Excellent structure and delivery.',
        starCoverage: {
          situation: len > 60,
          task: /\b(task|goal|responsible|had to)\b/i.test(revisedAnswer),
          action: hasActionVerbs,
          result: hasNumbers || /\b(result|improved|saved|delivered)\b/i.test(revisedAnswer),
        },
        improvedKeywords: [],
      };
    }

    const scoreDelta = Math.round(result.newScore - prevScoreNum);

    return NextResponse.json({
      ...result,
      previousScore: prevScoreNum,
      scoreDelta,
    });
  } catch (error: any) {
    console.error('Practice Again Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
