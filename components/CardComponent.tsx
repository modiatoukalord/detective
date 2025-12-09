
import React from 'react';
import { Card, CardType } from '../types';
import * as Icons from 'lucide-react';

interface CardProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  revealed?: boolean;
}

const CardComponent: React.FC<CardProps> = ({ card, onClick, selected, small = false, revealed = true }) => {
  // Dynamic Icon rendering
  const IconComponent = (Icons as any)[card.iconName] || Icons.HelpCircle;

  // Type labels in French
  const typeLabels = {
    [CardType.SUSPECT]: 'SUSPECT',
    [CardType.LOCATION]: 'LIEU',
    [CardType.WEAPON]: 'ARME'
  };

  // Type-based styling
  const typeColors = {
    [CardType.SUSPECT]: {
      border: 'border-blue-500',
      bg: 'bg-slate-900',
      text: 'text-blue-400',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
      gradient: 'from-blue-900/40 to-slate-900',
      accent: 'border-l-blue-500'
    },
    [CardType.LOCATION]: {
      border: 'border-red-600',
      bg: 'bg-slate-900',
      text: 'text-red-500',
      glow: 'shadow-[0_0_15px_rgba(220,38,38,0.3)]',
      gradient: 'from-red-900/40 to-slate-900',
      accent: 'border-l-red-600'
    },
    [CardType.WEAPON]: {
      border: 'border-yellow-500',
      bg: 'bg-slate-900',
      text: 'text-yellow-500',
      glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
      gradient: 'from-yellow-900/40 to-slate-900',
      accent: 'border-l-yellow-500'
    },
  };

  const styles = typeColors[card.type];

  if (!revealed) {
    return (
      <div 
        className={`
          relative overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-800 
          flex items-center justify-center 
          transition-all duration-300 transform hover:scale-105
          ${small ? 'w-16 h-24' : 'w-32 h-48 md:w-40 md:h-60'}
          shadow-lg
        `}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
        <div className="text-slate-600 font-serif font-bold text-4xl opacity-20">?</div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-lg border-2 
        transition-all duration-300 transform cursor-pointer
        ${selected ? `scale-105 ring-2 ring-offset-2 ring-offset-slate-900 ring-white ${styles.glow}` : 'hover:scale-105 hover:shadow-xl'}
        ${styles.border} ${styles.bg}
        ${small ? 'w-20 h-28 p-2' : 'w-36 h-56 md:w-48 md:h-72 p-3 md:p-4'}
        flex flex-col
      `}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-50`}></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

      {/* Header (JP Name) */}
      <div className="relative z-10 flex justify-between items-start">
         <span className={`text-[10px] md:text-xs tracking-widest uppercase opacity-70 ${styles.text}`}>
           {typeLabels[card.type]}
         </span>
         <span className="font-sans text-xs md:text-sm text-slate-500 writing-vertical-rl opacity-60">
           {card.jpName}
         </span>
      </div>

      {/* Image or Icon Area */}
      <div className="relative z-10 flex-grow flex items-center justify-center py-2">
        <div className={`
          rounded-full border border-opacity-30 backdrop-blur-sm overflow-hidden flex items-center justify-center
          ${styles.border} bg-white/5
          ${card.imageUrl ? (small ? 'w-12 h-12' : 'w-24 h-24 md:w-32 md:h-32') : (small ? 'p-2' : 'p-3 md:p-4')}
        `}>
          {card.imageUrl ? (
             <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : (
             <IconComponent className={`w-8 h-8 md:w-12 md:h-12 ${styles.text}`} />
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 space-y-1">
        <h3 className={`font-serif font-bold text-sm md:text-lg leading-tight text-slate-200 truncate`}>
          {card.name}
        </h3>
        {!small && (
          <p className="text-[10px] md:text-xs text-slate-400 leading-tight line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      {/* Decorative Corner */}
      <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 opacity-50 rounded-br-lg ${styles.border}`}></div>
    </div>
  );
};

export default CardComponent;
