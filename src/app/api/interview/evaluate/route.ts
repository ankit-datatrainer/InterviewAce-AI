import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { transcript, role, difficulty } = await req.json();

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NVIDIA_NIM_API_KEY is not configured' }, { status: 500 });
    }

    const prompt = `You are an expert technical recruiter and interviewer.
Review the following interview transcript for a candidate applying for "${role}" at a "${difficulty}" level.

Transcript:
${transcript.map((m: any) => `${m.who === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.text}`).join('\n')}

Evaluate the candidate's performance. Return EXACTLY a JSON object matching this structure (no markdown, no text outside JSON):
{
  "score": 85, // Overall score out of 100
  "metrics": {
    "communication": 8.5, // out of 10
    "confidence": 8.0, // out of 10
    "clarity": 8.5,
    "bodyLanguage": 7.5,
    "eyeContact": 7.0,
    "appearance": 8.0,
    "posture": 8.0,
    "technicalKnowledge": 8.5,
    "problemSolving": 8.0,
    "leadership": 7.5
  },
  "feedback": {
    "strengths": "Detailed paragraph about what they did well.",
    "improvements": "Detailed paragraph about what needs improvement.",
    "nextStep": "Actionable next step for their preparation."
  }
}`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA NIM API Error:', errorText);
      return NextResponse.json({ error: 'Failed to evaluate interview' }, { status: 500 });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.substring(7);
    if (content.startsWith('```')) content = content.substring(3);
    if (content.endsWith('```')) content = content.substring(0, content.length - 3);

    const result = JSON.parse(content.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Interview Evaluate Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
