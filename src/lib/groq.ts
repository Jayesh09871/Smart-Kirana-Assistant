import { AIParsedEntry, StockPrediction } from '@/types';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function parseWhatsAppMessage(message: string): Promise<AIParsedEntry> {
  const systemPrompt = `You are an AI assistant for a small Indian grocery (kirana) shop. Parse the given WhatsApp message or Hinglish text and extract transaction information.

Return ONLY valid JSON in this exact format:
{
  "customerName": "extracted customer name or null",
  "amount": extracted_amount_as_number_or_null,
  "action": "udhar" or "payment",
  "items": ["list of items if mentioned"],
  "description": "brief description",
  "confidence": 0.0 to 1.0
}

Rules:
- "udhar" means credit given to customer (they owe money)
- "payment" means customer paid back money
- Support Hindi, Hinglish, and English
- "ko" usually indicates udhar (e.g., "Ramesh ko 500")
- "ne" + "pay/diya" usually indicates payment (e.g., "Shyam ne 300 pay kiye")
- If unclear, default to "udhar"
- Extract numbers from text (e.g., "paanch sau" = 500)`;

  const result = await callGroq(systemPrompt, message);
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      action: 'udhar',
      confidence: 0,
      description: 'Failed to parse message',
    };
  }
}

export async function processVoiceEntry(transcription: string): Promise<AIParsedEntry> {
  return parseWhatsAppMessage(transcription);
}

export async function getStockPredictions(
  products: { name: string; stock: number; minStock: number }[],
  recentTransactions: { items: string[]; date: Date }[]
): Promise<StockPrediction[]> {
  const systemPrompt = `You are an AI inventory analyst for a small Indian grocery shop. Given product stock levels and recent transaction data, predict which items will run out soon.

Return ONLY valid JSON array:
[{
  "productName": "product name",
  "currentStock": number,
  "daysToFinish": estimated_days,
  "dailyUsage": estimated_daily_usage,
  "suggestion": "restocking suggestion in simple language"
}]

Only include items that are likely to run out within 7 days. If no predictions can be made, return empty array [].`;

  const userPrompt = `Products: ${JSON.stringify(products)}\nRecent Transactions: ${JSON.stringify(recentTransactions)}`;

  const result = await callGroq(systemPrompt, userPrompt);
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
