import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ImageIcon } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistorySidebarProps {
  history: AnalysisResult[];
}

export function HistorySidebar({ history }: HistorySidebarProps) {
  if (!history || history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center glass-card rounded-3xl border-dashed">
        <Activity className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-lg mb-1">Nenhum histórico</h3>
        <p className="text-sm text-muted-foreground">Suas análises recentes aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col glass-card rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-border/50 bg-card/50">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Histórico de Análises
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {history.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={item.id}
              className="p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors flex items-center gap-4 cursor-pointer border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-background flex-shrink-0 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.dishName} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.dishName}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.calories} kcal</span>
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
