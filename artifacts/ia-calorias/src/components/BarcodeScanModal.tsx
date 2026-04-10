import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Barcode, Loader2, Search, ChevronRight, AlertCircle } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  token?: string;
  onResult: (result: AnalysisResult) => void;
  onUpgradeRequired?: () => void;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
  image_front_small_url?: string;
}

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { 'User-Agent': 'IACalorias/1.0' } }
    );
    const data = await res.json();
    if (data.status !== 1) return null;
    return data.product as OFFProduct;
  } catch {
    return null;
  }
}

export function BarcodeScanModal({ isOpen, onClose, sessionId, token, onResult, onUpgradeRequired }: Props) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [portionG, setPortionG] = useState('100');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanLoopRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      setMode('manual');
      return;
    }
    try {
      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });
    } catch {
      setMode('manual');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
    } catch {
      setMode('manual');
    }
  }, []);

  // Scan loop
  useEffect(() => {
    if (!scanning || !detectorRef.current || !videoRef.current) return;

    let cancelled = false;

    async function scan() {
      if (cancelled || !videoRef.current || !detectorRef.current) return;
      if (videoRef.current.readyState >= 2) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0 && !cancelled) {
            const code = barcodes[0].rawValue;
            stopCamera();
            await handleBarcode(code);
            return;
          }
        } catch {}
      }
      scanLoopRef.current = requestAnimationFrame(scan);
    }

    scanLoopRef.current = requestAnimationFrame(scan);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => {
    if (isOpen && mode === 'scan') startCamera();
    return () => stopCamera();
  }, [isOpen, mode, startCamera, stopCamera]);

  async function handleBarcode(code: string) {
    setLoading(true);
    setError('');
    const prod = await lookupBarcode(code);
    setLoading(false);
    if (!prod || !prod.nutriments) {
      setError(`Produto "${code}" não encontrado na base Open Food Facts. Digite o código manualmente ou tente outro produto.`);
      setMode('manual');
      setManualCode(code);
      return;
    }
    setProduct(prod);
  }

  async function handleManualSearch() {
    const code = manualCode.trim().replace(/\s/g, '');
    if (!code) return;
    setLoading(true);
    setError('');
    const prod = await lookupBarcode(code);
    setLoading(false);
    if (!prod || !prod.nutriments) {
      setError('Produto não encontrado. Verifique o código de barras.');
      return;
    }
    setProduct(prod);
  }

  async function handleSave() {
    if (!product?.nutriments) return;
    const grams = parseFloat(portionG);
    if (isNaN(grams) || grams <= 0) return;

    const ratio = grams / 100;
    const n = product.nutriments;
    const kcal = Math.round((n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) * ratio);
    const protein = Math.round((n.proteins_100g ?? 0) * ratio * 10) / 10;
    const carbs = Math.round((n.carbohydrates_100g ?? 0) * ratio * 10) / 10;
    const fat = Math.round((n.fat_100g ?? 0) * ratio * 10) / 10;
    const fiber = Math.round((n.fiber_100g ?? 0) * ratio * 10) / 10;

    const dishName = [product.product_name, product.brands].filter(Boolean).join(' — ') || 'Produto escaneado';
    const description = `${dishName} (${grams}g)`;

    setSaving(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${BASE}api/analysis/text`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          foodDescription: description,
          // Pass pre-computed values so GPT doesn't re-estimate
          _overrideNutrients: { calories: kcal, protein, carbs, fat, fiber, dishName },
        }),
      });

      if (res.status === 402) {
        onUpgradeRequired?.();
        handleClose();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        onResult(data as AnalysisResult);
        handleClose();
      } else {
        // Fallback: construct result locally without saving to DB
        const localResult: AnalysisResult = {
          id: `barcode-${Date.now()}`,
          sessionId,
          dishName,
          calories: kcal,
          macros: { protein, carbs, fat },
          fiber,
          healthScore: null,
          nutritionTip: null,
          servingSize: `${grams}g`,
          confidence: 'high',
          imageUrl: product.image_front_small_url ?? null,
          createdAt: new Date().toISOString(),
        };
        onResult(localResult);
        handleClose();
      }
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    stopCamera();
    setProduct(null);
    setManualCode('');
    setPortionG('100');
    setError('');
    setMode('scan');
    onClose();
  }

  function reset() {
    setProduct(null);
    setError('');
    setMode('scan');
    setManualCode('');
    setPortionG('100');
  }

  const n = product?.nutriments;
  const ratio = (parseFloat(portionG) || 100) / 100;
  const kcal = Math.round((n?.['energy-kcal_100g'] ?? n?.['energy-kcal'] ?? 0) * ratio);
  const protein = Math.round((n?.proteins_100g ?? 0) * ratio * 10) / 10;
  const carbs = Math.round((n?.carbohydrates_100g ?? 0) * ratio * 10) / 10;
  const fat = Math.round((n?.fat_100g ?? 0) * ratio * 10) / 10;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl pb-8 overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-violet-400" />
                <h2 className="text-white font-semibold text-lg">Escanear código de barras</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product found */}
            {product ? (
              <div className="px-5">
                <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {product.image_front_small_url && (
                      <img src={product.image_front_small_url} alt="" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#fff' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {product.product_name || 'Produto'}
                      </div>
                      {product.brands && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{product.brands}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portion */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                    Porção consumida (gramas)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={portionG}
                    onChange={e => setPortionG(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 12,
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      color: 'var(--text-1)', fontSize: 15, boxSizing: 'border-box',
                    }}
                  />
                  {product.serving_size && (
                    <button
                      onClick={() => {
                        const match = product.serving_size!.match(/[\d.,]+/);
                        if (match) setPortionG(match[0].replace(',', '.'));
                      }}
                      style={{ fontSize: 11, color: '#8B5CF6', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Usar porção sugerida: {product.serving_size}
                    </button>
                  )}
                </div>

                {/* Macro preview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Kcal', value: kcal, color: '#F59E0B' },
                    { label: 'Prot.', value: `${protein}g`, color: '#10B981' },
                    { label: 'Carbs', value: `${carbs}g`, color: '#3B82F6' },
                    { label: 'Gord.', value: `${fat}g`, color: '#EF4444' },
                  ].map(m => (
                    <div key={m.label} style={{ background: 'var(--bg-3)', border: `1px solid ${m.color}30`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#EF4444' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={reset} style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ← Voltar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || kcal === 0}
                    style={{ flex: 2, padding: '10px', borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving || kcal === 0 ? 0.6 : 1 }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Registrar refeição
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Camera view */}
                {mode === 'scan' && (
                  <div style={{ position: 'relative', width: '100%', height: 260, background: '#000', overflow: 'hidden' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Scan frame */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: 260, height: 100, border: '2px solid rgba(139,92,246,0.8)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}>
                        <motion.div
                          animate={{ y: [0, 76, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          style={{ width: '100%', height: 2, background: 'linear-gradient(90deg, transparent, #8B5CF6, transparent)' }}
                        />
                      </div>
                    </div>
                    {loading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                <div className="px-5 pt-4">
                  {mode === 'scan' ? (
                    <>
                      <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', marginBottom: 16 }}>
                        Aponte a câmera para o código de barras do produto
                      </p>
                      {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#EF4444', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {error}
                        </div>
                      )}
                      <button
                        onClick={() => { setMode('manual'); stopCamera(); }}
                        style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Digitar código manualmente
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
                        Digite o código de barras do produto (EAN-13, UPC):
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="tel"
                          value={manualCode}
                          onChange={e => { setManualCode(e.target.value); setError(''); }}
                          placeholder="Ex: 7891000315507"
                          maxLength={14}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 15 }}
                          onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                        />
                        <button
                          onClick={handleManualSearch}
                          disabled={loading || !manualCode.trim()}
                          style={{ padding: '10px 14px', borderRadius: 12, background: '#8B5CF6', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: loading || !manualCode.trim() ? 0.5 : 1 }}
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                      {error && (
                        <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{error}</p>
                      )}
                      {'BarcodeDetector' in window && (
                        <button
                          onClick={() => { setMode('scan'); setError(''); startCamera(); }}
                          style={{ marginTop: 10, fontSize: 12, color: '#8B5CF6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          ← Usar câmera
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
