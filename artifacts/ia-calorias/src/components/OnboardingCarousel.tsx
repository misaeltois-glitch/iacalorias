import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingCarouselProps {
  onDone: () => void;
}

const slides = [
  {
    emoji: '📸',
    title: 'Fotografe seu prato',
    desc: 'Tire uma foto da sua refeição e descubra os nutrientes em segundos com o poder da IA.',
  },
  {
    emoji: '📊',
    title: 'Veja o que tem no seu prato',
    desc: 'Veja proteína, carboidrato, fibra e gordura de cada refeição de forma clara e visual.',
  },
  {
    emoji: '🎯',
    title: 'Atinja suas metas',
    desc: 'Defina metas diárias e receba alertas como um nutricionista pessoal no seu bolso.',
    badge: '⭐ Disponível no plano Premium',
  },
];

export function OnboardingCarousel({ onDone }: OnboardingCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (next: number) => {
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
  };

  const next = () => {
    if (current < slides.length - 1) go(current + 1);
    else onDone();
  };

  const slide = slides[current];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 40px',
      }}
    >
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onDone}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-2)', fontSize: '14px',
            cursor: 'pointer', padding: '8px',
          }}
        >
          Pular
        </button>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d * 60, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d * -60, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '360px', textAlign: 'center' }}
        >
          <div style={{
            width: '120px', height: '120px', borderRadius: '32px',
            background: 'linear-gradient(135deg, #0D9F6E 0%, #065F46 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '56px',
            boxShadow: '0 12px 40px rgba(13,159,110,0.3)',
          }}>
            {slide.emoji}
          </div>

          <div>
            <h2 style={{
              fontSize: '26px', fontWeight: 800, color: 'var(--text-1)',
              letterSpacing: '-0.5px', marginBottom: '12px',
            }}>
              {slide.title}
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6 }}>
              {slide.desc}
            </p>
            {slide.badge && (
              <div style={{
                marginTop: '16px',
                display: 'inline-block',
                padding: '5px 14px',
                borderRadius: '99px',
                background: 'rgba(245,158,11,0.12)',
                color: '#F59E0B',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid rgba(245,158,11,0.25)',
              }}>
                {slide.badge}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              style={{
                width: i === current ? '24px' : '8px',
                height: '8px', borderRadius: '99px',
                background: i === current ? '#0D9F6E' : 'var(--border-strong)',
                border: 'none', cursor: 'pointer',
                transition: 'width 0.3s ease, background 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
            color: '#fff', border: 'none',
            fontSize: '16px', fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(13,159,110,0.35)',
          }}
        >
          {current < slides.length - 1 ? 'Próximo →' : 'Começar'}
        </button>
      </div>
    </motion.div>
  );
}
