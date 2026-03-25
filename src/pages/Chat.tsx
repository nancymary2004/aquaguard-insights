import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Bot, User, Droplets, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { simulateWaterParameters, predictDisease } from '@/lib/predictionEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  city_context?: string;
}

const QUICK_PROMPTS = [
  "Is water safe in Mumbai?",
  "What precautions for cholera?",
  "Explain pH in water quality",
  "High turbidity effects?",
  "What is WQI?",
];

function generateResponse(question: string): string {
  const q = question.toLowerCase();

  // City-specific
  const cityMatch = question.match(/in ([A-Z][a-z]+)/);
  if (cityMatch || q.includes('safe') || q.includes('water quality')) {
    const city = cityMatch?.[1] ?? 'your city';
    if (city !== 'your city') {
      const params = simulateWaterParameters(city);
      const pred = predictDisease(params);
      return `**Water Safety Analysis for ${city}**\n\n` +
        `📊 **Current Status:** ${pred.riskLevel} Risk\n` +
        `🦠 **Primary Concern:** ${pred.disease}\n` +
        `💧 **Water Quality Index:** ${pred.waterQualityIndex}/100\n` +
        `🔬 **Key Parameters:**\n` +
        `• pH: ${params.ph} (safe: 6.5-8.5)\n` +
        `• Dissolved Oxygen: ${params.dissolvedOxygen} mg/L\n` +
        `• Turbidity: ${params.turbidity} NTU\n` +
        `• Coliform: ${params.coliform} CFU/100mL\n\n` +
        `⚠️ **Risk Factors:** ${pred.keyFactors.slice(0, 2).join(', ')}\n\n` +
        `✅ **Recommendations:**\n${pred.recommendations.slice(0, 3).map(r => `• ${r}`).join('\n')}`;
    }
  }

  if (q.includes('cholera')) {
    return `**Cholera Prevention Guide**\n\n` +
      `Cholera is caused by the Vibrio cholerae bacterium and spreads through contaminated water.\n\n` +
      `🚨 **Signs to watch:** High coliform (>200 CFU/100mL), turbidity >10 NTU\n\n` +
      `🛡️ **Precautions:**\n• Boil all drinking water\n• Use ORS immediately if symptoms appear\n• Avoid raw vegetables washed in tap water\n• Get cholera vaccination\n• Seek immediate medical attention for severe diarrhea\n\n` +
      `💊 **Treatment:** Oral Rehydration Therapy (ORT) is the primary treatment. Antibiotics may be prescribed.`;
  }

  if (q.includes('ph')) {
    return `**Understanding pH in Water Quality**\n\n` +
      `pH measures the acidity or alkalinity of water on a 0-14 scale.\n\n` +
      `✅ **Safe range:** 6.5 – 8.5\n` +
      `🔴 **Below 6.5:** Acidic — can leach metals, irritate skin, cause gastrointestinal issues\n` +
      `🔴 **Above 8.5:** Alkaline — bitter taste, scaling, reduced effectiveness of chlorine\n\n` +
      `**Impact on disease risk:**\n• Low pH increases heavy metal contamination\n• Promotes growth of certain pathogens\n• Affects disinfection efficiency\n\n` +
      `**What to do:** If pH is outside range, use water purifiers with pH adjustment or boil and filter water.`;
  }

  if (q.includes('turbidity')) {
    return `**High Turbidity in Water**\n\n` +
      `Turbidity measures water cloudiness caused by suspended particles.\n\n` +
      `📏 **Safe level:** < 4 NTU (WHO standard)\n` +
      `⚠️ **High turbidity (>10 NTU) risks:**\n• Shields pathogens from disinfection\n• Indicates potential contamination\n• Reduces UV disinfection effectiveness\n• Can cause gastrointestinal illness\n\n` +
      `🏥 **Associated diseases:** Giardiasis, Cryptosporidiosis, Cholera\n\n` +
      `✅ **Solutions:**\n• Sedimentation + filtration\n• Flocculation treatment\n• Avoid swimming in turbid water`;
  }

  if (q.includes('wqi') || q.includes('water quality index')) {
    return `**Water Quality Index (WQI)**\n\n` +
      `WQI is a composite score (0-100) summarizing overall water safety.\n\n` +
      `📊 **Score ranges:**\n• 85-100: Excellent — Safe for all uses\n• 70-84: Good — Safe with normal precautions\n• 50-69: Medium — Requires treatment\n• 30-49: Poor — High contamination risk\n• 0-29: Very Poor — Unsafe, immediate action needed\n\n` +
      `**WBDPS calculates WQI from:** pH, Dissolved Oxygen, Turbidity, and Coliform levels\n\n` +
      `Each parameter is weighted equally (25%) in our model.`;
  }

  if (q.includes('dissolved oxygen') || q.includes(' do ')) {
    return `**Dissolved Oxygen (DO) in Water**\n\n` +
      `DO is the amount of oxygen dissolved in water, essential for aquatic life.\n\n` +
      `✅ **Safe level:** > 6 mg/L\n` +
      `⚠️ **Low DO (<4 mg/L):** Indicates organic pollution, promotes anaerobic bacteria\n\n` +
      `**Disease implications:**\n• Low DO creates conditions for harmful bacteria growth\n• Indicates organic waste contamination\n• Associated with Giardiasis and intestinal infections\n\n` +
      `**Causes of low DO:** Sewage discharge, algal blooms, high temperature, organic matter decomposition`;
  }

  if (q.includes('precaution') || q.includes('safe') || q.includes('drink')) {
    return `**General Water Safety Precautions**\n\n` +
      `🔵 **Daily Habits:**\n• Boil water before drinking if quality is uncertain\n• Use certified water filters (RO/UV)\n• Store water in clean, covered containers\n• Never drink from unknown sources\n\n` +
      `🔵 **During High Risk Periods (monsoon/flood):**\n• Avoid floodwater contact\n• Use bottled water\n• Chlorine tablets for emergency treatment\n• Monitor for disease symptoms\n\n` +
      `🔵 **Regular Testing:**\n• Test water source quarterly\n• Check municipal water quality reports\n• Use WBDPS for real-time monitoring\n\n` +
      `🏥 **Seek medical help if:** Diarrhea, vomiting, jaundice, or fever after water consumption`;
  }

  return `I'm your **Water Quality AI Assistant** 🌊\n\nI can help you with:\n• **City water safety analysis** — "Is water safe in Chennai?"\n• **Disease information** — "What is cholera?", "Typhoid prevention"\n• **Parameter explanations** — "What is pH?", "High turbidity effects"\n• **Safety precautions** — "Water safety tips", "What precautions to take?"\n• **WQI explanation** — "What is Water Quality Index?"\n\nTry asking me about a specific city or water quality parameter!`;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hello! 👋 I'm your **Water Quality AI Assistant**.\n\nI can analyze water safety for any city, explain water parameters, and provide disease prevention advice.\n\nTry asking: *"Is water safe in Mumbai?"* or *"What precautions should I take?"*`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = text ?? input.trim();
    if (!msgText || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Simulate AI response
    await new Promise(r => setTimeout(r, 800));
    const response = generateResponse(msgText);
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);

    // Persist to DB
    if (user) {
      await supabase.from('chat_messages').insert([
        { user_id: user.id, role: 'user', content: msgText },
        { user_id: user.id, role: 'assistant', content: response },
      ]);
    }
  };

  const clearChat = () => setMessages([messages[0]]);

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-foreground mb-1">{line.slice(2, -2)}</div>;
      }
      return line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') === line
        ? <div key={i} className={line.startsWith('•') || line.startsWith('🔵') || line.startsWith('🚨') ? 'pl-2' : ''}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') || '&nbsp;' }} />
        : <div key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '&nbsp;' }} />;
    });
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">AI Water Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by WBDPS Intelligence</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-card border border-border rounded-tl-sm text-foreground'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="space-y-0.5">{renderContent(msg.content)}</div>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all bg-card"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about water quality, diseases, or city safety..."
            className="flex-1 px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-foreground"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
