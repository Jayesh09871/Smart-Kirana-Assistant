import { AIParsedEntry, AIParsedOrder, StockPrediction } from '@/types';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }
  
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

// Simple manual parser fallback
function simpleParseOrder(message: string): AIParsedOrder {
  console.warn('[Groq] No API key found, using simple manual parser');
  
  const items: { productName: string; quantity: number; unit: string }[] = [];
  
  // Simple regex to find quantity and product (e.g., "5 kg daal")
  const regex = /(\d+)\s*(kg|ltr|pack|pcs|dozen|gm|ml|packet)?\s*([a-zA-Z\s]+?)(?=\s*(?:and|,|$))/g;
  let match;
  
  while ((match = regex.exec(message)) !== null) {
    const qty = parseInt(match[1], 10);
    const unit = match[2] || 'pcs';
    const product = match[3].trim();
    if (product) {
      items.push({ productName: product, quantity: qty, unit });
    }
  }
  
  // If no items found, add the whole message as a note
  if (items.length === 0) {
    items.push({ productName: 'Item', quantity: 1, unit: 'pcs' });
  }
  
  return {
    customerName: 'Unknown Customer',
    items,
    notes: message,
    confidence: 0.5
  };
}

export async function parseWhatsAppOrder(message: string): Promise<AIParsedOrder> {
  if (!GROQ_API_KEY) {
    return simpleParseOrder(message);
  }

  const systemPrompt = `You are an AI assistant for a small Indian grocery (kirana) shop. Parse the given WhatsApp message (can be Hindi, Hinglish, or English) and extract order information.

Return ONLY valid JSON in this exact format:
{
  "customerName": "Customer's name (or 'Unknown Customer' if not mentioned)",
  "items": [
    {
      "productName": "Name of product",
      "quantity": number,
      "unit": "pcs/kg/ltr/gm/ml/dozen/packet etc."
    }
  ],
  "notes": "Any additional notes or instructions from message",
  "confidence": 0.0 to 1.0 (how confident you are in parsing)
}

Rules:
1. Support Hindi, Hinglish, and English
2. Examples:
   - "Bhaiya 5 kg chawal aur 2 pack biscuit bhej dena" → items: [{"productName":"chawal","quantity":5,"unit":"kg"}, {"productName":"biscuit","quantity":2,"unit":"packet"}]
   - "Aaj 3 ltr dudh aur 10 pcs bread le aana" → items: [{"productName":"dudh","quantity":3,"unit":"ltr"}, {"productName":"bread","quantity":10,"unit":"pcs"}]
3. If quantity not mentioned, default to 1
4. If unit not clear, default to "pcs"
5. Extract all products mentioned
6. customerName is mandatory - if not found, use "Unknown Customer"
7. notes can be empty string if no notes`;

  try {
    const result = await callGroq(systemPrompt, message);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI response, falling back to simple parser:', e);
    return simpleParseOrder(message);
  }
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

  if (!GROQ_API_KEY) {
    return {
      action: 'udhar',
      confidence: 0,
      description: message,
    };
  }

  try {
    const result = await callGroq(systemPrompt, message);
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
  if (!GROQ_API_KEY) {
    return [];
  }

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

  try {
    const result = await callGroq(systemPrompt, userPrompt);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}