import { Card, CardType } from './types';

export const CARDS: Card[] = [
  // Suspects (Blue)
  { id: 's1', name: 'Jeune Détective', type: CardType.SUSPECT, description: 'Un garçon perspicace à lunettes.', iconName: 'Glasses', jpName: '少年探偵' },
  { id: 's2', name: 'Détective Lycéen', type: CardType.SUSPECT, description: 'Un célèbre détective adolescent.', iconName: 'Search', jpName: '高校生探偵' },
  { id: 's3', name: 'Fille au Karaté', type: CardType.SUSPECT, description: 'Une amie d\'enfance forte et loyale.', iconName: 'User', jpName: '空手女子' },
  { id: 's4', name: 'Détective Dormeur', type: CardType.SUSPECT, description: 'Un homme qui résout des affaires en dormant.', iconName: 'Armchair', jpName: '眠りの小五郎' },
  { id: 's5', name: 'Détective d\'Osaka', type: CardType.SUSPECT, description: 'Un détective au sang chaud venu de l\'ouest.', iconName: 'MapPin', jpName: '西の探偵' },
  { id: 's6', name: 'Voleur Fantôme', type: CardType.SUSPECT, description: 'Un magicien qui vole au clair de lune.', iconName: 'Moon', jpName: '怪盗' },
  { id: 's7', name: 'Scientifique Mystérieuse', type: CardType.SUSPECT, description: 'Créatrice de drogues étranges.', iconName: 'FlaskConical', jpName: '科学者' },
  { id: 's8', name: 'Héritière Énergique', type: CardType.SUSPECT, description: 'Une riche héritière à la voix forte.', iconName: 'Gem', jpName: '令嬢' },

  // Locations (Red)
  { id: 'l1', name: 'Agence de Détective', type: CardType.LOCATION, description: 'Un bureau poussiéreux au-dessus d\'un café.', iconName: 'Briefcase', jpName: '探偵事務所' },
  { id: 'l2', name: 'Lycée', type: CardType.LOCATION, description: 'Le lycée local de Teitan.', iconName: 'GraduationCap', jpName: '高校' },
  { id: 'l3', name: 'Villa Isolée', type: CardType.LOCATION, description: 'Une villa enneigée dans les montagnes.', iconName: 'Home', jpName: '山荘' },
  { id: 'l4', name: 'Train à Grande Vitesse', type: CardType.LOCATION, description: 'Le train express pour Kyoto.', iconName: 'Train', jpName: '新幹線' },
  { id: 'l5', name: 'Hall du Musée', type: CardType.LOCATION, description: 'Exposition du Joyau Bleu.', iconName: 'Landmark', jpName: '博物館' },
  { id: 'l6', name: 'Restaurant', type: CardType.LOCATION, description: 'Le restaurant familial Danny\'s.', iconName: 'Utensils', jpName: 'レストラン' },
  { id: 'l7', name: 'Entrepôt Sombre', type: CardType.LOCATION, description: 'Un site de stockage abandonné.', iconName: 'Container', jpName: '倉庫' },
  { id: 'l8', name: 'Parc d\'Attractions', type: CardType.LOCATION, description: 'L\'entrée de Tropical Land.', iconName: 'FerrisWheel', jpName: '遊園地' },

  // Weapons (Yellow)
  { id: 'w1', name: 'Couteau', type: CardType.WEAPON, description: 'Un couteau de cuisine tranchant.', iconName: 'Sword', jpName: 'ナイフ' },
  { id: 'w2', name: 'Revolver', type: CardType.WEAPON, description: 'Un Nambu standard de la police.', iconName: 'Target', jpName: '拳銃' },
  { id: 'w3', name: 'Corde', type: CardType.WEAPON, description: 'Une corde d\'escalade solide.', iconName: 'Lasso', jpName: 'ロープ' },
  { id: 'w4', name: 'Fiole de Poison', type: CardType.WEAPON, description: 'Un dérivé d\'Apto-toxine.', iconName: 'Skull', jpName: '毒薬' },
  { id: 'w5', name: 'Barre de Fer', type: CardType.WEAPON, description: 'Un lourd tuyau en métal.', iconName: 'Hammer', jpName: '鉄パイプ' },
  { id: 'w6', name: 'Ciseaux', type: CardType.WEAPON, description: 'Des ciseaux de bureau pointus.', iconName: 'Scissors', jpName: 'ハサミ' },
  { id: 'w7', name: 'Tournevis', type: CardType.WEAPON, description: 'Un outil standard.', iconName: 'Wrench', jpName: 'ドライバー' },
  { id: 'w8', name: 'Bouteille en Verre', type: CardType.WEAPON, description: 'Une bouteille de vin brisée.', iconName: 'Wine', jpName: 'ガラス瓶' },
];