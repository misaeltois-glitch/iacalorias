import React from 'react';
import { motion } from 'framer-motion';
import { Info, CheckCircle2, RotateCcw } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

interface ResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function ResultCard({ result, onReset }: ResultCardProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const healthScore = result.healthScore || 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (healthScore / 10) * circumference;

  const maxMacro = Math.max(result.macros.protein, result.macros.carbs, result.macros.fat, result.fiber || 0, 100);
  const getProgress = (val: number) => Math.min(100, (val / maxMacro) * 100);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full space-y-4"
    >
      {/* Hero Result Card */}
      <motion.div variants={item} className="p-6 md:p-8 rounded-3xl bg-background-2 border border-border flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="space-y-3 w-full text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-xs font-medium text-muted-foreground mx-auto md:mx-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            Prato identificado
          </div>
          
          <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
            {result.dishName}
          </h2>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            {result.servingSize && (
              <span className="px-3 py-1 rounded-full bg-background border border-border text-sm text-muted-foreground">
                {result.servingSize}
              </span>
            )}
            {result.confidence && (
              <span className="px-3 py-1 rounded-full bg-background border border-border text-sm text-muted-foreground">
                Confiança: {result.confidence}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-green-500/10 border-4 border-green-500/20 text-center flex-col">
          <span className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            {result.calories}
          </span>
          <span className="text-sm font-semibold text-primary/70 uppercase">
            kcal
          </span>
        </div>
      </motion.div>

      {/* Macros Grid */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        {/* Protein */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              🥩 Proteínas
            </span>
            <span className="font-bold text-foreground">{result.macros.protein}g</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${getProgress(result.macros.protein)}%` }} />
          </div>
        </div>

        {/* Carbs */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              🌾 Carboidratos
            </span>
            <span className="font-bold text-foreground">{result.macros.carbs}g</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${getProgress(result.macros.carbs)}%` }} />
          </div>
        </div>

        {/* Fat */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              🫒 Gorduras
            </span>
            <span className="font-bold text-foreground">{result.macros.fat}g</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${getProgress(result.macros.fat)}%` }} />
          </div>
        </div>

        {/* Fiber */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              🥦 Fibras
            </span>
            <span className="font-bold text-foreground">{result.fiber || 0}g</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${getProgress(result.fiber || 0)}%` }} />
          </div>
        </div>
      </motion.div>

      {/* Health & Tip Row */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
        {/* Health Score */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border flex flex-col items-center justify-center min-w-[160px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Score de Saúde</span>
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-border" strokeWidth="8" fill="none" />
              <circle 
                cx="50" cy="50" r="40" 
                className="stroke-primary" 
                strokeWidth="8" fill="none" 
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-foreground">{healthScore}</span>
              <span className="text-xs text-muted-foreground font-medium">/10</span>
            </div>
          </div>
        </div>

        {/* Nutrition Tip */}
        <div className="p-5 rounded-2xl bg-background-2 border border-border flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Dica Nutricional</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.nutritionTip || "Não há dicas adicionais para esta refeição."}
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="pt-4">
        <button 
          onClick={onReset}
          className="w-full py-4 rounded-2xl font-semibold text-[15px] bg-background-2 border border-border text-foreground hover:bg-background-3 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Analisar outra foto
        </button>
      </motion.div>

    </motion.div>
  );
}
