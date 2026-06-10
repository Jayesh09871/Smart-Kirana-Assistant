import { NextRequest, NextResponse } from 'next/server';
import { parseWhatsAppMessage } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const parsed = await parseWhatsAppMessage(message);
    return NextResponse.json({ parsed });
  } catch (error) {
    console.error('Parse WhatsApp error:', error);
    return NextResponse.json({ error: 'Failed to parse message' }, { status: 500 });
  }
}
