
import React, { useState, useEffect, useRef } from 'react';
import { Card, GamePhase, GameState, CardType, NotebookState, AppView, ChatMessage } from '../types';
import CardComponent from './CardComponent';
import Notebook from './Notebook';
import ChatWidget from './ChatWidget';
import * as Icons from 'lucide-react';
import { generateCaseIntro, generateConclusion, generateHint } from '../services/geminiService';
import { useSound } from '../contexts/SoundContext';

const INITIAL_NOTEBOOK: NotebookState = {};

interface GameBoardProps {
  onExit: () => void;
  playerCount: number;
  cards: Card[];
}

// Extension of GameState locally to include turn index
interface ExtendedGameState extends GameState {
  currentPlayerIndex: number; // 0 = User, 1 = Bot1, 2 = Bot2, etc.
}

const GameBoard: React.FC<GameBoardProps> = ({ onExit, playerCount, cards }) => {
  const { playSound, playBgm, stopBgm } = useSound();
  
  // --- State ---
  const [gameState, setGameState] = useState<ExtendedGameState>({
    phase: GamePhase.SETUP,
    solution: [],
    players: [],
    turnCount: 0,
    log: [],
    lastRefutation: null,
    currentPlayerIndex: 0,
  });

  const [notebook, setNotebook] = useState<NotebookState>(INITIAL_NOTEBOOK);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  
  // Selection State for Player Turn
  const [selectedSuspect, setSelectedSuspect] = useState<Card | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Card | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<Card | null>(null);

  // Refutation State (When Opponent attacks)
  const [isRefuting, setIsRefuting] = useState(false);
  const [isRefutationModalOpen, setIsRefutationModalOpen] = useState(false); 
  const [refutationStep, setRefutationStep] = useState<'VIEW_HYPOTHESIS' | 'SELECT_CARD'>('VIEW_HYPOTHESIS');
  const [computerHypothesis, setComputerHypothesis] = useState<{suspect: Card, location: Card, weapon: Card} | null>(null);
  const [matchingRefutationCards, setMatchingRefutationCards] = useState<Card[]>([]);
  const [selectedRefutationCard, setSelectedRefutationCard] = useState<Card | null>(null);
  
  // To track who is waiting for a refutation from whom
  const [refutingPlayerId, setRefutingPlayerId] = useState<string | null>(null);

  // User Investigation Result State (When User attacks)
  const [investigationResult, setInvestigationResult] = useState<{
    isOpen: boolean;
    refuterName: string | null;
    shownCard: Card | null;
    hypothesis: { suspect: Card, location: Card, weapon: Card } | null;
  }>({ isOpen: false, refuterName: null, shownCard: null, hypothesis: null });

  const [showResultHypothesis, setShowResultHypothesis] = useState(false);

  // Accusation Confirmation State
  const [isAccusationConfirmOpen, setIsAccusationConfirmOpen] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Flavor Text
  const [flavorText, setFlavorText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const addLog = (message: string, type: any = 'info') => {
    setGameState(prev => ({
      ...prev,
      log: [...prev.log, { turn: prev.turnCount, message, type }]
    }));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const shuffle = (array: any[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // --- Game Logic: Setup ---
  useEffect(() => {
    playBgm('bgm_game'); // Start Game Music
    
    const startGame = async () => {
      setAiLoading(true);
      setNotebook({}); // Reset notebook
      setSelectedSuspect(null);
      setSelectedLocation(null);
      setSelectedWeapon(null);
      setChatMessages([]);
  
      // 1. Prepare Solution
      const suspects = shuffle(cards.filter(c => c.type === CardType.SUSPECT));
      const locations = shuffle(cards.filter(c => c.type === CardType.LOCATION));
      const weapons = shuffle(cards.filter(c => c.type === CardType.WEAPON));
  
      if (suspects.length === 0 || locations.length === 0 || weapons.length === 0) {
          console.error("Erreur critique: Pas assez de cartes.");
          addLog("Erreur: Pas assez de cartes dans une des catégories.", "alert");
          return;
      }

      // Pop one of each for the solution (The Answer)
      const solution = [
          suspects.pop() as Card, 
          locations.pop() as Card, 
          weapons.pop() as Card
      ];
      
      // Combine all remaining cards into one deck
      const remainingDeck = shuffle([...suspects, ...locations, ...weapons]);
  
      // 2. Create Players
      const newPlayers = [];
      newPlayers.push({ id: 'p0', name: 'Détective (Vous)', hand: [], isComputer: false });
      
      for(let i = 1; i < playerCount; i++) {
         newPlayers.push({ id: `p${i}`, name: `Rival ${i}`, hand: [], isComputer: true });
      }

      // 3. Distribute Cards Successively
      let pIndex = 0;
      remainingDeck.forEach(card => {
        newPlayers[pIndex].hand.push(card);
        pIndex = (pIndex + 1) % playerCount;
      });

      const distInfo = newPlayers.map(p => `${p.name}: ${p.hand.length}`).join(', ');
  
      // 4. Initialize Notebook (Neutral)
      setNotebook({});
  
      setGameState({
        phase: GamePhase.PLAYING,
        solution,
        players: newPlayers,
        turnCount: 1,
        log: [
            { turn: 0, message: `Enquête démarrée avec ${playerCount} joueurs.`, type: 'info' },
            { turn: 0, message: `Distribution (${remainingDeck.length} cartes) : ${distInfo}`, type: 'info' }
        ],
        lastRefutation: null,
        currentPlayerIndex: 0 // User starts
      });
  
      const intro = await generateCaseIntro(solution);
      setFlavorText(intro);
      setAiLoading(false);
    };

    startGame();
    
    return () => stopBgm();
  }, [playerCount, cards]);

  // --- Effect: Handle Turn Switching to Computer ---
  useEffect(() => {
      if (gameState.phase !== GamePhase.PLAYING) return;
      if (investigationResult.isOpen) return; 
      if (isRefuting) return;

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer && currentPlayer.isComputer) {
          const timer = setTimeout(() => {
              handleComputerTurn(gameState.currentPlayerIndex);
          }, 2000);
          return () => clearTimeout(timer);
      }
  }, [gameState.currentPlayerIndex, gameState.phase, investigationResult.isOpen, isRefuting]);


  // --- Game Logic: User Suggestion ---
  const handleInvestigation = async () => {
    playSound('click');
    if (!selectedSuspect || !selectedLocation || !selectedWeapon) return;
    if (gameState.currentPlayerIndex !== 0) return;

    addLog(`Vous enquêtez : ${selectedSuspect.name} avec ${selectedWeapon.name} à ${selectedLocation.name}`, 'deduction');

    const suggestion = [selectedSuspect, selectedLocation, selectedWeapon];
    
    // Check other players in clockwise order
    let refutationFound = false;
    let refuterName = "";
    let shownCard: Card | null = null;

    for (let i = 1; i < playerCount; i++) {
        const targetIndex = (0 + i) % playerCount;
        const targetPlayer = gameState.players[targetIndex];
        
        const matches = targetPlayer.hand.filter(c => suggestion.some(s => s.id === c.id));
        
        if (matches.length > 0) {
            shownCard = matches[Math.floor(Math.random() * matches.length)];
            refuterName = targetPlayer.name;
            refutationFound = true;
            break; 
        }
    }

    setShowResultHypothesis(false);

    if (refutationFound && shownCard) {
      playSound('alert');
      setGameState(prev => ({
        ...prev,
        lastRefutation: { card: shownCard!, fromPlayer: refuterName },
      }));
      addLog(`${refuterName} a réfuté en montrant : ${shownCard.name}`, 'alert');
      // Auto-update notebook for user
      setNotebook(prev => ({ ...prev, [shownCard!.id]: 'cleared' }));
      
      setInvestigationResult({
          isOpen: true,
          refuterName: refuterName,
          shownCard: shownCard,
          hypothesis: { suspect: selectedSuspect, location: selectedLocation, weapon: selectedWeapon }
      });

    } else {
      playSound('success');
      setGameState(prev => ({
        ...prev,
        lastRefutation: null,
      }));
      addLog(`Personne n'a pu réfuter votre suggestion.`, 'success');

      setInvestigationResult({
        isOpen: true,
        refuterName: null,
        shownCard: null,
        hypothesis: { suspect: selectedSuspect, location: selectedLocation, weapon: selectedWeapon }
      });
    }
  };

  const handleEndTurnFromOverlay = () => {
      playSound('click');
      setInvestigationResult({ isOpen: false, refuterName: null, shownCard: null, hypothesis: null });
      setSelectedSuspect(null);
      setSelectedLocation(null);
      setSelectedWeapon(null);
      endTurn();
  };

  const handleComputerTurn = (botIndex: number) => {
    const botPlayer = gameState.players[botIndex];
    if (!botPlayer) return;

    // AI Logic - Use dynamically available cards
    const suspects = cards.filter(c => c.type === CardType.SUSPECT);
    const locations = cards.filter(c => c.type === CardType.LOCATION);
    const weapons = cards.filter(c => c.type === CardType.WEAPON);

    const s = suspects[Math.floor(Math.random() * suspects.length)];
    const l = locations[Math.floor(Math.random() * locations.length)];
    const w = weapons[Math.floor(Math.random() * weapons.length)];

    const hypothesis = { suspect: s, location: l, weapon: w };
    setComputerHypothesis(hypothesis);
    addLog(`${botPlayer.name} enquête : ${s.name}, ${l.name}, ${w.name}`, 'info');

    let refutationFound = false;

    for (let i = 1; i < playerCount; i++) {
        const targetIndex = (botIndex + i) % playerCount;
        const targetPlayer = gameState.players[targetIndex];

        // 1. If Target is User (Index 0)
        if (targetIndex === 0) {
            const matches = targetPlayer.hand.filter(c => c.id === s.id || c.id === l.id || c.id === w.id);
            if (matches.length > 0) {
                setMatchingRefutationCards(matches);
                setRefutingPlayerId(botPlayer.name); 
                setRefutationStep('VIEW_HYPOTHESIS'); 
                setIsRefuting(true);
                setIsRefutationModalOpen(false); 
                refutationFound = true;
                playSound('alert'); // Notify user they are being challenged
                return; 
            }
        } 
        // 2. If Target is another Bot
        else {
            const matches = targetPlayer.hand.filter(c => c.id === s.id || c.id === l.id || c.id === w.id);
            if (matches.length > 0) {
                addLog(`${targetPlayer.name} a montré une carte à ${botPlayer.name}.`, 'alert');
                refutationFound = true;
                break; 
            }
        }
    }

    if (!refutationFound) {
         addLog(`Personne n'a réfuté l'hypothèse de ${botPlayer.name}.`, 'info');
    }

    endTurn();
  };

  const handleConfirmRefutation = () => {
    playSound('click');
    if (!selectedRefutationCard || !refutingPlayerId) return;
    
    addLog(`Vous avez montré : ${selectedRefutationCard.name} à ${refutingPlayerId}.`, 'deduction');
    
    setIsRefuting(false);
    setIsRefutationModalOpen(false);
    setSelectedRefutationCard(null);
    setComputerHypothesis(null);
    setMatchingRefutationCards([]);
    setRefutingPlayerId(null);
    
    endTurn();
  };

  const endTurn = () => {
     setGameState(prev => ({
        ...prev,
        turnCount: prev.turnCount + 1,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % playerCount
     }));
  };

  // --- Game Logic: Accusation ---
  const handleAccusation = async () => {
    playSound('click');
    if (!selectedSuspect || !selectedLocation || !selectedWeapon) return;
    
    const isCorrect = 
      selectedSuspect.id === gameState.solution.find(c => c.type === CardType.SUSPECT)?.id &&
      selectedLocation.id === gameState.solution.find(c => c.type === CardType.LOCATION)?.id &&
      selectedWeapon.id === gameState.solution.find(c => c.type === CardType.WEAPON)?.id;

    setAiLoading(true);
    const conclusion = await generateConclusion(isCorrect, gameState.solution);
    setFlavorText(conclusion);
    setAiLoading(false);

    if (isCorrect) {
      playSound('success');
      setGameState(prev => ({ ...prev, phase: GamePhase.GAME_OVER_WIN }));
      addLog("CORRECT ! Vous avez résolu le mystère !", 'success');
    } else {
      playSound('failure');
      setGameState(prev => ({ ...prev, phase: GamePhase.GAME_OVER_LOSE }));
      addLog("FAUX ! Le coupable s'est échappé...", 'alert');
    }
  };

  // --- Notebook Interaction ---
  const toggleNotebookEntry = (cardId: string) => {
    playSound('click');
    setNotebook(prev => {
      const current = prev[cardId] || 'unknown';
      const order: ('unknown' | 'suspicious' | 'cleared' | 'has')[] = ['unknown', 'suspicious', 'cleared', 'has'];
      const nextIndex = (order.indexOf(current) + 1) % order.length;
      return { ...prev, [cardId]: order[nextIndex] };
    });
  };

  // --- Chat Logic ---
  const handleSendMessage = (text: string) => {
    playSound('notification');
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'Vous',
      text,
      isUser: true,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMessage]);

    // Bot Random Reply Logic
    if (playerCount > 1) {
      const randomBotIndex = Math.floor(Math.random() * (playerCount - 1)) + 1; 
      const botName = gameState.players[randomBotIndex]?.name || "Rival 1";
      
      const phrases = [
        "Intéressant...",
        "Je ne pense pas que ce soit ça.",
        "Tu bluffes ?",
        "Hmpf. On verra bien.",
        "Je me rapproche de la vérité...",
        "Cette affaire est plus complexe qu'il n'y paraît.",
        "As-tu vérifié le salon ?",
        "Moi ? Je n'ai rien dit."
      ];

      // 30% chance of reply
      if (Math.random() > 0.4) {
        setTimeout(() => {
          playSound('notification');
          const reply: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: botName,
            text: phrases[Math.floor(Math.random() * phrases.length)],
            isUser: false,
            timestamp: Date.now()
          };
          setChatMessages(prev => [...prev, reply]);
        }, 1500 + Math.random() * 2000);
      }
    }
  };

  // --- Hints ---
  const getHint = async () => {
    playSound('click');
    if (aiLoading) return;
    setAiLoading(true);
    
    const clearedCards = cards.filter(c => notebook[c.id] === 'cleared' || notebook[c.id] === 'has');
    const lastLog = gameState.log[gameState.log.length - 1]?.message || "Jeu commencé";
    
    const hint = await generateHint(gameState.players[0].hand, clearedCards, lastLog);
    addLog(`Assistant IA : ${hint}`, 'info');
    setAiLoading(false);
  };

  // --- Render ---

  if (gameState.phase === GamePhase.SETUP) {
    return (
      <div className="flex items-center justify-center h-full text-white bg-mystery-900">
        <Icons.Loader className="animate-spin w-10 h-10 text-blue-500" />
      </div>
    );
  }

  const userPlayer = gameState.players[0];
  const isUserTurn = gameState.currentPlayerIndex === 0;

  return (
    <div className="flex flex-col md:flex-row bg-mystery-900 text-slate-200 h-screen overflow-hidden">
      
      {/* Accusation Confirmation Modal */}
      {isAccusationConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-red-600 rounded-lg p-8 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
            
            <Icons.AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse relative z-10" />
            <h2 className="text-2xl font-serif text-white mb-2 relative z-10">Dernier Avertissement</h2>
            <p className="text-slate-300 mb-6 relative z-10 text-sm">
              Si votre accusation est fausse, vous perdrez immédiatement la partie. Êtes-vous absolument sûr de vos déductions ?
            </p>
            
            <div className="bg-slate-800 p-4 rounded mb-8 border border-slate-700 relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-widest text-slate-500">Coupable</span>
                <span className="text-blue-400 font-bold">{selectedSuspect?.name}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-widest text-slate-500">Avec</span>
                <span className="text-yellow-500 font-bold">{selectedWeapon?.name}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-500">À</span>
                <span className="text-red-500 font-bold">{selectedLocation?.name}</span>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <button 
                onClick={() => { playSound('click'); setIsAccusationConfirmOpen(false); }}
                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  setIsAccusationConfirmOpen(false);
                  handleAccusation();
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-500 shadow-lg shadow-red-900/50 transition-all"
              >
                CONFIRMER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investigation Result Overlay (User Turn Result) */}
      {investigationResult.isOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 animate-fade-in">
             <div className="max-w-xl w-full flex flex-col items-center space-y-4 animate-slide-up">
                 
                 <div className="text-center mb-4">
                    <h2 className="text-3xl font-serif text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] mb-2">
                        Rapport d'Enquête
                    </h2>
                    <div className="w-24 h-1 bg-blue-500 mx-auto"></div>
                 </div>

                 {/* Show User Hypothesis Toggle */}
                 <button 
                    onClick={() => { playSound('click'); setShowResultHypothesis(!showResultHypothesis); }}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider font-bold transition-colors"
                 >
                    {showResultHypothesis ? <Icons.EyeOff className="w-4 h-4"/> : <Icons.Eye className="w-4 h-4"/>}
                    {showResultHypothesis ? "Masquer mon hypothèse" : "Voir mon hypothèse"}
                 </button>

                 {/* Display Hypothesis Cards */}
                 {showResultHypothesis && investigationResult.hypothesis && (
                    <div className="flex gap-4 animate-fade-in justify-center py-4 bg-slate-900/40 rounded-xl w-full border border-slate-800/50">
                        <div className="transform scale-90 md:scale-75 origin-center">
                            <CardComponent card={investigationResult.hypothesis.suspect} small revealed />
                        </div>
                        <div className="transform scale-90 md:scale-75 origin-center">
                            <CardComponent card={investigationResult.hypothesis.location} small revealed />
                        </div>
                        <div className="transform scale-90 md:scale-75 origin-center">
                            <CardComponent card={investigationResult.hypothesis.weapon} small revealed />
                        </div>
                    </div>
                 )}

                 {investigationResult.shownCard ? (
                     <div className="flex flex-col items-center space-y-6 w-full">
                        <div className="text-center">
                             <p className="text-lg text-slate-300">
                                <span className="text-red-400 font-bold text-xl uppercase">{investigationResult.refuterName}</span> a réfuté votre hypothèse !
                             </p>
                             <p className="text-sm text-slate-500 mt-1">
                                Voici la preuve qu'il vous a montrée secrètement :
                             </p>
                        </div>
                        
                        <div className="transform scale-110 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                            <CardComponent card={investigationResult.shownCard} revealed />
                        </div>
                     </div>
                 ) : (
                     <div className="bg-slate-900/50 border border-slate-700 p-8 rounded-xl text-center space-y-4 w-full">
                        <Icons.CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Aucune Réfutation !</h3>
                        <p className="text-slate-400">
                            Personne ne possède les cartes que vous avez citées.<br/>
                            <span className="text-yellow-400 text-sm">Vos soupçons sont peut-être fondés...</span>
                        </p>
                     </div>
                 )}
                 
                 <div className="flex flex-col w-full max-w-sm gap-3 mt-4">
                    <button 
                       onClick={() => { playSound('click'); setIsNotebookOpen(true); }}
                       className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-serif tracking-widest uppercase rounded shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                       <Icons.BookOpen className="w-5 h-5" />
                       Noter dans le carnet
                    </button>

                    <button 
                       onClick={handleEndTurnFromOverlay}
                       className="w-full py-4 bg-slate-100 hover:bg-white text-slate-900 font-bold font-serif tracking-widest uppercase rounded shadow-lg transition-all"
                    >
                       Terminer le tour
                    </button>
                 </div>
             </div>
        </div>
      )}

      {/* Refutation Overlay (When opponent attacks) - ONLY if Modal is Open */}
      {isRefuting && computerHypothesis && isRefutationModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 animate-fade-in">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-90"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

            {/* STEP 1: View Hypothesis */}
            {refutationStep === 'VIEW_HYPOTHESIS' && (
              <div className="w-full max-w-4xl z-10 animate-slide-up flex flex-col items-center">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-serif text-white tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                      Hypothèse
                    </h2>
                    <p className="text-lg text-slate-400 mt-4 uppercase tracking-widest">
                       {refutingPlayerId} pense avoir trouvé...
                    </p>
                 </div>
                 
                 <div className="flex flex-wrap justify-center gap-8 mb-16">
                     <div className="transform scale-125">
                       <CardComponent card={computerHypothesis.suspect} revealed />
                     </div>
                     <div className="transform scale-125">
                       <CardComponent card={computerHypothesis.location} revealed />
                     </div>
                     <div className="transform scale-125">
                       <CardComponent card={computerHypothesis.weapon} revealed />
                     </div>
                 </div>

                 <button 
                   onClick={() => { playSound('click'); setRefutationStep('SELECT_CARD'); }}
                   className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold font-serif tracking-widest uppercase rounded-sm shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:shadow-[0_0_50px_rgba(37,99,235,0.8)] transition-all transform hover:scale-105"
                 >
                   Vérifier mes preuves
                 </button>
              </div>
            )}

            {/* STEP 2: Select Card */}
            {refutationStep === 'SELECT_CARD' && (
              <>
                {/* Top Area: Hypothesis Box (Dossier Style) */}
                <div className="w-full max-w-3xl z-10 animate-fade-in mb-8">
                   <div className="bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md">
                      {/* Header */}
                      <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="bg-red-500/10 p-2 rounded-full border border-red-500/20">
                                <Icons.Siren className="w-5 h-5 text-red-500 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-white font-serif tracking-wider text-lg leading-none">
                                    HYPOTHÈSE
                                </h3>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                                    DE <span className="text-blue-400 font-bold">{refutingPlayerId}</span>
                                </p>
                            </div>
                         </div>
                         <div className="text-[10px] font-mono text-slate-600 border border-slate-700 px-2 py-1 rounded">
                            REF-{gameState.turnCount}
                         </div>
                      </div>
                      
                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
                         {/* Suspect */}
                         <div className="flex flex-col items-center p-6 gap-3 hover:bg-white/5 transition-colors group">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 group-hover:text-blue-400">Suspect</span>
                             {(() => {
                                const Icon = (Icons as any)[computerHypothesis.suspect.iconName] || Icons.HelpCircle;
                                return <Icon className="w-8 h-8 text-slate-400 group-hover:text-slate-200 transition-colors" />;
                             })()}
                             <span className="text-base font-serif text-slate-200 text-center leading-tight">{computerHypothesis.suspect.name}</span>
                         </div>

                         {/* Location */}
                         <div className="flex flex-col items-center p-6 gap-3 hover:bg-white/5 transition-colors group">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 group-hover:text-red-400">Lieu</span>
                             {(() => {
                                const Icon = (Icons as any)[computerHypothesis.location.iconName] || Icons.HelpCircle;
                                return <Icon className="w-8 h-8 text-slate-400 group-hover:text-slate-200 transition-colors" />;
                             })()}
                             <span className="text-base font-serif text-slate-200 text-center leading-tight">{computerHypothesis.location.name}</span>
                         </div>

                         {/* Weapon */}
                         <div className="flex flex-col items-center p-6 gap-3 hover:bg-white/5 transition-colors group">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 group-hover:text-yellow-400">Arme</span>
                             {(() => {
                                const Icon = (Icons as any)[computerHypothesis.weapon.iconName] || Icons.HelpCircle;
                                return <Icon className="w-8 h-8 text-slate-400 group-hover:text-slate-200 transition-colors" />;
                             })()}
                             <span className="text-base font-serif text-slate-200 text-center leading-tight">{computerHypothesis.weapon.name}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Middle Area: Instruction */}
                <div className="w-full max-w-2xl text-center z-10 mb-8 space-y-4">
                   <p className="text-lg text-slate-200 font-serif border-b border-slate-800 pb-4 inline-block px-12 animate-pulse">
                     Sélectionnez une carte en surbrillance pour contredire {refutingPlayerId}
                   </p>
                </div>

                {/* Bottom Area: Hand */}
                <div className="flex flex-wrap justify-center gap-4 md:gap-6 z-10 max-w-6xl mb-8">
                    {gameState.players[0].hand.map(card => {
                        const isMatch = matchingRefutationCards.some(m => m.id === card.id);
                        const isSelected = selectedRefutationCard?.id === card.id;
                        
                        let glowClass = '';
                        if (isMatch) {
                           if (card.type === CardType.SUSPECT) glowClass = 'shadow-[0_0_20px_rgba(59,130,246,0.6)] border-blue-500';
                           if (card.type === CardType.LOCATION) glowClass = 'shadow-[0_0_20px_rgba(220,38,38,0.6)] border-red-600';
                           if (card.type === CardType.WEAPON) glowClass = 'shadow-[0_0_20px_rgba(234,179,8,0.6)] border-yellow-500';
                        }

                        return (
                            <div 
                                key={card.id}
                                onClick={() => {
                                   if (isMatch) {
                                      if (isSelected) {
                                          handleConfirmRefutation();
                                      } else {
                                          playSound('card_flip');
                                          setSelectedRefutationCard(card);
                                      }
                                   }
                                }}
                                className={`
                                    relative transition-all duration-300 transform rounded-lg pb-10
                                    ${isMatch ? 'cursor-pointer hover:scale-105' : 'opacity-25 grayscale blur-[1px] pointer-events-none'}
                                    ${isSelected ? 'scale-110 z-20 ring-2 ring-white ' + glowClass : ''}
                                    ${isMatch && !isSelected ? 'ring-1 ring-offset-2 ring-offset-slate-950 ' + glowClass.replace('shadow-', 'hover:shadow-') : ''}
                                `}
                            >
                                <CardComponent card={card} revealed small={false} selected={isSelected} />
                                
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1 shadow-lg animate-bounce z-30">
                                        <Icons.Check className="w-4 h-4" />
                                    </div>
                                )}

                                {/* Show Button on Matching Cards */}
                                {isMatch && (
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center z-30">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isSelected) {
                                                    handleConfirmRefutation();
                                                } else {
                                                    playSound('card_flip');
                                                    setSelectedRefutationCard(card);
                                                }
                                            }}
                                            className={`
                                                px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded shadow-lg transition-all
                                                ${isSelected 
                                                    ? 'bg-green-500 hover:bg-green-400 text-white ring-2 ring-offset-1 ring-offset-slate-900' 
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white'}
                                            `}
                                        >
                                            {isSelected ? 'Confirmer' : 'Montrer'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer: Action Button (Still here as fallback/large target) */}
                <div className="h-24 flex items-center justify-center z-10 w-full animate-slide-up">
                    {selectedRefutationCard ? (
                        <div className="flex flex-col items-center gap-4 w-full max-w-md">
                             <div className="bg-slate-900/90 px-6 py-2 rounded-full border border-blue-500/30 text-slate-300 text-sm shadow-xl">
                                Vous allez montrer <span className="text-white font-bold mx-1">{selectedRefutationCard.name}</span> à {refutingPlayerId}
                             </div>
                             <button 
                               onClick={handleConfirmRefutation}
                               className="w-full py-4 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white font-bold tracking-widest uppercase rounded-lg shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all transform hover:scale-105"
                             >
                               Montrer cette carte
                             </button>
                        </div>
                    ) : (
                        <div className="text-slate-500 font-mono text-xs uppercase tracking-widest border border-slate-800 px-4 py-2 rounded-full bg-slate-900/50">
                            En attente de sélection...
                        </div>
                    )}
                </div>
              </>
            )}
        </div>
      )}

      {/* Card Inspection Modal */}
      {viewingCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setViewingCard(null)}
        >
          <div className="relative transform transition-all scale-100 md:scale-125" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { playSound('click'); setViewingCard(null); }}
              className="absolute -top-4 -right-4 bg-slate-800 text-white p-2 rounded-full border border-slate-600 hover:bg-slate-700 hover:text-red-400 z-50 shadow-lg"
            >
              <Icons.X className="w-6 h-6" />
            </button>
            <CardComponent card={viewingCard} revealed={true} />
          </div>
        </div>
      )}

      {/* Notebook Overlay */}
      <Notebook 
        cards={cards} 
        notebook={notebook} 
        onToggle={toggleNotebookEntry}
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
      />

      {/* Chat Widget */}
      {gameState.phase === GamePhase.PLAYING && (
        <ChatWidget 
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}

      {/* Main Board Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
             <button onClick={() => { playSound('click'); onExit(); }} className="p-2 hover:bg-slate-800 rounded-full">
                <Icons.ArrowLeft className="w-5 h-5 text-slate-400" />
             </button>
             <h1 className="text-xl font-serif text-slate-100 hidden md:block">Tableau d'Enquête</h1>
          </div>
          <div className="flex space-x-4">
             <button 
               onClick={() => { playSound('click'); setIsNotebookOpen(true); }}
               className="flex items-center space-x-2 px-4 py-2 bg-slate-800 rounded hover:bg-slate-700 border border-slate-700"
             >
               <Icons.BookOpen className="w-4 h-4" />
               <span>Carnet</span>
             </button>
             <button 
               onClick={getHint}
               disabled={aiLoading}
               className="flex items-center space-x-2 px-4 py-2 bg-indigo-900/50 text-indigo-300 rounded hover:bg-indigo-900/80 border border-indigo-800/50"
             >
               <Icons.Sparkles className="w-4 h-4" />
               <span>{aiLoading ? 'Réflexion...' : 'Indice IA'}</span>
             </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide">
          
          {/* Flavor Text / Status */}
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 max-w-3xl mx-auto text-center relative overflow-hidden shadow-xl">
             <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
             <p className="font-serif italic text-lg text-slate-300">"{flavorText}"</p>
          </div>

          {/* Game Over Screen */}
          {(gameState.phase === GamePhase.GAME_OVER_WIN || gameState.phase === GamePhase.GAME_OVER_LOSE) && (
            <div className="text-center animate-fade-in space-y-6">
              <h2 className={`text-4xl font-bold font-serif ${gameState.phase === GamePhase.GAME_OVER_WIN ? 'text-green-500' : 'text-red-500'}`}>
                {gameState.phase === GamePhase.GAME_OVER_WIN ? 'AFFAIRE RÉSOLUE' : 'ÉCHEC'}
              </h2>
              <div className="flex justify-center gap-4 flex-wrap">
                {gameState.solution.map(card => (
                  <CardComponent key={card.id} card={card} revealed={true} />
                ))}
              </div>
              <button 
                onClick={() => { playSound('click'); onExit(); }}
                className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-slate-200"
              >
                Retour au Menu
              </button>
            </div>
          )}

          {/* Gameplay Area */}
          {gameState.phase === GamePhase.PLAYING && (
            <>
              {/* Opponent Zone (Displayed as a group of avatars) */}
              <div className="flex justify-center py-4 gap-8 flex-wrap">
                 {gameState.players.filter(p => p.isComputer).map((bot, idx) => {
                     // Check if this specific bot is active
                     const botGlobalIndex = idx + 1; // Assuming P0 is always user.
                     const isThisBotTurn = gameState.currentPlayerIndex === botGlobalIndex;

                     return (
                         <div key={bot.id} className="flex flex-col items-center gap-3">
                             <div className={`
                                 relative w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border-2 
                                 transition-all duration-700
                                 ${isThisBotTurn 
                                     ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110' 
                                     : 'border-slate-600 opacity-60 grayscale'}
                             `}>
                                 <Icons.Bot className={`w-8 h-8 ${isThisBotTurn ? 'text-white' : 'text-slate-500'}`} />
                                 {isThisBotTurn && (
                                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                                 )}
                             </div>
                             <div className="text-center">
                                 <span className={`text-xs uppercase tracking-widest font-bold ${isThisBotTurn ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                                     {bot.name}
                                 </span>
                                 <div className="flex space-x-1 mt-2 justify-center">
                                     {bot.hand.map((_, i) => (
                                         <div key={i} className="w-4 h-6 bg-slate-700 rounded border border-slate-600 shadow-md"></div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
              </div>

              {/* Selection Area */}
              <div className={`
                grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto transition-all duration-500
                ${isUserTurn ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale-[50%]'}
              `}>
                {/* Suspect Selector */}
                <div className="space-y-4">
                  <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm border-b border-blue-900 pb-2">Suspect</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {cards.filter(c => c.type === CardType.SUSPECT).map(card => (
                      <div key={card.id} onClick={() => { playSound('click'); setSelectedSuspect(card); }} className={`cursor-pointer border p-2 rounded transition-colors ${selectedSuspect?.id === card.id ? 'bg-blue-900/50 border-blue-500' : 'border-slate-700 hover:bg-slate-800'}`}>
                         <div className="font-bold text-xs text-slate-200">{card.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                 {/* Location Selector */}
                 <div className="space-y-4">
                  <h3 className="text-red-500 font-bold uppercase tracking-widest text-sm border-b border-red-900 pb-2">Lieu</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {cards.filter(c => c.type === CardType.LOCATION).map(card => (
                      <div key={card.id} onClick={() => { playSound('click'); setSelectedLocation(card); }} className={`cursor-pointer border p-2 rounded transition-colors ${selectedLocation?.id === card.id ? 'bg-red-900/50 border-red-500' : 'border-slate-700 hover:bg-slate-800'}`}>
                         <div className="font-bold text-xs text-slate-200">{card.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Weapon Selector */}
                 <div className="space-y-4">
                  <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-sm border-b border-yellow-900 pb-2">Arme</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {cards.filter(c => c.type === CardType.WEAPON).map(card => (
                      <div key={card.id} onClick={() => { playSound('click'); setSelectedWeapon(card); }} className={`cursor-pointer border p-2 rounded transition-colors ${selectedWeapon?.id === card.id ? 'bg-yellow-900/50 border-yellow-500' : 'border-slate-700 hover:bg-slate-800'}`}>
                         <div className="font-bold text-xs text-slate-200">{card.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons / Notifications */}
              <div className="flex flex-col items-center justify-center space-y-4 py-4 min-h-[100px]">
                 
                 {isRefuting && !isRefutationModalOpen ? (
                    // Notification Button for Pending Refutation
                    <button 
                        onClick={() => { playSound('click'); setIsRefutationModalOpen(true); }}
                        className="group relative flex items-center justify-center gap-4 px-8 py-4 bg-red-900/80 hover:bg-red-800 border-2 border-red-500 text-white rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all animate-pulse-slow w-full max-w-lg"
                    >
                         <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/20 transition-colors"></div>
                         <div className="bg-red-600 p-2 rounded-full animate-bounce">
                             <Icons.Siren className="w-6 h-6 text-white" />
                         </div>
                         <div className="text-left">
                            <div className="font-bold font-serif text-lg tracking-wider">ACTION REQUISE</div>
                            <div className="text-sm text-red-200">
                                {refutingPlayerId} a une hypothèse qui vous concerne.
                            </div>
                         </div>
                         <Icons.ChevronRight className="w-6 h-6 text-red-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                 ) : (
                    // Standard Action Buttons
                    <div className="flex items-center gap-6 w-full justify-center">
                        {/* User Avatar */}
                        <div className="flex items-center gap-3">
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                ${isUserTurn ? 'bg-blue-900 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110' : 'bg-slate-800 border-slate-600 opacity-50'}
                            `}>
                                <Icons.User className="w-6 h-6 text-white" />
                            </div>
                            {isUserTurn && <span className="text-blue-400 font-bold text-sm animate-pulse">C'EST À VOUS</span>}
                        </div>

                        {/* Buttons */}
                        <div className="flex space-x-4">
                            <button 
                            onClick={handleInvestigation}
                            disabled={!isUserTurn || !selectedSuspect || !selectedLocation || !selectedWeapon}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-1"
                            >
                            Enquêter
                            </button>
                            <button 
                            onClick={() => { playSound('click'); setIsAccusationConfirmOpen(true); }}
                            disabled={!isUserTurn || !selectedSuspect || !selectedLocation || !selectedWeapon}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded shadow-lg shadow-red-900/50 transition-all transform hover:-translate-y-1"
                            >
                            Accuser (Final)
                            </button>
                        </div>
                    </div>
                 )}
              </div>

              {/* Your Hand */}
              <div className="mt-8">
                <h3 className="text-center text-slate-400 uppercase text-xs tracking-[0.2em] mb-4">Preuves en Main</h3>
                <div className={`
                    flex flex-wrap justify-center gap-4 pb-20 transition-all duration-500
                    ${isUserTurn ? 'opacity-100' : 'opacity-80'}
                `}>
                  {userPlayer.hand.map(card => (
                    <div key={card.id} className="relative group">
                       <CardComponent 
                           card={card} 
                           small={true} 
                           onClick={() => { playSound('card_flip'); setViewingCard(card); }}
                       />
                       <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Icons.Maximize2 className="w-3 h-3 text-white" />
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Sidebar / Log Area */}
      <div className="hidden lg:flex w-80 bg-slate-900 border-l border-slate-800 flex-col">
         <div className="p-4 bg-slate-800 border-b border-slate-700 font-serif text-slate-300">Journal d'Enquête</div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
            {gameState.log.map((entry, idx) => (
              <div key={idx} className={`p-2 rounded border-l-2 ${
                entry.type === 'alert' ? 'border-red-500 bg-red-900/20' :
                entry.type === 'success' ? 'border-green-500 bg-green-900/20' :
                entry.type === 'deduction' ? 'border-blue-500 bg-blue-900/20' :
                'border-slate-500 bg-slate-800/30'
              }`}>
                <span className="opacity-50 mr-2">Tour {entry.turn}:</span>
                {entry.message}
              </div>
            ))}
            <div ref={bottomRef}></div>
         </div>
      </div>

    </div>
  );
}

export default GameBoard;
