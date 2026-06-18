import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

if (typeof global !== 'undefined') {
  if (!(global as any).DOMMatrix) (global as any).DOMMatrix = class DOMMatrix {};
  if (!(global as any).Path2D) (global as any).Path2D = class Path2D {};
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();

    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error('Resume Extract Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
