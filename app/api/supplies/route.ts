import { NextResponse } from 'next/server';
import { upsertSupply } from '@/db/database';

export async function POST(req: Request) {
  const { child_id, type, unit, daily_usage, current_stock, reorder_threshold, pharmacy_url } = await req.json();
  if (!child_id || !type) return NextResponse.json({ error: 'child_id and type are required' }, { status: 400 });
  upsertSupply(child_id, type, unit ?? 'units', daily_usage ?? 1, current_stock ?? 0, reorder_threshold ?? 14, pharmacy_url ?? null);
  return NextResponse.json({ ok: true });
}
