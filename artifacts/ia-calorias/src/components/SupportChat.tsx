import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Mail } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  showEscalation?: boolean;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const WHATSAPP_NUMBER = '5511956538845';
const SUPPORT_EMAIL = 'atendimento.iacalorias@hotmail.com';

const ESCALATION_KEYWORDS = [
  'não funciona', 'nao funciona', 'bug', 'erro', 'cancelar', 'cancelamento',
  'reembolso', 'cobrado', 'cobrança', 'pagamento', 'problema', 'falha',
  'falar com', 'atendente', 'humano', 'pessoa', 'suporte humano',
];

const WELCOME: Message = {
  role: 'assistant',
  content: 'Olá! Sou a Sofia, assistente de suporte do IA Calorias. 🛟\n\nPosso ajudar com dúvidas sobre como usar o app, sua assinatura, funcionalidades e muito mais. Como posso te ajudar?',
  ts: Date.now(),
};

const SUGGESTIONS = [
  'Como funciona o plano grátis?',
  'Como cancelar minha assinatura?',
  'Não consigo fazer login',
  'Como alterar minhas metas?',
];

const SYSTEM_PROMPT = `Você é Sofia, assistente de suporte do app IA Calorias. Responda em português brasileiro.

Sobre o IA Calorias:
- App de nutrição com IA que analisa refeições por foto
- Plano Grátis: 7 dias de teste ilimitado
- Plano Limitado: R$19,90/mês — 20 análises/mês
- Plano Ilimitado: R$29,90/mês — análises ilimitadas, cardápio semanal, treinos IA, Sofia ilimitada
- Pagamento via Stripe (cartão de crédito), PIX em breve
- Para cancelar: o usuário deve acessar Perfil → Assinatura ou contatar o suporte

Funcionalidades principais:
- Análise de refeição por foto (IA identifica macros e calorias)
- Chat com nutricionista Sofia (plano pago)
- Cardápio semanal gerado por IA (plano Ilimitado)
- Tracker de água, peso, streak de dias
- Treino do Dia personalizado por IA
- Relatório semanal por email (plano Ilimitado)

Regras:
- Seja empática e direta, respostas de 2-4 frases
- Se não souber resolver, oriente o usuário a contatar o suporte humano
- Para cancelamento, reembolso ou problemas de cobrança: SEMPRE encaminhe para o suporte humano
- Não invente funcionalidades que não existem`;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function detectsEscalation(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some(kw => lower.includes(kw));
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }}
        />
      ))}
    </div>
  );
}

function EscalationCard() {
  return (
    <div style={{
      marginTop: 8, padding: '12px 14px', borderRadius: 14,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
        Falar com atendimento humano:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C+preciso+de+ajuda+com+o+IA+Calorias`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)',
            color: '#25D366', fontWeight: 700, fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <MessageCircle size={16} />
          WhatsApp — resposta rápida
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Suporte%20IA%20Calorias`}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            color: '#3B82F6', fontWeight: 700, fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <Mail size={16} />
          Email — {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}

export function SupportChat({ isOpen, onClose, sessionId }: SupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const userMessageCount = messages.filter(m => m.role === 'user').length;

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const needsEscalation = detectsEscalation(trimmed);
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
          messages: [{ role: 'user', content: trimmed }],
          tzOffset: new Date().getTimezoneOffset(),
          supportMode: true,
        }),
      });
      const data = await r.json();
      const reply = data.reply ?? 'Desculpe, não consegui responder. Tente novamente.';

      // Mostrar escalation se: keywords detectadas, ou após 3+ mensagens, ou resposta da IA menciona "suporte"
      const showEscalation = needsEscalation
        || userMessageCount >= 3
        || reply.toLowerCase().includes('suporte')
        || reply.toLowerCase().includes('contate')
        || reply.toLowerCase().includes('entrar em contato');

      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now(), showEscalation }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro de conexão. Enquanto isso, entre em contato diretamente:',
        ts: Date.now(),
        showEscalation: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, sessionId, userMessageCount]);

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
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
                boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
              }}>
                🛟
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.2px' }}>
                  Suporte IA Calorias
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sofia · assistente de suporte</span>
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
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', marginRight: '8px', alignSelf: 'flex-end',
                      }}>🛟</div>
                    )}
                    <div style={{
                      maxWidth: '78%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                        : 'var(--bg-2)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                      fontSize: '14px', lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'assistant' && msg.showEscalation && (
                    <div style={{ paddingLeft: 38 }}>
                      <EscalationCard />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                  }}>🛟</div>
                  <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
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
                    }}
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
              flexShrink: 0,
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder="Descreva sua dúvida ou problema…"
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', overflow: 'hidden',
                    padding: '11px 14px', borderRadius: '14px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    color: 'var(--text-1)', fontSize: '14px', lineHeight: 1.5,
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                    background: input.trim() ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)' : 'var(--bg-3)',
                    border: 'none',
                    color: input.trim() ? '#fff' : 'var(--text-3)',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Contato direto sempre visível no footer */}
              <div style={{
                display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center',
              }}>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C+preciso+de+ajuda+com+o+IA+Calorias`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 99,
                    background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                    color: '#25D366', fontSize: 11, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Suporte%20IA%20Calorias`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 99,
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)',
                    color: '#3B82F6', fontSize: 11, fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  <Mail size={12} /> Email
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
