import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Camera, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

export function UploadZone({ onAnalyze, isAnalyzing }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isAnalyzing
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
  };

  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-500
          ${isDragActive ? 'border-primary scale-[1.02] shadow-2xl shadow-primary/10' : 'border-border hover:border-primary/50'}
          ${preview ? 'p-2 border border-transparent' : 'p-12 border-2 border-dashed glass-card'}
        `}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full aspect-square md:aspect-video rounded-2xl overflow-hidden bg-muted"
            >
              <img
                src={preview}
                alt="Food preview"
                className="w-full h-full object-cover"
              />
              
              {!isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleClear}
                    className="rounded-full w-12 h-12 shadow-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="font-medium text-lg">Analisando nutrientes...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <UploadCloud className="w-10 h-10 text-primary/60" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Arraste sua foto aqui
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Tire uma foto do seu prato ou faça upload da galeria para receber a análise nutricional completa.
                </p>
              </div>

              <div className="flex gap-4 mt-4">
                <Button type="button" variant="outline" className="rounded-full px-6">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Galeria
                </Button>
                <Button type="button" className="rounded-full px-6 md:hidden">
                  <Camera className="w-4 h-4 mr-2" />
                  Câmera
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {preview && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 flex justify-center"
          >
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-base shadow-xl hover:-translate-y-0.5 transition-transform"
              onClick={handleAnalyzeClick}
            >
              Analisar Prato
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
