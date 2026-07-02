import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { interviewData } = data;

    if (!interviewData) {
      return NextResponse.json({ error: 'Missing interview data' }, { status: 400 });
    }

    const { role, difficulty, score, metrics, feedback, transcript } = interviewData;

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'InterviewAce AI - Mock Interview Report',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Target Role: ', bold: true }),
                new TextRun(role || 'Not specified'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Difficulty Level: ', bold: true }),
                new TextRun(difficulty || 'Not specified'),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: 'Overall Performance',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Overall Score: ${score}/100`, bold: true, size: 28 }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: 'Feedback Summary',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Strengths: ', bold: true }),
                new TextRun(feedback?.strengths || 'N/A'),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Areas for Improvement: ', bold: true }),
                new TextRun(feedback?.improvements || 'N/A'),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Next Steps: ', bold: true }),
                new TextRun(feedback?.nextStep || 'N/A'),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: 'Performance Metrics (Out of 10)',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 200 },
            }),
            ...Object.entries(metrics || {}).map(
              ([key, value]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}: `, bold: true }),
                    new TextRun(`${value}/10`),
                  ],
                })
            ),
            new Paragraph({
              text: 'Interview Transcript',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 600, after: 200 },
            }),
            ...(transcript || []).map((msg: any) => 
              new Paragraph({
                children: [
                  new TextRun({ text: `${msg.who === 'ai' ? 'Interviewer' : 'Candidate'}: `, bold: true, color: msg.who === 'ai' ? '0052FF' : '10B981' }),
                  new TextRun(msg.text),
                ],
                spacing: { after: 200 },
              })
            ),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="interview-report-${Date.now()}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
  } catch (error: any) {
    console.error('DOCX Export Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
