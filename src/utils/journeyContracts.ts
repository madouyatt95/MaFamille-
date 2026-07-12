export type SharedJourneyTarget = 'budget' | 'homework' | 'vault' | 'agenda' | 'trip' | 'groceries' | 'memory';

export const resolveQuickActionFromLocation = (pathname: string, explicitAction?: string | null): string => {
  if (explicitAction) return explicitAction;
  return pathname.match(/^\/action\/([^/]+)/i)?.[1] || '';
};

export const inferSharedJourneyTarget = ({
  forced,
  text,
  fileTypes = []
}: {
  forced?: string | null;
  text: string;
  fileTypes?: string[];
}): SharedJourneyTarget => {
  if (forced === 'budget' || forced === 'receipt') return 'budget';
  if (forced === 'homework' || forced === 'school') return 'homework';
  if (forced === 'vault' || forced === 'document') return 'vault';
  if (forced === 'agenda' || forced === 'event') return 'agenda';
  if (forced === 'trip' || forced === 'travel') return 'trip';
  if (forced === 'groceries' || forced === 'shopping') return 'groceries';
  if (forced === 'memory' || forced === 'souvenir') return 'memory';

  const all = `${text} ${fileTypes.join(' ')}`.toLocaleLowerCase('fr-FR');
  if (/ticket|reçu|recu|facture|montant|total|cb|carte bancaire|paiement|receipt|invoice/.test(all)) return 'budget';
  if (/devoir|exercice|leçon|lecon|math|français|francais|histoire|géographie|geographie|cahier|classe|prof|rendre/.test(all)) return 'homework';
  if (/pdf|attestation|document|certificat|ordonnance|assurance|contrat|identité|identite|passeport|justificatif/.test(all)) return 'vault';
  if (/réservation|reservation|vol|hotel|hôtel|train|booking|billet|voyage|départ|depart|arrivée|arrivee/.test(all)) return 'trip';
  if (/rdv|rendez-vous|agenda|calendrier|événement|evenement|date|invitation/.test(all)) return 'agenda';
  if (/courses|liste|acheter|produit|panier|supermarché|supermarche|drive|lait|pain|couches/.test(all)) return 'groceries';
  if (fileTypes.some(type => type.startsWith('image/'))) return 'memory';
  return 'vault';
};
