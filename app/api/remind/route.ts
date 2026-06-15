import { NextResponse } from 'next/server';
import { getDb } from '@/db/database';

export async function POST() {
  const phone = process.env.REMINDER_PHONE;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  const db = getDb();
  const lowSupplies = db.prepare(`
    SELECT c.name as child_name, s.type, s.current_stock, s.daily_usage, s.reorder_threshold,
           CAST(s.current_stock / s.daily_usage AS INTEGER) as days_remaining
    FROM supplies s
    JOIN children c ON c.id = s.child_id
    WHERE (s.current_stock / s.daily_usage) <= s.reorder_threshold
    ORDER BY days_remaining ASC
  `).all() as Array<{ child_name: string; type: string; days_remaining: number; pharmacy_url?: string }>;

  if (!lowSupplies.length) return NextResponse.json({ sent: 0, message: 'All supplies OK' });

  const lines = lowSupplies.map(s =>
    `• ${s.child_name} — ${formatType(s.type)}: ${s.days_remaining} day${s.days_remaining === 1 ? '' : 's'} left`
  );
  const message = `TaskMom Alert 🩺\n\nSupplies running low:\n${lines.join('\n')}\n\nReorder now to stay covered.`;

  const twilioReady = !!(sid && token && from && phone);
  if (twilioReady) {
    const twilio = (await import('twilio')).default;
    const client = twilio(sid!, token!);
    await client.messages.create({ body: message, from: from!, to: phone! });
  }

  return NextResponse.json({ sent: lowSupplies.length, message, twilioConfigured: twilioReady });
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
