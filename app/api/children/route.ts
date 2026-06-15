import { NextResponse } from 'next/server';
import { getDb } from '@/db/database';

export async function GET() {
  const db = getDb();
  const children = db.prepare('SELECT * FROM children ORDER BY name').all() as Array<{ id: number; name: string; dob: string | null }>;
  const supplies = db.prepare(`
    SELECT *, CAST(current_stock / daily_usage AS INTEGER) as days_remaining
    FROM supplies ORDER BY type
  `).all() as Array<{ child_id: number; [key: string]: unknown }>;

  const supplyMap = new Map<number, unknown[]>();
  for (const s of supplies) {
    if (!supplyMap.has(s.child_id)) supplyMap.set(s.child_id, []);
    supplyMap.get(s.child_id)!.push(s);
  }

  return NextResponse.json(
    children.map(c => ({ ...c, supplies: supplyMap.get(c.id) ?? [] }))
  );
}

export async function POST(req: Request) {
  const { name, dob } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const db = getDb();
  const result = db.prepare('INSERT INTO children (name, dob) VALUES (?, ?)').run(name.trim(), dob ?? null);
  return NextResponse.json({ id: result.lastInsertRowid, name, dob });
}
