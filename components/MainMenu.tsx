
import React, { useEffect } from 'react';
import { AppView } from '../types';
import { Search, Users, BookOpen } from 'lucide-react';
import { useSound } from '../contexts/SoundContext';

interface MainMenuProps {
  onChangeView: (view: AppView) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onChangeView }) => {
  const { playBgm, playSound } = useSound();

  useEffect(() => {
    playBgm('bgm_menu');
  }, [playBgm]);

  const handleClick = (view: AppView) => {
    playSound('click');
    onChangeView(view);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background: Japanese city at night vibe */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=3656&auto=format&fit=crop"
          alt="Detective Background"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-900/40 to-slate-950"></div>
        
        {/* Fog/Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/foggy-birds.png')] opacity-10 animate-slide-up"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-12 animate-fade-in px-4">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-400 tracking-tighter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            Détective Conan
          </h1>
          <h2 className="text-2xl md:text-3xl font-serif text-slate-400 tracking-[0.2em] border-t border-slate-700 pt-2 inline-block shadow-black drop-shadow-lg">
            ENQUÊTE SUPRÊME
          </h2>
        </div>

        {/* Main Buttons */}
        <div className="flex flex-col space-y-6 w-full max-w-md">
          <button 
            onClick={() => handleClick(AppView.CREATE_LOBBY)}
            onMouseEnter={() => playSound('hover')}
            className="group relative px-8 py-5 bg-slate-800/80 backdrop-blur-md border border-blue-500/50 text-white font-serif text-xl rounded-lg hover:bg-slate-800 hover:border-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="flex items-center justify-center space-x-3">
              <Search className="w-6 h-6 text-blue-400" />
              <span>Créer une partie</span>
            </div>
          </button>

          <button 
            onClick={() => handleClick(AppView.JOIN_LOBBY)}
            onMouseEnter={() => playSound('hover')}
            className="group px-8 py-5 bg-slate-900/60 backdrop-blur-md border border-slate-600 text-slate-300 font-serif text-xl rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all shadow-lg"
          >
            <div className="flex items-center justify-center space-x-3">
              <Users className="w-6 h-6" />
              <span>Rejoindre une partie</span>
            </div>
          </button>

          <button 
             onClick={() => handleClick(AppView.LIBRARY)}
             onMouseEnter={() => playSound('hover')}
             className="text-sm text-slate-400 hover:text-blue-300 transition-colors flex items-center justify-center space-x-2 pt-4 drop-shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>Consulter les Archives (Cartes)</span>
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-slate-500 text-sm tracking-widest font-mono drop-shadow-md">
          2 À 4 JOUEURS • ONLINE
        </p>
      </div>
    </div>
  );
};

export default MainMenu;
