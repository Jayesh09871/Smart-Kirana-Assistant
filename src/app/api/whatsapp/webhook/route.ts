import { NextRequest, NextResponse } from 'next/server';

// Handle GET requests for webhook verification (Meta's challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify the mode and token
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[Webhook] Verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

// Handle POST requests (incoming WhatsApp messages)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received message:', JSON.stringify(body, null, 2));

    // TODO: Process incoming messages here (AI parsing, customer creation, etc.)

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
