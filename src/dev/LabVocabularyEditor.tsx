import { useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { validateVocabularyEntry, type FamilyVocabularyEntry } from '../ai/local/familyVocabulary';
import { saveLabVocabulary } from './labVocabularyStorage';

export function LabVocabularyEditor({ scope, entries, onChange }: { scope: string; entries: FamilyVocabularyEntry[]; onChange: (entries: FamilyVocabularyEntry[]) => void }) {
  const [phrase, setPhrase] = useState('');
  const [product, setProduct] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('');
  const reset = () => { setPhrase(''); setProduct(''); setEditing(null); };
  return <details className="mt-4 border-t border-family-border pt-4">
    <summary className="cursor-pointer text-sm font-bold">Vocabulaire local ({entries.length})</summary>
    <p className="mt-2 text-xs text-family-text-secondary">Raccourcis du profil de test, conservés sur cet appareil. Aucune synchronisation avec le foyer réel.</p>
    <ul className="mt-3 space-y-2" aria-label="Raccourcis enregistrés">
      {entries.map((entry, index) => <li key={entry.phrase} className="flex items-center gap-2 border-b border-family-border pb-2 text-xs">
        <span className="min-w-0 flex-1 break-words"><strong>{entry.phrase}</strong><br />{entry.product}</span>
        <button type="button" title={`Modifier ${entry.phrase}`} aria-label={`Modifier ${entry.phrase}`} onClick={() => { setEditing(index); setPhrase(entry.phrase); setProduct(entry.product); }} className="flex h-10 w-10 shrink-0 items-center justify-center"><Pencil size={16} /></button>
        <button type="button" title={`Supprimer ${entry.phrase}`} aria-label={`Supprimer ${entry.phrase}`} onClick={() => {
          const next = entries.filter((_, position) => position !== index);
          if (saveLabVocabulary(scope, next, true)) { onChange(next); reset(); setNotice('Raccourci supprimé de cet appareil.'); }
          else setNotice('Stockage indisponible. Suppression non enregistrée.');
        }} className="flex h-10 w-10 shrink-0 items-center justify-center"><Trash2 size={16} /></button>
      </li>)}
    </ul>
    <form className="mt-3 space-y-3" onSubmit={event => {
      event.preventDefault();
      const entry = validateVocabularyEntry(phrase, product);
      if (!entry) { setNotice('Indiquez un raccourci comme « lait habituel » et un seul produit, sans quantité ni commande.'); return; }
      if (entries.some((item, index) => index !== editing && item.phrase === entry.phrase)) { setNotice('Ce raccourci existe déjà. Modifiez-le directement.'); return; }
      const next = editing === null ? [...entries, entry] : entries.map((item, index) => index === editing ? entry : item);
      if (!saveLabVocabulary(scope, next, consent)) { setNotice('Enregistrement impossible : accord requis, stockage indisponible ou limite de 50 raccourcis.'); return; }
      onChange(next); reset(); setNotice('Raccourci enregistré sur cet appareil. Le dialogue précédent a été fermé.');
    }}>
      <label className="block text-xs">Raccourci<input aria-label="Raccourci" maxLength={70} value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="lait habituel" className="app-field mt-1 min-h-10 w-full rounded-lg px-2" /></label>
      <label className="block text-xs">Produit choisi<input aria-label="Produit choisi" maxLength={70} value={product} onChange={event => setProduct(event.target.value)} placeholder="lait sans lactose" className="app-field mt-1 min-h-10 w-full rounded-lg px-2" /></label>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Enregistrer ces raccourcis sur cet appareil de test</label>
      <div className="flex gap-2">
        <button type="submit" disabled={!consent} className="flex min-h-10 items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={16} />{editing === null ? 'Enregistrer le raccourci' : 'Enregistrer la modification'}</button>
        {editing !== null && <button type="button" title="Annuler la modification du raccourci" aria-label="Annuler la modification du raccourci" onClick={reset} className="flex h-10 w-10 items-center justify-center"><X size={16} /></button>}
      </div>
    </form>
    {notice && <p className="mt-2 text-xs text-family-warning" role="status">{notice}</p>}
  </details>;
}
