import { NextResponse } from 'next/server';
import { upsertSupply, updateImportance } from '@/db/database';

export async function POST(req: Request) {
  const { child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url } = await req.json();
  if (!child_id || !type) return NextResponse.json({ error: 'child_id and type are required' }, { status: 400 });
  upsertSupply(child_id, type, unit ?? 'units', daily_usage ?? 1, current_stock ?? 0, reorder_threshold ?? 14, pharmacy_url ?? null);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { supply_id, importance } = await req.json();
  if (!supply_id || ![1, 2, 3].includes(importance)) {
    return NextResponse.json({ error: 'supply_id and importance (1-3) required' }, { status: 400 });
  }
  const ok = updateImportance(supply_id, importance);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
