import { NextResponse } from 'next/server';
import { getChildrenWithSupplies, addChild } from '@/db/database';

export async function GET() {
  return NextResponse.json(getChildrenWithSupplies());
}

export async function POST(req: Request) {
  const { name, dob } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  return NextResponse.json(addChild(name.trim(), dob ?? null));
}
