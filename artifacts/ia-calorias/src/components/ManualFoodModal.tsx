import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PenLine, Loader2 } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  token?: string;
  onResult: (result: AnalysisResult) => void;
  onUpgradeRequired?: () => void;
}

export function ManualFoodModal({ isOpen, onClose, sessionId, token, onResult, onUpgradeRequired }: Props) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = description.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/analysis/text', {
        method: 'POST',
        headers,
        body: JSON.stringify({ foodDescription: trimmed, sessionId }),
      });

      if (res.status === 402) {
        onUpgradeRequired?.();
        onClose();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Não foi possível estimar os nutrientes.');
        return;
      }

      setDescription('');
      onResult(data as AnalysisResult);
      onClose();
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setDescription('');
    setError('');
    onClose();
  }

  const examples = [
    '2 ovos mexidos com queijo + 1 fatia de pão integral',
    '1 prato de arroz com feijão e frango grelhado',
    '1 banana média',
    'Whey protein com leite desnatado 300ml',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative w-full max-w-lg bg-gray-900 rounded-t-2xl p-5 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-emerald-400" />
                <h2 className="text-white font-semibold text-lg">Registrar manualmente</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Descreva o alimento ou refeição e a IA vai estimar os nutrientes automaticamente.
            </p>

            {/* Text area */}
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setError(''); }}
              placeholder="Ex: 1 prato de arroz com feijão, frango grelhado 150g e salada"
              rows={3}
              maxLength={300}
              disabled={loading}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-1"
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
            />
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 text-xs">{description.length}/300</span>
              <span className="text-gray-600 text-xs">Ctrl+Enter para enviar</span>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm mb-3 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Quick examples */}
            <div className="mb-4">
              <p className="text-gray-500 text-xs mb-2">Exemplos rápidos:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setDescription(ex); setError(''); }}
                    disabled={loading}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full px-3 py-1 transition-colors"
                  >
                    {ex.length > 30 ? ex.slice(0, 30) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Estimando nutrientes…
                </>
              ) : (
                'Estimar nutrientes'
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
