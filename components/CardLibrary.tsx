
import React, { useState } from 'react';
import { Card, CardType, AppView } from '../types';
import CardComponent from './CardComponent';
import { ArrowLeft, Plus, X, Save, Upload, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useSound } from '../contexts/SoundContext';

interface CardLibraryProps {
  cards: Card[];
  onAddCard: (card: Card) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onChangeView: (view: AppView) => void;
}

const CardLibrary: React.FC<CardLibraryProps> = ({ cards, onAddCard, onEditCard, onDeleteCard, onChangeView }) => {
  const { playSound } = useSound();
  const [activeTab, setActiveTab] = useState<CardType>(CardType.SUSPECT);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newJpName, setNewJpName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<CardType>(CardType.SUSPECT);
  const [newImageUrl, setNewImageUrl] = useState('');

  const resetForm = () => {
    setNewName('');
    setNewJpName('');
    setNewDesc('');
    setNewType(activeTab);
    setNewImageUrl('');
    setEditingCard(null);
  };

  const handleOpenCreator = () => {
    playSound('click');
    setEditingCard(null);
    setNewType(activeTab); // Default to current tab
    setNewName('');
    setNewJpName('');
    setNewDesc('');
    setNewImageUrl('');
    setIsCreatorOpen(true);
  };

  const handleEditClick = (card: Card) => {
    playSound('click');
    setEditingCard(card);
    setNewName(card.name);
    setNewJpName(card.jpName);
    setNewDesc(card.description);
    setNewType(card.type);
    setNewImageUrl(card.imageUrl || '');
    setIsCreatorOpen(true);
  };

  const handleDeleteClick = (cardId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm("Êtes-vous sûr de vouloir supprimer cette carte ?")) {
          onDeleteCard(cardId);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDesc) return;

    if (editingCard) {
        // Edit Mode
        const updatedCard: Card = {
            ...editingCard,
            name: newName,
            jpName: newJpName || 'カスタム',
            description: newDesc,
            type: newType,
            imageUrl: newImageUrl || undefined
        };
        onEditCard(updatedCard);
    } else {
        // Create Mode
        const newCard: Card = {
            id: `custom-${Date.now()}`,
            name: newName,
            jpName: newJpName || 'カスタム',
            description: newDesc,
            type: newType,
            iconName: 'HelpCircle', // Default fallback
            imageUrl: newImageUrl || undefined
        };
        onAddCard(newCard);
    }

    setIsCreatorOpen(false);
    resetForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageUrl(reader.result as string);
        playSound('click');
      };
      reader.readAsDataURL(file);
    }
  };

  // Preview Object
  const previewCard: Card = {
    id: 'preview',
    name: newName || 'Nom de la carte',
    jpName: newJpName || '...',
    description: newDesc || 'Description de la carte...',
    type: newType,
    iconName: 'HelpCircle',
    imageUrl: newImageUrl
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="h-20 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onChangeView(AppView.MENU)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-2xl font-serif text-white">Dossiers & Preuves</h1>
        </div>
        
        {/* Mock Action */}
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm hover:bg-slate-700 transition-colors text-slate-400 opacity-50 cursor-not-allowed">
          <span>{cards.length} Cartes dans la base</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Tabs */}
        <div className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 space-y-2">
          <h2 className="hidden md:block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Catégories</h2>
          {[CardType.SUSPECT, CardType.LOCATION, CardType.WEAPON].map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`
                w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between
                ${activeTab === type 
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <span className="hidden md:inline font-serif">
                {type === CardType.SUSPECT ? 'Suspects' : type === CardType.LOCATION ? 'Lieux' : 'Armes'}
              </span>
              <span className="md:hidden">
                {type === CardType.SUSPECT ? 'S' : type === CardType.LOCATION ? 'L' : 'A'}
              </span>
              {activeTab === type && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
            {/* Create New Card Button */}
            <div 
              onClick={handleOpenCreator}
              className="w-36 h-56 md:w-48 md:h-72 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-600 hover:text-white hover:border-blue-500 hover:bg-slate-900/50 cursor-pointer transition-all group"
            >
              <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-600 transition-colors mb-4">
                 <Plus className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wide">Créer une carte</span>
            </div>

            {cards.filter(c => c.type === activeTab).map(card => (
              <div key={card.id} className="relative group">
                  <CardComponent card={card} revealed={true} />
                  
                  {/* Edit/Delete Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg backdrop-blur-sm">
                      <button 
                        onClick={() => handleEditClick(card)}
                        className="p-2 bg-blue-600 rounded-full hover:bg-blue-500 text-white shadow-lg transform hover:scale-110 transition-all"
                        title="Modifier"
                      >
                          <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(card.id, e)}
                        className="p-2 bg-red-600 rounded-full hover:bg-red-500 text-white shadow-lg transform hover:scale-110 transition-all"
                        title="Supprimer"
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATOR MODAL */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left: Preview */}
            <div className="w-full md:w-1/3 bg-slate-950 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 relative">
               <div className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Aperçu</div>
               <div className="transform scale-110">
                 <CardComponent card={previewCard} revealed={true} />
               </div>
               <div className="mt-8 text-center px-4">
                  <p className="text-xs text-slate-500 italic">
                    "La carte apparaîtra ainsi dans le jeu."
                  </p>
               </div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
               <div className="flex justify-between items-start mb-6">
                 <h2 className="text-2xl font-serif text-white">
                    {editingCard ? 'Modifier la preuve' : 'Créer une nouvelle preuve'}
                 </h2>
                 <button onClick={() => setIsCreatorOpen(false)} className="text-slate-400 hover:text-white">
                   <X className="w-6 h-6" />
                 </button>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Type</label>
                        <select 
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as CardType)}
                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"
                        >
                           <option value={CardType.SUSPECT}>Suspect</option>
                           <option value={CardType.LOCATION}>Lieu</option>
                           <option value={CardType.WEAPON}>Arme</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Nom (FR)</label>
                        <input 
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Ex: Majordome"
                          className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none placeholder-slate-600"
                          maxLength={20}
                          required
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Nom Japonais (Style)</label>
                      <input 
                        type="text" 
                        value={newJpName}
                        onChange={(e) => setNewJpName(e.target.value)}
                        placeholder="Ex: 執事 (Optionnel)"
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none placeholder-slate-600"
                        maxLength={10}
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Description</label>
                      <textarea 
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Une brève description pour l'ambiance..."
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none placeholder-slate-600 resize-none h-20"
                        maxLength={60}
                        required
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Image de la carte</label>
                      
                      <div className="space-y-3">
                          {/* URL Input */}
                          <div className="relative">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                                  <LinkIcon className="w-4 h-4" />
                              </div>
                              <input 
                                  type="text" 
                                  value={newImageUrl}
                                  onChange={(e) => setNewImageUrl(e.target.value)}
                                  placeholder="URL de l'image (https://...)"
                                  className="w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-700 rounded text-white focus:border-blue-500 outline-none placeholder-slate-600 text-sm"
                              />
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 uppercase tracking-widest justify-center">
                              <span>— OU —</span>
                          </div>

                          {/* File Upload */}
                          <div className="relative group">
                              <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full p-4 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center bg-slate-800/50 group-hover:border-blue-500 group-hover:bg-slate-800 transition-all">
                                  <Upload className="w-6 h-6 text-slate-400 mb-2 group-hover:text-blue-400" />
                                  <span className="text-sm text-slate-400 group-hover:text-white">
                                      Cliquez pour téléverser une image
                                  </span>
                                  <span className="text-xs text-slate-600 mt-1">
                                      JPG, PNG (Max 2Mo recommandé)
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-4">
                     <button 
                       type="button"
                       onClick={() => setIsCreatorOpen(false)}
                       className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
                     >
                       Annuler
                     </button>
                     <button 
                       type="submit"
                       className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg shadow-blue-900/20 flex items-center gap-2"
                     >
                       <Save className="w-4 h-4" />
                       {editingCard ? 'Modifier' : 'Enregistrer'}
                     </button>
                  </div>
               </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CardLibrary;
