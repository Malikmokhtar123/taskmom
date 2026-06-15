import { NextResponse } from 'next/server';
import { getDb } from '@/db/database';

export async function POST(req: Request) {
  const { child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url } = await req.json();
  if (!child_id || !type) return NextResponse.json({ error: 'child_id and type are required' }, { status: 400 });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM supplies WHERE child_id = ? AND type = ?').get(child_id, type);

  if (existing) {
    db.prepare(`
      UPDATE supplies SET unit=?, daily_usage=?, current_stock=?, reorder_threshold=?, pharmacy_url=?, updated_at=datetime('now')
      WHERE child_id=? AND type=?
    `).run(unit ?? 'units', daily_usage ?? 1, current_stock ?? 0, reorder_threshold ?? 14, pharmacy_url ?? null, child_id, type);
  } else {
    db.prepare(`
      INSERT INTO supplies (child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(child_id, type, unit ?? 'units', daily_usage ?? 1, current_stock ?? 0, reorder_threshold ?? 14, pharmacy_url ?? null);
  }

  return NextResponse.json({ ok: true });
}
