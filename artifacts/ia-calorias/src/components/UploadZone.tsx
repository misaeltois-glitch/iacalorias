import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImageIcon, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

export function UploadZone({ onAnalyze, isAnalyzing }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = (file: File) => {
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isAnalyzing,
    noClick: true,
    noKeyboard: true
  });

  // Handle Ctrl+V paste
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
    if (selectedFile && !isAnalyzing) {
      onAnalyze(selectedFile);
    }
  };

  const handleCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleGalleryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Desktop Drag & Drop Zone */}
      <div className="hidden sm:block">
        <div
          {...getRootProps()}
          className={`
            relative w-full rounded-3xl border-2 border-dashed transition-all duration-300
            ${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border bg-background-2 hover:border-muted-foreground/30'}
            ${preview ? 'p-1' : 'p-8 min-h-[260px] flex flex-col items-center justify-center'}
          `}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-[320px] rounded-[22px] overflow-hidden"
              >
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <span className="text-white text-sm font-medium bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg truncate max-w-[80%]">
                    {selectedFile?.name}
                  </span>
                </div>
                
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <span className="font-medium text-foreground">Analisando imagem...</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Clique aqui ou arraste uma foto</h3>
                <p className="text-sm text-muted-foreground mb-6">JPG, PNG, WEBP · Máx. 4 MB · ou Cole (Ctrl+V)</p>
                <button
                  type="button"
                  onClick={open}
                  className="px-6 py-2.5 rounded-xl bg-background border border-border font-medium text-sm hover:bg-background-3 transition-colors shadow-sm"
                >
                  Escolher arquivo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Actions (Hidden on Desktop) */}
      <div className="sm:hidden flex gap-3 w-full">
        <label className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-background-2 border border-border text-foreground font-medium text-sm active:bg-background-3 transition-colors cursor-pointer">
          <Camera className="w-5 h-5" />
          Usar câmera
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraInput} disabled={isAnalyzing} />
        </label>
        
        <label className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-background-2 border border-border text-foreground font-medium text-sm active:bg-background-3 transition-colors cursor-pointer">
          <ImageIcon className="w-5 h-5" />
          Galeria
          <input type="file" accept="image/*" className="hidden" onChange={handleGalleryInput} disabled={isAnalyzing} />
        </label>
      </div>

      {/* Mobile Preview */}
      {preview && (
        <div className="sm:hidden relative w-full aspect-square rounded-3xl overflow-hidden border border-border">
          <img src={preview} alt="Preview mobile" className="w-full h-full object-cover" />
          {isAnalyzing && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <span className="font-medium text-sm">Analisando...</span>
            </div>
          )}
        </div>
      )}

      {/* Global Analyze Button */}
      <button
        onClick={handleAnalyzeClick}
        disabled={!selectedFile || isAnalyzing}
        className={`
          w-full py-4 rounded-2xl font-semibold text-[17px] transition-all flex justify-center items-center gap-2
          ${selectedFile && !isAnalyzing 
            ? 'bg-gradient-to-r from-[#16a34a] to-[#0ea5e9] text-white shadow-lg shadow-green-500/20 hover:opacity-90' 
            : 'bg-background-3 text-muted-foreground cursor-not-allowed'}
        `}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processando...
          </>
        ) : (
          <>Analisar prato →</>
        )}
      </button>

    </div>
  );
}
