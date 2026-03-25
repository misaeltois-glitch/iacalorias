import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

interface ResultCardProps {
  result: AnalysisResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Main Calories Header */}
      <motion.div variants={item} className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-primary opacity-50" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left flex-1">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              {result.dishName}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Análise concluída com sucesso
            </p>
          </div>
          
          <div className="flex-shrink-0 w-40 h-40 rounded-full border-8 border-background shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br from-card to-muted">
            <span className="text-4xl font-display font-bold tracking-tighter">
              {result.calories}
            </span>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Kcal
            </span>
          </div>
        </div>
      </motion.div>

      {/* Macros Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Protein */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/20 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
              <Beef className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Proteínas</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-bold">{result.macros.protein}</span>
            <span className="text-muted-foreground font-medium">g</span>
          </div>
        </div>

        {/* Carbs */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-yellow-500/20 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-500">
              <Wheat className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Carboidratos</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-bold">{result.macros.carbs}</span>
            <span className="text-muted-foreground font-medium">g</span>
          </div>
        </div>

        {/* Fat */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/20 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500">
              <Droplet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Gorduras</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-bold">{result.macros.fat}</span>
            <span className="text-muted-foreground font-medium">g</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
