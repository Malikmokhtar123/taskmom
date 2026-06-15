import { NextResponse } from 'next/server';
import { getLowSupplies } from '@/db/database';

export async function POST() {
  const lowSupplies = getLowSupplies();
  if (!lowSupplies.length) return NextResponse.json({ sent: 0, message: 'All supplies OK' });

  const apiKey = process.env.GROQ_API_KEY;
  let message: string;

  if (apiKey) {
    const { default: Groq } = await import('groq-sdk');
    const client = new Groq({ apiKey });
    const supplyList = lowSupplies
      .map(s => `${s.child_name}: ${fmt(s.type)} — ${s.days_remaining} day${s.days_remaining === 1 ? '' : 's'} left`)
      .join('\n');
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Write a warm, brief SMS reminder for a mom managing T1D supplies for her 5 kids. These need reordering:\n${supplyList}\n\nMax 160 characters. Conversational and caring. Start with "TaskMom:".`,
      }],
    });
    message = res.choices[0].message.content ?? '';
  } else {
    const lines = lowSupplies.map(s => `• ${s.child_name} — ${fmt(s.type)}: ${s.days_remaining}d left`);
    message = `TaskMom Alert\n\nSupplies running low:\n${lines.join('\n')}\n\nReorder now.`;
  }

  const phone = process.env.REMINDER_PHONE;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;
  const twilioReady = !!(sid && token && from && phone);

  if (twilioReady) {
    const { default: twilio } = await import('twilio');
    const client = twilio(sid!, token!);
    await client.messages.create({ body: message, from: from!, to: phone! });
  }

  return NextResponse.json({ sent: lowSupplies.length, message, twilioConfigured: twilioReady });
}

function fmt(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
