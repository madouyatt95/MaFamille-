import {
  BookOpenCheck,
  CircleDollarSign,
  FolderLock,
  Mic,
  ReceiptText,
  ShoppingCart
} from 'lucide-react';

export const QUICK_ACTION_GUIDES = [
  {
    id: 'open-micro',
    label: 'Micro principal',
    description: 'Ouvre directement le micro principal, prêt à recevoir une commande familiale.',
    phrase: 'Ouvre le micro avec MyFamily+',
    icon: Mic,
    color: '#FF4D6D'
  },
  {
    id: 'paid',
    label: 'J’ai payé',
    description: 'Ouvre une dépense préremplie à vérifier avant son enregistrement.',
    phrase: 'J’ai payé avec MyFamily+',
    icon: CircleDollarSign,
    color: '#00D26A'
  },
  {
    id: 'scan-receipt',
    label: 'Scanner un ticket',
    description: 'Propose l’appareil photo, la photothèque ou un fichier, puis lit le ticket sur l’appareil.',
    phrase: 'Scanner un ticket avec MyFamily+',
    icon: ReceiptText,
    color: '#FFB020'
  },
  {
    id: 'scan-homework',
    label: 'Scanner un devoir',
    description: 'Importe un devoir et prépare son contenu après lecture locale.',
    phrase: 'Scanner un devoir avec MyFamily+',
    icon: BookOpenCheck,
    color: '#4F8CFF'
  },
  {
    id: 'add-grocery',
    label: 'Ajouter aux courses',
    description: 'Ouvre les courses avec le micro prêt à ajouter les produits dictés.',
    phrase: 'Ajouter aux courses avec MyFamily+',
    icon: ShoppingCart,
    color: '#9E94FF'
  },
  {
    id: 'open-vault',
    label: 'Ouvrir le coffre-fort',
    description: 'Ouvre directement les documents et démarches protégés du foyer.',
    phrase: 'Ouvre le coffre-fort avec MyFamily+',
    icon: FolderLock,
    color: '#37C9FF'
  }
] as const;
