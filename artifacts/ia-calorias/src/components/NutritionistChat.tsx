import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface NutritionistChatProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isPremium: boolean;
  onUpgrade: () => void;
}

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

const WELCOME: Message = {
  role: 'assistant',
  content: 'Olá! Sou a Sofia, sua nutricionista IA. 🌿\n\nPosso ajudar com dúvidas sobre sua alimentação de hoje, sugestões de refeições, substituições saudáveis ou qualquer outra questão nutricional. Como posso te ajudar?',
  ts: Date.now(),
};

const SUGGESTIONS = [
  'O que eu deveria comer no pré-treino?',
  'Como atingir minha meta de proteína?',
  'Qual o melhor horário para comer carboidratos?',
  'Tenho fome à noite, o que fazer?',
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9F6E' }}
        />
      ))}
    </div>
  );
}

export function NutritionistChat({ isOpen, onClose, sessionId, isPremium, onUpgrade }: NutritionistChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const canSend = true;

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!canSend) return;

    const userMsg: Message = { role: 'user', content: trimmed, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const r = await fetch(`${BASE}api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          sessionId,
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json();
      const reply = data.reply ?? 'Desculpe, não consegui responder. Tente novamente.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Verifique sua internet e tente novamente.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, canSend, isPremium, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '720px',
              height: '90dvh',
              background: 'var(--bg)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 2px 12px rgba(13,159,110,0.3)',
              }}>
                🩺
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.2px' }}>
                  Sofia — Nutricionista IA
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0D9F6E', display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Online · responde em segundos</span>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', marginRight: '8px', alignSelf: 'flex-end',
                    }}>🩺</div>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #0D9F6E, #057A55)'
                      : 'var(--bg-2)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                    fontSize: '14px', lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>🩺</div>
                  <div style={{
                    padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggestions (show only at start) */}
            {messages.length === 1 && !loading && (
              <div style={{ padding: '0 16px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      padding: '6px 12px', borderRadius: '99px',
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}


            {/* Input */}
            <div style={{
              padding: '8px 16px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: '10px', alignItems: 'flex-end',
              flexShrink: 0,
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || !canSend}
                placeholder={canSend ? 'Pergunte algo sobre sua alimentação…' : 'Limite diário atingido'}
                rows={1}
                style={{
                  flex: 1, resize: 'none', overflow: 'hidden',
                  padding: '11px 14px', borderRadius: '14px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', fontSize: '14px', lineHeight: 1.5,
                  outline: 'none', fontFamily: 'inherit',
                  opacity: canSend ? 1 : 0.5,
                }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading || !canSend}
                style={{
                  width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                  background: input.trim() && canSend
                    ? 'linear-gradient(135deg, #0D9F6E, #057A55)'
                    : 'var(--bg-3)',
                  border: 'none',
                  color: input.trim() && canSend ? '#fff' : 'var(--text-3)',
                  cursor: input.trim() && canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                  boxShadow: input.trim() && canSend ? '0 2px 10px rgba(13,159,110,0.35)' : 'none',
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
