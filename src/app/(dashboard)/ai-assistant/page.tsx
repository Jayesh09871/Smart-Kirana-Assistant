'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Check,
  TrendingDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@/context/I18nContext';

interface ParsedEntry {
  customerName?: string;
  amount?: number;
  action: 'udhar' | 'payment';
  items?: string[];
  description?: string;
  confidence: number;
}

interface StockPrediction {
  productName: string;
  currentStock: number;
  daysToFinish: number;
  dailyUsage: number;
  suggestion: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  parsed?: ParsedEntry;
  isVoice?: boolean;
  confirmed?: boolean;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<'chat' | 'voice' | 'predictions'>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [predLoading, setPredLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const parseMessage = async () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/parse-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      const parsed: ParsedEntry = data.parsed;

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: parsed.customerName
            ? `Detected: ${parsed.action === 'udhar' ? 'Udhar' : 'Payment'} of ₹${parsed.amount} for ${parsed.customerName}`
            : 'Could not parse the message. Try: "Ramesh ko 500 ka udhar"',
          parsed,
        },
      ]);
    } catch {
      toast.error('Failed to parse message');
    } finally {
      setLoading(false);
    }
  };

  const confirmEntry = async (parsed: ParsedEntry, msgIndex?: number) => {
    if (!parsed.customerName || !parsed.amount) {
      toast.error('Missing customer name or amount');
      return;
    }

    // Mark message as confirmed
    if (msgIndex !== undefined) {
      setMessages((prev) => prev.map((m, i) => i === msgIndex ? { ...m, confirmed: true } : m));
    }

    try {
      // Search for customer
      const custRes = await fetch(`/api/customers?search=${encodeURIComponent(parsed.customerName)}`);
      const custData = await custRes.json();
      let customerId = custData.customers?.[0]?._id;

      if (!customerId) {
        // Create new customer
        const newCust = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: parsed.customerName }),
        });
        if (!newCust.ok) {
          toast.error('Failed to create customer');
          return;
        }
        const newCustData = await newCust.json();
        customerId = newCustData.customer._id;
      }

      // Create transaction
      const txnRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          type: parsed.action,
          amount: parsed.amount,
          description: parsed.description || `${parsed.action === 'udhar' ? 'Udhar' : 'Payment'} via AI`,
          items: parsed.items || [],
        }),
      });

      if (!txnRes.ok) {
        toast.error('Failed to create transaction');
        return;
      }

      toast.success(`${parsed.action === 'udhar' ? 'Udhar' : 'Payment'} of ₹${parsed.amount} recorded for ${parsed.customerName}!`);
    } catch (err) {
      console.error('Entry creation error:', err);
      toast.error('Failed to create entry. Please try again.');
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setMessages((prev) => [...prev, { role: 'user', content: `🎤 ${transcript}`, isVoice: true }]);

      setLoading(true);
      try {
        const res = await fetch('/api/ai/voice-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcription: transcript }),
        });
        const data = await res.json();
        const parsed: ParsedEntry = data.parsed;

        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: parsed.customerName
              ? `Voice detected: ${parsed.action === 'udhar' ? 'Udhar' : 'Payment'} of ₹${parsed.amount} for ${parsed.customerName}. Tap Confirm to save.`
              : `Heard: "${transcript}". Could not understand. Try: "Ramesh ko 500 ka udhar"`,
            parsed,
            isVoice: true,
          },
        ]);
      } catch (err) {
        console.error('Voice processing error:', err);
        toast.error('Failed to process voice input');
      } finally {
        setLoading(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition error');
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const fetchPredictions = async () => {
    setPredLoading(true);
    try {
      const res = await fetch('/api/ai/stock-predictions');
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
      }
    } catch {
      toast.error('Failed to get predictions');
    } finally {
      setPredLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Sparkles size={20} className="text-primary-500" />
        {t('ai.title')}
      </h2>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-1 flex border border-gray-100 dark:border-slate-700">
        {[
          { id: 'chat', label: t('ai.whatsapp'), icon: MessageSquare },
          { id: 'voice', label: t('ai.voice'), icon: Mic },
          { id: 'predictions', label: t('ai.predictions'), icon: TrendingDown },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id as 'chat' | 'voice' | 'predictions');
              if (id === 'predictions' && predictions.length === 0) fetchPredictions();
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === id
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-3 min-h-[250px] max-h-[400px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ai.pasteMessage')}
                </p>
                <div className="mt-3 space-y-2">
                  {[
                    'Ramesh ko 500 ka saman',
                    'Shyam ne 300 pay kiye',
                    'Priya ko 2kg atta aur 1kg dal udhar',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setMessage(example)}
                      className="block w-full text-left px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      &quot;{example}&quot;
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.parsed && msg.parsed.customerName && msg.parsed.amount && (
                    msg.confirmed ? (
                      <div className="mt-2 text-xs text-green-500 font-medium flex items-center gap-1">
                        <Check size={12} /> Entry saved
                      </div>
                    ) : (
                      <button
                        onClick={() => confirmEntry(msg.parsed!, i)}
                        className="mt-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Check size={12} />
                        Confirm Entry
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && parseMessage()}
              placeholder={t('ai.inputPlaceholder')}
              className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button
              onClick={parseMessage}
              disabled={loading || !message.trim()}
              className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Voice Tab */}
      {tab === 'voice' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('ai.voiceInstruction')}
            </p>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/30'
              }`}
            >
              {isListening ? (
                <MicOff size={36} className="text-white" />
              ) : (
                <Mic size={36} className="text-white" />
              )}
            </button>

            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {isListening ? t('ai.listening') : t('ai.tapToSpeak')}
            </p>

            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>Try: &quot;Ramesh ko 500 ka udhar&quot;</p>
              <p>Try: &quot;Shyam ne 300 pay kiye&quot;</p>
            </div>
          </div>

          {/* Voice results - show AI responses that came from voice input */}
          <div className="space-y-3">
            {messages
              .map((msg, idx) => ({ msg, idx }))
              .filter(({ msg }) => msg.role === 'ai' && msg.isVoice)
              .map(({ msg, idx }) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-300">{msg.content}</p>
                  {msg.parsed?.customerName && msg.parsed?.amount && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                        {msg.parsed.customerName} — ₹{msg.parsed.amount} ({msg.parsed.action})
                      </span>
                      {msg.confirmed ? (
                        <span className="text-xs text-green-500 font-medium flex items-center gap-1">
                          <Check size={12} /> Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => confirmEntry(msg.parsed!, idx)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Check size={12} />
                          Confirm
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
          </div>

          {loading && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 text-center">
              <Loader2 size={20} className="animate-spin mx-auto text-primary-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Processing voice input...</p>
            </div>
          )}
        </div>
      )}

      {/* Predictions Tab */}
      {tab === 'predictions' && (
        <div className="space-y-3">
          {predLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700">
              <Loader2 size={32} className="animate-spin mx-auto text-primary-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.analyzing')}</p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700">
              <TrendingDown size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('ai.noPredictions')}
              </p>
              <button
                onClick={fetchPredictions}
                className="mt-3 text-primary-600 dark:text-primary-400 text-sm font-medium"
              >
                {t('ai.analyzeNow')}
              </button>
            </div>
          ) : (
            predictions.map((pred, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mt-0.5">
                    <AlertTriangle size={16} className="text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {pred.productName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Current stock: {pred.currentStock} | Daily usage: ~{pred.dailyUsage}
                    </p>
                    <p className="text-xs text-red-500 font-medium mt-1">
                      Likely to finish in {pred.daysToFinish} days
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {pred.suggestion}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/inventory')}
                    className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                  >
                    {t('ai.restock')}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
