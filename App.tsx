
import React, { useState } from 'react';
import { AppView, Card } from './types';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import CardLibrary from './components/CardLibrary';
import GameBoard from './components/GameBoard';
import { SoundProvider, useSound } from './contexts/SoundContext';
import { Volume2, VolumeX } from 'lucide-react';
import { CARDS } from './constants';

// Inner App to access useSound
const AppContent = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.MENU);
  const [lobbyMode, setLobbyMode] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [allCards, setAllCards] = useState<Card[]>(CARDS);
  
  const { isMuted, toggleMute, playSound } = useSound();

  const handleNavigate = (view: AppView) => {
    playSound('click');
    if (view === AppView.CREATE_LOBBY) {
      setLobbyMode('CREATE');
    } else if (view === AppView.JOIN_LOBBY) {
      setLobbyMode('JOIN');
    }
    setCurrentView(view);
  };

  const handleStartGame = (count: number = 4) => {
    playSound('success');
    setPlayerCount(count);
    setCurrentView(AppView.GAME);
  };

  const handleAddCard = (newCard: Card) => {
    setAllCards(prev => [...prev, newCard]);
    playSound('success');
  };

  const handleEditCard = (updatedCard: Card) => {
    setAllCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    playSound('success');
  };

  const handleDeleteCard = (cardId: string) => {
    setAllCards(prev => prev.filter(c => c.id !== cardId));
    playSound('click');
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      
      {/* Global Sound Control */}
      <button 
        onClick={toggleMute}
        className="fixed top-4 right-4 z-[110] p-3 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg backdrop-blur-sm"
        title={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {currentView === AppView.MENU && (
        <MainMenu onChangeView={handleNavigate} />
      )}

      {(currentView === AppView.CREATE_LOBBY || currentView === AppView.JOIN_LOBBY) && (
        <Lobby 
          mode={lobbyMode} 
          onChangeView={handleNavigate} 
          onStartGame={handleStartGame} 
        />
      )}

      {currentView === AppView.LIBRARY && (
        <CardLibrary 
          cards={allCards}
          onAddCard={handleAddCard}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onChangeView={handleNavigate} 
        />
      )}

      {currentView === AppView.GAME && (
        <GameBoard 
          cards={allCards}
          playerCount={playerCount}
          onExit={() => handleNavigate(AppView.MENU)} 
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <SoundProvider>
      <AppContent />
    </SoundProvider>
  );
}
