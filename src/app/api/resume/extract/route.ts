import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 100_000;

if (typeof global !== 'undefined') {
  if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {} as typeof DOMMatrix;
  if (!global.Path2D) global.Path2D = class Path2D {} as typeof Path2D;
}

function cleanExtractedText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

function fileKind(file: File): 'pdf' | 'docx' | 'text' | null {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || name.endsWith('.docx')
  ) return 'docx';
  if (file.type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const value = formData.get('file');

    if (!(value instanceof File)) {
      return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
    }
    if (value.size === 0) {
      return NextResponse.json({ error: 'The resume file is empty.' }, { status: 400 });
    }
    if (value.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Resume files must be 10 MB or smaller.' }, { status: 413 });
    }

    const kind = fileKind(value);
    if (!kind) {
      return NextResponse.json(
        { error: 'Unsupported resume format. Upload a PDF, DOCX, TXT, or Markdown file.' },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await value.arrayBuffer());
    let rawText = '';
    if (kind === 'pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        rawText = (await parser.getText()).text;
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } else if (kind === 'docx') {
      rawText = (await mammoth.extractRawText({ buffer })).value;
    } else {
      rawText = buffer.toString('utf8');
    }

    const text = cleanExtractedText(rawText);
    if (text.length < 40) {
      return NextResponse.json(
        { error: 'Very little readable text was found. Try exporting the resume as a text-based PDF or DOCX.' },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        text,
        fileName: value.name,
        format: kind,
        extractedCharacters: text.length,
        truncated: rawText.length > MAX_EXTRACTED_CHARS,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    console.error('Resume Extract Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not extract the resume.' },
      { status: 500 },
    );
  }
}
