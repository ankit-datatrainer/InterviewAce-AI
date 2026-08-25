import { NextRequest, NextResponse } from 'next/server';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { normalizeResumeProfile, resumeProfileToText } from '@/lib/resume-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'resume';
}

function rtfEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, (character) => `\\u${character.charCodeAt(0)}?`)
    .replace(/\n/g, '\\line ');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = normalizeResumeProfile(body?.profile);
    const format = body?.format === 'rtf' ? 'rtf' : 'docx';
    const filename = safeName(profile.name || profile.title);

    if (!profile.name && !profile.summary && profile.experience.length === 0) {
      return NextResponse.json({ error: 'Add resume content before exporting.' }, { status: 400 });
    }

    if (format === 'rtf') {
      const rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Aptos;}}\\fs22 ${rtfEscape(resumeProfileToText(profile))}}`;
      return new NextResponse(rtf, {
        headers: {
          'Content-Type': 'application/rtf',
          'Content-Disposition': `attachment; filename="${filename}.rtf"`,
        },
      });
    }

    const children: Paragraph[] = [
      new Paragraph({
        text: profile.name || 'Resume',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: profile.title, alignment: AlignmentType.CENTER }),
      new Paragraph({
        text: [profile.email, profile.phone, profile.location, profile.linkedin].filter(Boolean).join('  •  '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
    ];

    const heading = (label: string) => children.push(new Paragraph({ text: label, heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 } }));
    if (profile.summary) {
      heading('Professional Summary');
      children.push(new Paragraph(profile.summary));
    }
    if (profile.experience.length > 0) {
      heading('Experience');
      profile.experience.forEach((item) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: item.role || 'Role', bold: true }),
            new TextRun({ text: item.company ? ` — ${item.company}` : '' }),
            new TextRun({ text: item.date ? `  |  ${item.date}` : '', italics: true }),
          ],
          spacing: { before: 140 },
        }));
        if (item.desc) children.push(new Paragraph({ text: item.desc, bullet: { level: 0 } }));
      });
    }
    if (profile.projects.length > 0) {
      heading('Projects');
      profile.projects.forEach((item) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: item.name || 'Project', bold: true }), new TextRun(item.date ? `  |  ${item.date}` : '')],
        }));
        if (item.desc) children.push(new Paragraph(item.desc));
        if (item.technologies) children.push(new Paragraph({ children: [new TextRun({ text: 'Technologies: ', bold: true }), new TextRun(item.technologies)] }));
      });
    }
    if (profile.education.length > 0) {
      heading('Education');
      profile.education.forEach((item) => children.push(new Paragraph({
        children: [
          new TextRun({ text: item.degree || 'Degree', bold: true }),
          new TextRun(item.school ? ` — ${item.school}` : ''),
          new TextRun({ text: item.date ? `  |  ${item.date}` : '', italics: true }),
        ],
      })));
    }
    if (profile.achievements.length > 0) {
      heading('Achievements');
      profile.achievements.forEach((item) => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
    }
    if (profile.skills) {
      heading('Skills');
      children.push(new Paragraph(profile.skills));
    }

    const document = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(document);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not export resume.' }, { status: 500 });
  }
}
