import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImageIcon, Loader2, X } from 'lucide-react';

interface UploadZoneProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

export function UploadZone({ onAnalyze, isAnalyzing }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
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

  // Ctrl+V paste
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

  const handleAnalyzeClick = () => {
    if (selectedFile && !isAnalyzing) onAnalyze(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileInput}
        disabled={isAnalyzing}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileInput}
        disabled={isAnalyzing}
      />

      {/* ── Desktop Drop Zone (hidden on mobile) ─────────────────── */}
      <div className="hidden sm:block">
        <div
          {...getRootProps()}
          className={`
            relative w-full rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
            ${isDragActive
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border bg-background-2 hover:border-primary/40 hover:bg-primary/5'
            }
            ${preview ? 'p-1 border-solid' : 'p-8 min-h-[260px] flex flex-col items-center justify-center'}
          `}
          onClick={!preview ? open : undefined}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-[300px] rounded-[22px] overflow-hidden"
              >
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                  <span className="text-white text-sm font-medium bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg truncate max-w-[80%]">
                    {selectedFile?.name}
                  </span>
                </div>
                {!isAnalyzing && (
                  <button
                    onClick={clearFile}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <span className="font-semibold text-foreground">Analisando com IA...</span>
                    <span className="text-sm text-muted-foreground mt-1">Isso leva alguns segundos</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center w-full"
              >
                <div className="w-16 h-16 rounded-full border-2 border-border-strong flex items-center justify-center mb-4 text-muted-foreground">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Clique aqui ou arraste uma foto</h3>
                <p className="text-sm text-muted-foreground mb-6">JPG, PNG, WEBP · Máx. 4 MB · ou Cole (Ctrl+V)</p>

                {/* Desktop action row */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); open(); }}
                    className="px-5 py-2 rounded-xl bg-transparent border border-primary text-primary font-semibold text-sm hover:bg-primary/10 transition-colors"
                  >
                    Escolher arquivo
                  </button>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-background border border-border text-foreground font-semibold text-sm hover:bg-background-3 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar foto
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile Actions (hidden on desktop) ───────────────────── */}
      <div className="sm:hidden flex gap-3 w-full">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex-1 flex items-center justify-center gap-2 py-5 rounded-2xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent), #059669)' }}
        >
          <Camera className="w-5 h-5" />
          Tirar foto
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-5 py-5 rounded-2xl bg-background-2 border border-border-strong text-foreground font-semibold text-sm hover:bg-background-3 transition-all active:scale-95 disabled:opacity-50"
        >
          <ImageIcon className="w-5 h-5" />
          Galeria
        </button>
      </div>

      {/* ── Mobile Preview ────────────────────────────────────────── */}
      {preview && (
        <div className="sm:hidden relative w-full aspect-square rounded-3xl overflow-hidden border border-border-strong">
          <img src={preview} alt="Preview mobile" className="w-full h-full object-cover" />
          {!isAnalyzing && (
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="font-semibold text-sm">Analisando com IA...</span>
            </div>
          )}
        </div>
      )}

      {/* ── Analyze Button ────────────────────────────────────────── */}
      <button
        onClick={handleAnalyzeClick}
        disabled={!selectedFile || isAnalyzing}
        className={`
          w-full py-4 rounded-2xl font-semibold text-[17px] transition-all flex justify-center items-center gap-2
          ${selectedFile && !isAnalyzing
            ? 'text-white shadow-lg hover:opacity-90 active:scale-[0.98]'
            : 'bg-background-3 text-muted-foreground cursor-not-allowed'}
        `}
        style={selectedFile && !isAnalyzing ? {
          background: 'linear-gradient(135deg, var(--accent), #059669 50%, #0284c7)',
          boxShadow: '0 4px 24px var(--accent-glow)',
        } : {}}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analisando...
          </>
        ) : selectedFile ? (
          'Analisar foto →'
        ) : (
          'Analisar foto'
        )}
      </button>

    </div>
  );
}
