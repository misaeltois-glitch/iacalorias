import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 2000;
    const raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 100);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0D9F6E 0%, #065F46 100%)',
        padding: '32px',
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '32px', fontWeight: 800, color: '#fff',
            letterSpacing: '-1px', marginBottom: '6px',
          }}>
            IA Calorias
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>
            Sua nutrição na palma da mão
          </p>
        </div>
      </motion.div>

      <div style={{
        position: 'absolute', bottom: '48px', left: '50%', transform: 'translateX(-50%)',
        width: '120px',
      }}>
        <div style={{
          width: '100%', height: '3px', borderRadius: '99px',
          background: 'rgba(255,255,255,0.2)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            background: '#fff',
            width: `${progress}%`,
            transition: 'width 0.05s linear',
          }} />
        </div>
      </div>
    </motion.div>
  );
}
