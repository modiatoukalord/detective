
import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../types';
import { ArrowLeft, Play, UserPlus, Shield, ShieldAlert, ShieldCheck, Bot, Globe, Copy, Users, Fingerprint, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { useSound } from '../contexts/SoundContext';

interface LobbyProps {
  mode: 'CREATE' | 'JOIN';
  onChangeView: (view: AppView) => void;
  onStartGame: (playerCount: number) => void;
}

type GameType = 'BOTS' | 'ONLINE';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type OnlineStep = 'SETUP' | 'WAITING_ROOM';

const Lobby: React.FC<LobbyProps> = ({ mode, onChangeView, onStartGame }) => {
  const { playSound } = useSound();
  
  // General State
  const [loading, setLoading] = useState(false);
  
  // Create Mode State
  const [gameType, setGameType] = useState<GameType>('BOTS');
  
  // Bots Config
  const [botPlayerCount, setBotPlayerCount] = useState(4);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  
  // Online Config (HOST)
  const [onlineStep, setOnlineStep] = useState<OnlineStep>('SETUP');
  const [gameName, setGameName] = useState('Affaire #892');
  const [lobbyCode, setLobbyCode] = useState('');
  const [onlineMaxPlayers, setOnlineMaxPlayers] = useState(4);
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>(['Détective (Hôte)']);

  // Online Config (CLIENT)
  const [joinCode, setJoinCode] = useState('');
  const [hasJoined, setHasJoined] = useState(false); // Client has successfully joined
  const [clientPlayerName, setClientPlayerName] = useState('');

  // Broadcast Channel Ref
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Use refs to access latest state inside event listeners without triggering re-renders
  const stateRef = useRef({ lobbyCode, onlinePlayers, onlineMaxPlayers, gameName });

  useEffect(() => {
    stateRef.current = { lobbyCode, onlinePlayers, onlineMaxPlayers, gameName };
  }, [lobbyCode, onlinePlayers, onlineMaxPlayers, gameName]);

  // Generate a random code on mount (Only relevant for Host setup)
  useEffect(() => {
    generateNewCode();
  }, []);

  // --- BROADCAST CHANNEL LOGIC (Multi-tab Multiplayer) ---
  useEffect(() => {
    // Only activate BC if we are in Online Mode (Create or Join)
    if (mode === 'CREATE' && gameType !== 'ONLINE') return;
    
    // Initialize Channel
    console.log("Initializing BroadcastChannel...");
    const bc = new BroadcastChannel('detective_conan_lobby');
    bcRef.current = bc;

    bc.onmessage = (event) => {
      const { type, payload } = event.data;
      const current = stateRef.current; // Access latest state via ref
      
      // --- HOST LOGIC ---
      if (mode === 'CREATE' && onlineStep === 'WAITING_ROOM') {
         if (type === 'JOIN_REQUEST') {
             console.log("Host received JOIN_REQUEST", payload);
             // Only accept if code matches and we have space
             // Normalize codes to handle potential casing issues
             const inputCode = payload.code.trim().toUpperCase();
             const actualCode = current.lobbyCode.trim().toUpperCase();

             if (inputCode === actualCode && current.onlinePlayers.length < current.onlineMaxPlayers) {
                 playSound('notification');
                 // Check if player already exists to avoid duplicates
                 if (!current.onlinePlayers.includes(payload.playerName)) {
                    const newPlayerList = [...current.onlinePlayers, payload.playerName];
                    setOnlinePlayers(newPlayerList);
                    
                    // Broadcast update to all clients
                    bc.postMessage({ 
                        type: 'PLAYER_UPDATE', 
                        payload: { players: newPlayerList, gameName: current.gameName, maxPlayers: current.onlineMaxPlayers } 
                    });
                 } else {
                    // Resend current state even if player exists (in case client refreshed)
                    bc.postMessage({ 
                        type: 'PLAYER_UPDATE', 
                        payload: { players: current.onlinePlayers, gameName: current.gameName, maxPlayers: current.onlineMaxPlayers } 
                    });
                 }
             }
         }
      }

      // --- CLIENT LOGIC ---
      if (mode === 'JOIN' && hasJoined) {
          if (type === 'PLAYER_UPDATE') {
              console.log("Client received PLAYER_UPDATE", payload);
              // Sync lobby state
              setOnlinePlayers(payload.players);
              setGameName(payload.gameName || stateRef.current.gameName);
              setOnlineMaxPlayers(payload.maxPlayers || 4);
          }
          if (type === 'START_GAME') {
              // Host started the game
              playSound('success');
              setLoading(true);
              setTimeout(() => {
                  onStartGame(payload.playerCount);
              }, 500);
          }
      }
    };

    // --- CLIENT JOIN TRIGGER ---
    // If we are a client and just joined, send the request NOW that the listener is ready.
    if (mode === 'JOIN' && hasJoined) {
        console.log("Sending JOIN_REQUEST...");
        bc.postMessage({ 
            type: 'JOIN_REQUEST', 
            payload: { code: joinCode, playerName: clientPlayerName } 
        });
        
        // Optimistic update for self display
        setOnlinePlayers([clientPlayerName]); 
    }

    return () => {
        bc.close();
    };
  }, [mode, gameType, onlineStep, hasJoined, joinCode, clientPlayerName, playSound, onStartGame]); 
  // Dependency list is critical: re-run if we switch steps or join status changes.

  const generateNewCode = () => {
    setLobbyCode(`DET-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleCreateOnlineGame = () => {
    playSound('success');
    setOnlineStep('WAITING_ROOM');
    setOnlinePlayers(['Détective (Hôte)']);
    // Initial broadcast to clear any stale state on channel
    setTimeout(() => {
        bcRef.current?.postMessage({ 
            type: 'PLAYER_UPDATE', 
            payload: { players: ['Détective (Hôte)'], gameName, maxPlayers: onlineMaxPlayers } 
        });
    }, 100);
  };

  const handleJoinGame = () => {
      if (!joinCode) return;
      playSound('success');
      
      const myName = `Rival ${Math.floor(Math.random() * 1000)}`;
      setClientPlayerName(myName);
      setHasJoined(true); // Triggers the Effect above to send the message
  };

  const handleStartGame = () => {
    playSound('click');
    setLoading(true);
    
    const count = gameType === 'BOTS' ? botPlayerCount : onlinePlayers.length;
    
    if (gameType === 'ONLINE') {
        // Broadcast Start Command
        bcRef.current?.postMessage({
            type: 'START_GAME',
            payload: { playerCount: count }
        });
    }

    setTimeout(() => {
      onStartGame(count);
    }, 1500); 
  };

  const getDifficultyInfo = () => {
    switch(difficulty) {
      case 'EASY': return { text: "Les bots font des déductions simples et aléatoires.", color: "text-green-400", border: "border-green-500", icon: ShieldCheck };
      case 'MEDIUM': return { text: "Les bots suivent une logique standard.", color: "text-blue-400", border: "border-blue-500", icon: Shield };
      case 'HARD': return { text: "Les bots utilisent une logique avancée pour déduire plus vite.", color: "text-red-400", border: "border-red-500", icon: ShieldAlert };
    }
  };

  const diffInfo = getDifficultyInfo();

  // Helper to determine if we are in the Waiting Room view (Host or Client)
  const isWaitingRoomView = (mode === 'CREATE' && onlineStep === 'WAITING_ROOM') || (mode === 'JOIN' && hasJoined);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-200">
      {/* Background: Noir City */}
      <div className="absolute inset-0 z-0">
         <img 
            src="https://images.unsplash.com/photo-1517457210348-703079e57d4b?q=80&w=3870&auto=format&fit=crop" 
            alt="City Night" 
            className="w-full h-full object-cover opacity-30"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/90"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-fade-in min-h-[600px]">
        
        {/* Header */}
        <div className="h-20 border-b border-slate-700/50 flex items-center justify-between px-8 bg-slate-900/50">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => { 
                    playSound('click'); 
                    if (mode === 'CREATE' && onlineStep === 'WAITING_ROOM') {
                        setOnlineStep('SETUP'); // Host goes back to setup
                        setOnlinePlayers(['Détective (Hôte)']);
                    } else if (mode === 'JOIN' && hasJoined) {
                        setHasJoined(false); // Client leaves waiting room
                        setOnlinePlayers([]);
                    } else {
                        onChangeView(AppView.MENU); 
                    }
                }}
                className="group flex items-center justify-center w-10 h-10 rounded-full border border-slate-600 hover:bg-slate-800 hover:border-blue-500 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
              </button>
              <h2 className="text-2xl font-serif text-white tracking-wide">
                {mode === 'CREATE' ? 'CONFIGURATION DE L\'ENQUÊTE' : (hasJoined ? 'SALLE D\'ATTENTE' : 'REJOINDRE LE BUREAU')}
              </h2>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs uppercase tracking-widest text-slate-400">Réseau Sécurisé</span>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          
          {mode === 'CREATE' || hasJoined ? (
            <div className="flex flex-col gap-8 h-full">
              
              {/* Section 1: Game Type Selection (Only Host Setup) */}
              {mode === 'CREATE' && onlineStep === 'SETUP' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bots Option */}
                    <button 
                        onClick={() => { playSound('card_flip'); setGameType('BOTS'); }}
                        className={`
                        relative group p-6 rounded-xl border-2 text-left transition-all duration-300 overflow-hidden
                        ${gameType === 'BOTS' 
                            ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]' 
                            : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 hover:border-slate-500'}
                        `}
                    >
                        <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="relative flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${gameType === 'BOTS' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <Bot className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className={`text-xl font-serif font-bold ${gameType === 'BOTS' ? 'text-white' : 'text-slate-300'}`}>Partie avec Bots</h3>
                            <p className="text-sm text-slate-500 mt-1">Solo ou entraînement rapide</p>
                        </div>
                        </div>
                    </button>

                    {/* Online Option */}
                    <button 
                        onClick={() => { playSound('card_flip'); setGameType('ONLINE'); }}
                        className={`
                        relative group p-6 rounded-xl border-2 text-left transition-all duration-300 overflow-hidden
                        ${gameType === 'ONLINE' 
                            ? 'bg-red-900/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.15)]' 
                            : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 hover:border-slate-500'}
                        `}
                    >
                        <div className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="relative flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${gameType === 'ONLINE' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <Globe className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className={`text-xl font-serif font-bold ${gameType === 'ONLINE' ? 'text-white' : 'text-slate-300'}`}>Partie en Ligne</h3>
                            <p className="text-sm text-slate-500 mt-1">Ouverte aux autres joueurs</p>
                        </div>
                        </div>
                    </button>
                </div>
              )}

              {/* Section 2: Configuration Panels */}
              <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-6 animate-slide-up relative overflow-hidden">
                 
                 {/* BOTS CONFIG */}
                 {mode === 'CREATE' && gameType === 'BOTS' && (
                   <div className="space-y-8 animate-fade-in">
                      {/* Player Count */}
                      <div className="space-y-3">
                         <label className="text-sm uppercase tracking-widest text-slate-400 font-bold">Nombre de joueurs</label>
                         <select 
                            value={botPlayerCount}
                            onChange={(e) => { playSound('click'); setBotPlayerCount(Number(e.target.value)); }}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                         >
                            <option value={2}>2 Joueurs (1 Bot)</option>
                            <option value={3}>3 Joueurs (2 Bots)</option>
                            <option value={4}>4 Joueurs (3 Bots)</option>
                         </select>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-3">
                         <label className="text-sm uppercase tracking-widest text-slate-400 font-bold">Niveau de difficulté</label>
                         <div className="grid grid-cols-3 gap-4">
                            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((level) => (
                               <button
                                  key={level}
                                  onClick={() => { playSound('click'); setDifficulty(level); }}
                                  className={`
                                    py-3 px-2 rounded-lg border text-sm font-bold transition-all
                                    ${difficulty === level 
                                      ? 'bg-slate-700 border-white text-white shadow-lg' 
                                      : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500'}
                                  `}
                               >
                                  {level === 'EASY' ? 'FACILE' : level === 'MEDIUM' ? 'MOYEN' : 'DIFFICILE'}
                               </button>
                            ))}
                         </div>
                         
                         {/* Description Box */}
                         <div className={`p-4 rounded-lg bg-slate-900/80 border ${diffInfo.border} flex items-start gap-3 transition-colors`}>
                            <diffInfo.icon className={`w-5 h-5 flex-shrink-0 ${diffInfo.color}`} />
                            <p className="text-sm text-slate-300">{diffInfo.text}</p>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* ONLINE CONFIG - SETUP STEP (HOST ONLY) */}
                 {mode === 'CREATE' && gameType === 'ONLINE' && onlineStep === 'SETUP' && (
                   <div className="space-y-8 animate-fade-in">
                      <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-xl font-serif text-white">Paramètres de la partie</h3>
                          <div className="h-px bg-slate-700 flex-1"></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Left Column */}
                         <div className="space-y-6">
                             <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-slate-500">Nom de la partie</label>
                                <input 
                                  type="text" 
                                  value={gameName}
                                  onChange={(e) => setGameName(e.target.value)}
                                  className="w-full p-4 bg-slate-900 border border-slate-600 rounded text-white focus:border-red-500 focus:outline-none placeholder-slate-600"
                                  placeholder="Ex: Affaire du Musée"
                                />
                             </div>
                             
                             <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-slate-500">Nombre de joueurs max</label>
                                <div className="flex gap-4">
                                    {[2, 3, 4].map(num => (
                                        <button 
                                            key={num}
                                            onClick={() => { playSound('click'); setOnlineMaxPlayers(num); }}
                                            className={`
                                                flex-1 py-3 border rounded font-bold transition-all
                                                ${onlineMaxPlayers === num 
                                                    ? 'bg-red-900/40 border-red-500 text-white' 
                                                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}
                                            `}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                             </div>
                         </div>

                         {/* Right Column (Code Preview) */}
                         <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-slate-500">Code de la partie</label>
                            <div className="p-6 bg-slate-950 border border-slate-800 rounded-lg flex flex-col items-center justify-center gap-4">
                                <span className="font-mono text-3xl text-red-400 tracking-[0.2em]">{lobbyCode}</span>
                                <button 
                                    onClick={() => { playSound('click'); generateNewCode(); }}
                                    className="text-xs text-slate-500 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Générer un nouveau code
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Ce code sera nécessaire pour que vos amis rejoignent la partie.
                            </p>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* ONLINE WAITING ROOM (SHARED HOST & CLIENT VIEW) */}
                 {isWaitingRoomView && (
                   <div className="space-y-8 animate-slide-up h-full flex flex-col">
                      {/* Top Bar Info */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                         <div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Nom de la partie</div>
                            <div className="text-xl font-serif text-white">{gameName}</div>
                         </div>
                         <div className="flex items-center gap-4">
                             <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Code Secret</div>
                                <div className="font-mono text-xl text-red-400 tracking-wider select-all">
                                    {mode === 'CREATE' ? lobbyCode : joinCode}
                                </div>
                             </div>
                             {mode === 'CREATE' && (
                                <button 
                                    onClick={() => { playSound('click'); navigator.clipboard.writeText(lobbyCode); }}
                                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-400"
                                    title="Copier le code"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                             )}
                         </div>
                      </div>

                      {/* Waiting Room Visual */}
                      <div className="flex-1 space-y-4">
                         <div className="flex justify-between items-end">
                            <label className="text-sm uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Salle d'attente {mode === 'JOIN' && '(Invité)'}
                            </label>
                            <span className="text-xs text-green-400 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                En ligne
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[...Array(onlineMaxPlayers)].map((_, i) => {
                                const player = onlinePlayers[i];
                                const isMe = (mode === 'CREATE' && i === 0) || (mode === 'JOIN' && player === clientPlayerName);
                                
                                return (
                                   <div 
                                     key={i} 
                                     className={`
                                        aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-3 shadow-lg transition-all duration-500
                                        ${player 
                                            ? 'bg-slate-800/80 border-blue-500 shadow-blue-900/20' 
                                            : 'bg-slate-900/30 border-slate-800 border-dashed'}
                                     `}
                                   >
                                      {player ? (
                                        <>
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-blue-400">
                                                    <Users className="w-8 h-8" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-slate-800">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-white">
                                                    {player.split('(')[0]} {isMe && '(Vous)'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase">
                                                    {player.includes('Hôte') ? 'Hôte' : 'Connecté'}
                                                </div>
                                            </div>
                                        </>
                                      ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 animate-pulse">
                                                <UserPlus className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs text-slate-500">En attente...</span>
                                        </>
                                      )}
                                   </div>
                                );
                            })}
                         </div>
                      </div>

                      <div className="text-center">
                         {mode === 'CREATE' ? (
                            <p className="text-xs text-slate-500 flex items-center justify-center gap-2 animate-pulse">
                                <Globe className="w-3 h-3" />
                                Partagez le code pour inviter des joueurs.
                            </p>
                         ) : (
                            <p className="text-xs text-slate-500 flex items-center justify-center gap-2 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                En attente du lancement par l'hôte...
                            </p>
                         )}
                      </div>
                   </div>
                 )}

              </div>
            </div>
          ) : (
             /* JOIN MODE CONTENT (INPUT) */
             <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto space-y-8">
                <div className="text-center space-y-2">
                   <h3 className="text-2xl font-serif text-white">Entrer dans une enquête</h3>
                   <p className="text-slate-400 text-sm">Saisissez le code d'accès sécurisé pour rejoindre le lobby.</p>
                </div>

                <div className="w-full relative">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Fingerprint className="w-6 h-6 text-slate-500" />
                   </div>
                   <input 
                      type="text" 
                      placeholder="CODE DE LA PARTIE (Ex: DET-4092)"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full pl-14 pr-4 py-5 bg-slate-950 border border-slate-700 rounded-lg text-lg tracking-widest text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                   />
                </div>

                <button 
                  onClick={handleJoinGame}
                  disabled={joinCode.length < 4}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                   <Users className="w-5 h-5" />
                   REJOINDRE
                </button>
             </div>
          )}

        </div>

        {/* Footer Actions */}
        {mode === 'CREATE' && (
           <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-end">
              {/* Logic for switching buttons based on state */}
              {gameType === 'ONLINE' && onlineStep === 'SETUP' ? (
                  <button 
                    onClick={handleCreateOnlineGame}
                    className="relative overflow-hidden px-10 py-4 rounded-lg font-bold text-lg tracking-widest shadow-xl transition-all bg-red-600 hover:bg-red-500 text-white shadow-red-900/50 transform hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                        <span>CRÉER LA PARTIE</span>
                        <Globe className="w-5 h-5" />
                    </div>
                  </button>
              ) : (
                  <button 
                    onClick={handleStartGame}
                    disabled={loading || (gameType === 'ONLINE' && onlinePlayers.length < 2)}
                    className={`
                        relative overflow-hidden px-10 py-4 rounded-lg font-bold text-lg tracking-widest shadow-xl transition-all
                        ${gameType === 'BOTS' 
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50' 
                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/50'}
                        transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none
                    `}
                    >
                    <div className="flex items-center gap-3">
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>INITIALISATION...</span>
                            </>
                        ) : (
                            <>
                                <span>{gameType === 'ONLINE' ? 'LANCER LA PARTIE' : "LANCER L'ENQUÊTE"}</span>
                                <Play className="w-5 h-5 fill-current" />
                            </>
                        )}
                    </div>
                  </button>
              )}
           </div>
        )}
        
        {/* Client Footer (Wait Status) */}
        {mode === 'JOIN' && hasJoined && (
             <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-center text-slate-500 italic text-sm">
                En attente que l'hôte lance la partie...
             </div>
        )}

      </div>
    </div>
  );
};

export default Lobby;
