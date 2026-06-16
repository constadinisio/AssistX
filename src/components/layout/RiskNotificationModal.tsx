import React from 'react';
import { motion } from 'motion/react';
import { X, History, Send, AlertTriangle } from 'lucide-react';

interface RiskNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  absencesCount: number;
  onViewDetails: () => void;
  onSendAviso?: () => void;
  tipo?: 'Riesgo' | 'Critico' | 'RegularidadAnual';
}

export const RiskNotificationModal: React.FC<RiskNotificationModalProps> = ({
  isOpen,
  onClose,
  studentName,
  absencesCount,
  onViewDetails,
  onSendAviso,
  tipo: _tipo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-navy/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={20} />
            <h3 className="font-black uppercase tracking-tight text-sm">Alerta de Riesgo</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 text-center">
          <h2 className="text-4xl font-black text-brand-navy mb-2 uppercase tracking-tight">
            {studentName}
          </h2>
          <p className="text-5xl font-black text-rose-600 animate-pulse mt-4 mb-10">
            {absencesCount} INASISTENCIAS
          </p>

          <div className="flex gap-3">
            <button onClick={onViewDetails} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 cursor-pointer text-sm uppercase tracking-wider">
              <History size={18} /> Ver Detalles
            </button>
            <button onClick={onSendAviso} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-navy text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer text-sm uppercase tracking-wider">
              <Send size={18} /> Enviar Aviso
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};