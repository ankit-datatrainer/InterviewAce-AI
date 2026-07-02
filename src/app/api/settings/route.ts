import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const settingsPath = path.join(process.cwd(), 'src/lib/settings.json');

export async function GET() {
  try {
    if (!fs.existsSync(settingsPath)) {
      // Create it if it doesn't exist
      fs.writeFileSync(settingsPath, JSON.stringify({ maintenance: false, signups: true }), 'utf-8');
    }
    const data = fs.readFileSync(settingsPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (e) {
    return NextResponse.json({ maintenance: false, signups: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let current = { maintenance: false, signups: true };
    try {
      if (fs.existsSync(settingsPath)) {
        current = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
    } catch(e) {}
    
    const updated = { ...current, ...body };
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf-8');
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
