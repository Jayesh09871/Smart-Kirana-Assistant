import { NextRequest, NextResponse } from 'next/server';
import { processVoiceEntry } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription required' }, { status: 400 });
    }

    const parsed = await processVoiceEntry(transcription);
    return NextResponse.json({ parsed });
  } catch (error) {
    console.error('Voice entry error:', error);
    return NextResponse.json({ error: 'Failed to process voice entry' }, { status: 500 });
  }
}
