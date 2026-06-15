import { NextResponse } from 'next/server';
import { getChildrenWithSupplies } from '@/db/database';

export async function POST() {
  const children = getChildrenWithSupplies();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const urgent = children.flatMap(c => c.supplies).filter(s => s.days_remaining <= 7);
    const names = [...new Set(urgent.map(s => children.find(c => c.supplies.some(x => x.id === s.id))?.name))].join(', ');
    return NextResponse.json({
      insight: urgent.length
        ? `${urgent.length} supply item${urgent.length > 1 ? 's' : ''} need urgent reordering (${names}). Add your ANTHROPIC_API_KEY to Vercel environment variables to unlock AI-powered care insights.`
        : `All supplies look good right now! Add your ANTHROPIC_API_KEY to Vercel environment variables to unlock AI-powered care insights.`,
    });
  }

  const summary = children.map(c => {
    const items = c.supplies.map(s => `${s.type.replace(/_/g, ' ')} ${s.days_remaining}d`).join(', ');
    return `${c.name}: ${items || 'no supplies tracked'}`;
  }).join('\n');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `You're a caring health assistant helping a busy mom manage Type 1 Diabetes supplies for her 5 kids. Give a concise (3–4 sentences), warm, actionable summary of the current supply situation. Highlight the most urgent items and any good news.\n\nCurrent supply status (days remaining):\n${summary}`,
    }],
  });

  return NextResponse.json({ insight: (res.content[0] as { text: string }).text });
}
