
import React from 'react';
import { Card, NotebookState, CardType } from '../types';
import { X } from 'lucide-react';

interface NotebookProps {
  cards: Card[];
  notebook: NotebookState;
  onToggle: (cardId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Notebook: React.FC<NotebookProps> = ({ cards, notebook, onToggle, isOpen, onClose }) => {
  if (!isOpen) return null;

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'cleared': 
        return { label: 'INNOCENTÉ', color: 'bg-red-900/50 text-red-400 border-red-500' };
      case 'has': 
        return { label: 'POSSÉDÉ', color: 'bg-green-900/50 text-green-400 border-green-500' };
      case 'suspicious': 
        return { label: 'SUSPECT', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-500' };
      default: 
        return { label: 'INCONNU', color: 'bg-slate-800 text-slate-500 border-slate-700' };
    }
  };

  const renderSection = (title: string, type: CardType) => (
    <div className="mb-6">
      <h3 className="text-mystery-gold font-serif text-lg mb-2 border-b border-mystery-gold/30 pb-1">{title}</h3>
      <div className="space-y-1">
        {cards.filter(c => c.type === type).map(card => {
          const status = notebook[card.id] || 'unknown';
          const { label, color } = getStatusConfig(status);

          return (
            <div 
              key={card.id} 
              onClick={() => onToggle(card.id)}
              className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer transition-colors group"
            >
              <span className={`text-sm ${status === 'cleared' ? 'line-through opacity-50' : 'text-slate-200 group-hover:text-white'}`}>
                {card.name}
              </span>
              
              <div className={`
                 px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider min-w-[80px] text-center transition-all
                 ${color}
              `}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif text-white">Carnet de Détective</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-xs text-slate-400 mb-6 italic">
          Cliquez pour changer le statut.
        </p>

        {renderSection('Suspects', CardType.SUSPECT)}
        {renderSection('Lieux', CardType.LOCATION)}
        {renderSection('Armes', CardType.WEAPON)}
      </div>
    </div>
  );
};

export default Notebook;
