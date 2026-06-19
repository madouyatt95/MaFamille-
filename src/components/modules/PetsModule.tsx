import React, { useState } from 'react';
import { Coins, Dog, FileText, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import type { Account, DocumentFile, PetRecord, Transaction } from '../../types';

interface PetsModuleProps {
  pets: PetRecord[];
  setPets: React.Dispatch<React.SetStateAction<PetRecord[]>>;
  documents: DocumentFile[];
  accounts: Account[];
  isParent: boolean;
  onAddTransaction?: (transaction: Partial<Transaction>) => void;
  onAddEventDirect?: (event: Record<string, unknown>) => void;
}

const parseDate = (value?: string) => {
  if (!value || value.startsWith('Non renseign')) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string) => {
  const parsed = parseDate(value);
  return parsed
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
    : 'À renseigner';
};

const vaccineNeedsAttention = (value?: string) => {
  const parsed = parseDate(value);
  return !parsed || parsed.getTime() - Date.now() <= 30 * 86400000;
};

export const PetsModule: React.FC<PetsModuleProps> = ({
  pets,
  setPets,
  documents,
  accounts,
  isParent,
  onAddTransaction,
  onAddEventDirect
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Chien');
  const [lastVaccine, setLastVaccine] = useState('');
  const [nextVaccine, setNextVaccine] = useState('');
  const [appointment, setAppointment] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Nourriture');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');

  const handleAddPet = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const pet: PetRecord = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      species,
      lastVaccine: lastVaccine || 'Non renseigné',
      nextVaccine: nextVaccine || 'Non renseigné',
      vetAppointment: appointment || undefined
    };
    setPets(current => [...current, pet]);

    if (nextVaccine && onAddEventDirect) {
      onAddEventDirect({ title: `💉 Vaccin : ${pet.name}`, type: 'other', dateTime: nextVaccine, time: '10:00', done: false });
    }
    if (appointment && onAddEventDirect) {
      onAddEventDirect({ title: `🐶 RDV vétérinaire : ${pet.name}`, type: 'other', dateTime: appointment, time: '14:00', done: false });
    }

    setName('');
    setLastVaccine('');
    setNextVaccine('');
    setAppointment('');
  };

  const linkDocument = (pet: PetRecord) => {
    const available = documents.filter(document => !(pet.documentIds || []).includes(document.id));
    if (available.length === 0) {
      alert('Aucun nouveau document disponible dans le coffre-fort.');
      return;
    }
    const choice = window.prompt(`Sélectionnez un document :\n\n${available.map((document, index) => `${index + 1}. ${document.name}`).join('\n')}`);
    if (!choice) return;
    const selected = available[Number(choice) - 1];
    if (!selected) return;
    setPets(current => current.map(item => item.id === pet.id
      ? { ...item, documentIds: [...(item.documentIds || []), selected.id] }
      : item));
  };

  const addExpense = (event: React.FormEvent, pet: PetRecord) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !onAddTransaction) return;
    onAddTransaction({
      amount,
      type: 'expense',
      category: 'Animaux',
      subCategory: expenseCategory,
      title: `Animaux - ${pet.name} : ${expenseCategory}`,
      date: new Date().toISOString().split('T')[0],
      accountId: expenseAccountId || undefined,
      moduleSource: 'animaux',
      comment: `Frais pour ${pet.name} (${expenseCategory})`
    });
    setExpenseAmount('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-white">Suivi Animaux</h2>
        <p className="text-xs text-white/50">Vaccins, rendez-vous, documents, poids et frais</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
          <strong className="block text-lg font-black text-white">{pets.length}</strong>
          <span className="text-[9px] font-bold text-white/40">compagnons</span>
        </div>
        <div className="rounded-2xl border border-[#FFB020]/15 bg-[#FFB020]/5 p-3">
          <strong className="block text-lg font-black text-[#FFB020]">{pets.filter(pet => vaccineNeedsAttention(pet.nextVaccine)).length}</strong>
          <span className="text-[9px] font-bold text-white/40">vaccins à vérifier</span>
        </div>
        <div className="rounded-2xl border border-[#00D26A]/15 bg-[#00D26A]/5 p-3">
          <strong className="block text-lg font-black text-[#00D26A]">{pets.filter(pet => Boolean(pet.vetAppointment)).length}</strong>
          <span className="text-[9px] font-bold text-white/40">rendez-vous</span>
        </div>
      </div>

      {pets.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 p-7 text-center">
          <Dog className="mx-auto mb-3 h-7 w-7 text-white/20" />
          <p className="text-xs font-bold text-white/60">Aucun animal suivi</p>
          <p className="mt-1 text-[10px] text-white/35">Ajoutez un compagnon pour centraliser son suivi.</p>
        </div>
      )}

      {pets.map(pet => (
        <article key={pet.id} className="glass-panel space-y-4 rounded-[28px] border border-white/8 p-5">
          <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/5 bg-[#00D26A]/10 p-2.5 text-[#00D26A]"><Dog className="h-5 w-5" /></div>
              <div><h3 className="text-sm font-bold text-white">{pet.name}</h3><p className="text-[10px] font-bold uppercase text-white/40">{pet.species}</p></div>
            </div>
            {isParent && (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  title="Modifier"
                  onClick={() => {
                    const nextName = window.prompt("Modifier le nom de l'animal :", pet.name);
                    if (!nextName) return;
                    const nextSpecies = window.prompt("Modifier l'espèce ou la race :", pet.species);
                    if (!nextSpecies) return;
                    setPets(current => current.map(item => item.id === pet.id ? { ...item, name: nextName, species: nextSpecies } : item));
                  }}
                  className="rounded-xl bg-white/5 p-2 text-white/65 hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Supprimer"
                  onClick={() => window.confirm('Supprimer ce compagnon ?') && setPets(current => current.filter(item => item.id !== pet.id))}
                  className="rounded-xl bg-red-500/10 p-2 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/3 p-3"><span className="text-[9px] text-white/40">Dernier vaccin</span><strong className="mt-1 block text-white">{formatDate(pet.lastVaccine)}</strong></div>
            <div className="rounded-2xl bg-white/3 p-3"><span className="text-[9px] text-white/40">Prochain vaccin</span><strong className="mt-1 block text-[#FFB020]">{formatDate(pet.nextVaccine)}</strong></div>
            {pet.vetAppointment && <div className="col-span-2 rounded-2xl bg-white/3 p-3"><span className="text-[9px] text-white/40">Rendez-vous vétérinaire</span><strong className="mt-1 block text-white">{formatDate(pet.vetAppointment)}</strong></div>}
          </div>

          <div className="space-y-2 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40"><Scale className="h-4 w-4" />Suivi de poids</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(pet.weightHistory || []).map((entry, index) => (
                <div key={`${entry.date}-${index}`} className="min-w-[72px] rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-center">
                  <span className="block text-[9px] text-white/40">{entry.date}</span><strong className="text-xs text-white">{entry.weight} kg</strong>
                </div>
              ))}
              {(pet.weightHistory || []).length === 0 && <span className="text-[10px] italic text-white/30">Aucune pesée.</span>}
            </div>
            {isParent && (
              <button
                type="button"
                onClick={() => {
                  const value = window.prompt('Poids en kg :');
                  if (!value || !Number.isFinite(Number(value))) return;
                  setPets(current => current.map(item => item.id === pet.id
                    ? { ...item, weightHistory: [...(item.weightHistory || []), { date: new Date().toLocaleDateString('fr-FR'), weight: Number(value) }] }
                    : item));
                }}
                className="text-[10px] font-black text-[#00D26A]"
              >
                + Enregistrer une pesée
              </button>
            )}
          </div>

          <div className="space-y-2 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40"><FileText className="h-4 w-4" />Documents liés</div>
            {documents.filter(document => (pet.documentIds || []).includes(document.id)).map(document => (
              <a key={document.id} href={document.fileUrl || document.fileBase64} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white">
                <span>{document.name}</span><span className="text-[9px] font-bold text-[#9E94FF]">Consulter</span>
              </a>
            ))}
            {isParent && <button type="button" onClick={() => linkDocument(pet)} className="text-[10px] font-black text-[#9E94FF]">+ Lier un document</button>}
          </div>

          {isParent && (
            <form onSubmit={event => addExpense(event, pet)} className="space-y-2 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40"><Coins className="h-4 w-4" />Ajouter un frais</div>
              <div className="grid grid-cols-3 gap-2">
                <select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)} className="rounded-xl border border-white/8 bg-[#07111F] px-2 py-2 text-[10px] text-white">
                  <option>Nourriture</option><option>Vétérinaire</option><option>Médicaments</option><option>Jouets</option><option>Autre</option>
                </select>
                <input type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} placeholder="Montant" className="rounded-xl border border-white/8 bg-white/5 px-2 py-2 text-[10px] text-white" />
                <select value={expenseAccountId} onChange={event => setExpenseAccountId(event.target.value)} className="rounded-xl border border-white/8 bg-[#07111F] px-2 py-2 text-[10px] text-white">
                  <option value="">Compte...</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full rounded-xl bg-[#00D26A] py-2 text-[10px] font-black text-white">Enregistrer le frais</button>
            </form>
          )}
        </article>
      ))}

      {isParent && (
        <form onSubmit={handleAddPet} className="glass-panel space-y-4 rounded-[28px] border border-white/8 p-5">
          <div className="flex items-center gap-2 text-[#00D26A]"><Plus className="h-4 w-4" /><span className="text-[10px] font-black uppercase">Ajouter un animal</span></div>
          <div className="grid grid-cols-2 gap-3">
            <input required value={name} onChange={event => setName(event.target.value)} placeholder="Nom" className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-xs text-white" />
            <select value={species} onChange={event => setSpecies(event.target.value)} className="rounded-xl border border-white/8 bg-[#07111F] px-3 py-2.5 text-xs text-white"><option>Chien</option><option>Chat</option><option>Lapin</option><option>Oiseau</option><option>Autre</option></select>
            <label className="text-[9px] font-bold text-white/40">Dernier vaccin<input type="date" value={lastVaccine} onChange={event => setLastVaccine(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[9px] font-bold text-white/40">Prochain vaccin<input type="date" value={nextVaccine} onChange={event => setNextVaccine(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
            <label className="col-span-2 text-[9px] font-bold text-white/40">Rendez-vous vétérinaire<input type="date" value={appointment} onChange={event => setAppointment(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
          </div>
          <button type="submit" className="w-full rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] py-3 text-xs font-black text-white">Enregistrer l’animal</button>
        </form>
      )}
    </div>
  );
};
