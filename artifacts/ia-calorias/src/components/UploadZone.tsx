import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImageIcon, X } from 'lucide-react';

interface UploadZoneProps {
  onAnalyze: (file: File) => void;
  onFileSelected?: (file: File, previewUrl: string) => void;
  isAnalyzing: boolean;
  usageLabel?: string;
}

function ShimmerSkeleton() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div className="shimmer-bg" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }} />
        <div className="shimmer-bg" style={{ flex: 1, height: '20px', borderRadius: '8px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div className="shimmer-bg" style={{ width: '32px', height: '32px', borderRadius: '8px', marginBottom: '8px' }} />
            <div className="shimmer-bg" style={{ width: '60%', height: '14px', borderRadius: '6px', marginBottom: '6px' }} />
            <div className="shimmer-bg" style={{ width: '100%', height: '6px', borderRadius: '99px' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--text-2)', fontSize: '14px' }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          border: '2px solid var(--accent)', borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
        }} />
        Analisando com IA...
      </div>
    </div>
  );
}

export function UploadZone({ onAnalyze, onFileSelected, isAnalyzing, usageLabel }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreview(url);
    onFileSelected?.(file, url);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreview(null);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) processFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: isAnalyzing,
    noClick: true,
    noKeyboard: true,
  });

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAnalyzing]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  if (isAnalyzing) {
    return <ShimmerSkeleton />;
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Desktop drop zone */}
      <div className="hidden sm:block">
        <div
          {...getRootProps()}
          style={{
            width: '100%', borderRadius: '24px',
            border: `2px dashed ${isDragActive ? 'var(--accent)' : preview ? 'transparent' : 'var(--border-strong)'}`,
            background: isDragActive ? 'rgba(13,159,110,0.05)' : preview ? 'transparent' : 'var(--bg-2)',
            transition: 'all 0.25s',
            cursor: preview ? 'default' : 'pointer',
            ...(preview ? { padding: '4px' } : { padding: '36px 24px', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}
          onClick={!preview ? open : undefined}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'relative', width: '100%', height: '280px', borderRadius: '20px', overflow: 'hidden' }}
              >
                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                  display: 'flex', alignItems: 'flex-end', padding: '16px',
                }}>
                  <span style={{
                    color: '#fff', fontSize: '13px', fontWeight: 500,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                    padding: '5px 12px', borderRadius: '8px',
                    maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {selectedFile?.name}
                  </span>
                </div>
                <button
                  onClick={clearFile}
                  style={{
                    position: 'absolute', top: '12px', right: '12px',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '2px solid var(--border-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px', color: 'var(--text-3)',
                }}>
                  <ImageIcon size={28} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>
                  Clique ou arraste uma foto
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
                  JPG, PNG, WEBP · Máx. 10 MB · ou Cole (Ctrl+V)
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{
                    padding: '9px 18px', borderRadius: '12px',
                    border: '1.5px solid var(--accent)', color: 'var(--accent)',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={(e) => e.stopPropagation()}>
                    Escolher arquivo
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
                  </label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 18px', borderRadius: '12px',
                    border: '1.5px solid var(--border-strong)', color: 'var(--text-1)',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'var(--bg)',
                  }}
                  onClick={(e) => e.stopPropagation()}>
                    <Camera size={15} />
                    Tirar foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: camera card */}
      <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!preview ? (
          <div style={{
            padding: '24px', borderRadius: '20px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          }}>
            <div
              className="pulse-camera"
              style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Camera size={28} color="#fff" strokeWidth={1.8} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
                Analise sua refeição
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Tire uma foto ou escolha da galeria
              </div>
              {usageLabel && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                  {usageLabel}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={clearFile}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
            color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(13,159,110,0.3)',
          }}>
            <Camera size={18} />
            Tirar foto
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} disabled={isAnalyzing} />
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '16px 18px', borderRadius: '16px',
            background: 'var(--bg-2)', border: '1.5px solid var(--border-strong)',
            color: 'var(--text-1)', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer',
          }}>
            <ImageIcon size={18} />
            Galeria
            <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} disabled={isAnalyzing} />
          </label>
        </div>
      </div>

      {/* Analyze button */}
      <button
        onClick={() => { if (selectedFile && !isAnalyzing) onAnalyze(selectedFile); }}
        disabled={!selectedFile || isAnalyzing}
        style={{
          width: '100%', padding: '16px', borderRadius: '16px',
          fontSize: '16px', fontWeight: 700,
          cursor: selectedFile && !isAnalyzing ? 'pointer' : 'not-allowed',
          border: 'none', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          ...(selectedFile && !isAnalyzing ? {
            background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(13,159,110,0.35)',
          } : {
            background: 'var(--bg-3)',
            color: 'var(--text-3)',
          }),
        }}
      >
        {selectedFile ? 'Analisar foto →' : 'Analisar foto'}
      </button>

    </div>
  );
}
