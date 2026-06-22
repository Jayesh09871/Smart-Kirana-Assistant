import { NextRequest, NextResponse } from 'next/server';

// Wait, better to just import the webhook POST handler
// But since we can't easily, let's just use the code or call our webhook endpoint directly from debug!
export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const body = await request.json();
    console.log('[Test Payload API] Forwarding to real webhook');
    
    const response = await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Test Payload API] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
