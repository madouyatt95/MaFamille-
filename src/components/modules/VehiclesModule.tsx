import React, { useState } from 'react';
import { Car, Coins, Plus, Trash2, Pencil, Gauge } from 'lucide-react';
import type { Account, Transaction, Vehicle } from '../../types';

interface VehiclesModuleProps {
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  accounts: Account[];
  transactions: Transaction[];
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

const deadlineStatus = (value?: string) => {
  const parsed = parseDate(value);
  if (!parsed) return { label: 'À renseigner', classes: 'border-white/10 bg-white/5 text-white/45' };
  const days = Math.ceil((parsed.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expiré', classes: 'border-red-500/20 bg-red-500/10 text-red-400' };
  if (days <= 30) return { label: `${days} j`, classes: 'border-[#FFB020]/20 bg-[#FFB020]/10 text-[#FFB020]' };
  return { label: 'À jour', classes: 'border-[#00D26A]/20 bg-[#00D26A]/10 text-[#00D26A]' };
};

export const VehiclesModule: React.FC<VehiclesModuleProps> = ({
  vehicles,
  setVehicles,
  accounts,
  transactions,
  isParent,
  onAddTransaction,
  onAddEventDirect
}) => {
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [technicalControl, setTechnicalControl] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [nextService, setNextService] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Essence');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [evaluationTime] = useState(() => Date.now());

  const annualCost = transactions
    .filter(transaction => {
      const date = new Date(transaction.date);
      return transaction.type === 'expense'
        && (transaction.category === 'Véhicules' || transaction.moduleSource === 'vehicules')
        && Number.isFinite(date.getTime())
        && evaluationTime - date.getTime() <= 365 * 86400000;
    })
    .reduce((total, transaction) => total + transaction.amount, 0);

  const addReminder = (title: string, dateTime: string) => {
    if (!dateTime || !onAddEventDirect) return;
    onAddEventDirect({ title, type: 'other', dateTime, time: '09:00', done: false });
  };

  const handleAddVehicle = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !plate.trim()) return;

    const vehicle: Vehicle = {
      id: `v-${Date.now()}`,
      name: name.trim(),
      plate: plate.trim().toUpperCase(),
      mileage: Math.max(0, Number(mileage) || 0),
      technicalControl: technicalControl || 'Non renseigné',
      insuranceExpiry: insuranceExpiry || 'Non renseignée',
      lastService: 'Non renseignée',
      nextService: nextService || 'Non renseignée'
    };

    setVehicles(current => [...current, vehicle]);
    addReminder(`🚗 CT : ${vehicle.name}`, technicalControl);
    addReminder(`🛡️ Assurance : ${vehicle.name}`, insuranceExpiry);
    addReminder(`🔧 Révision : ${vehicle.name}`, nextService);
    setName('');
    setPlate('');
    setMileage('');
    setTechnicalControl('');
    setInsuranceExpiry('');
    setNextService('');
  };

  const handleAddExpense = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !onAddTransaction) return;
    onAddTransaction({
      amount,
      type: 'expense',
      category: 'Véhicules',
      subCategory: expenseCategory,
      title: `Véhicule : ${expenseCategory}`,
      date: new Date().toISOString().split('T')[0],
      accountId: expenseAccountId || undefined,
      moduleSource: 'vehicules'
    });
    setExpenseAmount('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-white">Gestion Véhicules</h2>
        <p className="text-xs text-white/50">Entretiens, contrôles, assurances et frais</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/6 bg-white/4 p-3">
          <strong className="block text-lg font-black text-white">{vehicles.length}</strong>
          <span className="text-[9px] font-bold text-white/40">véhicules</span>
        </div>
        <div className="rounded-2xl border border-[#FFB020]/15 bg-[#FFB020]/5 p-3">
          <strong className="block text-lg font-black text-[#FFB020]">
            {vehicles.filter(vehicle => deadlineStatus(vehicle.insuranceExpiry).label !== 'À jour').length}
          </strong>
          <span className="text-[9px] font-bold text-white/40">à vérifier</span>
        </div>
        <div className="rounded-2xl border border-[#4F8CFF]/15 bg-[#4F8CFF]/5 p-3">
          <strong className="block text-lg font-black text-[#4F8CFF]">
            {vehicles.reduce((sum, vehicle) => sum + (vehicle.mileage || 0), 0).toLocaleString('fr-FR')}
          </strong>
          <span className="text-[9px] font-bold text-white/40">km suivis</span>
        </div>
      </div>

      {vehicles.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/3 p-7 text-center">
          <Car className="mx-auto mb-3 h-7 w-7 text-white/20" />
          <p className="text-xs font-bold text-white/60">Aucun véhicule enregistré</p>
          <p className="mt-1 text-[10px] text-white/35">Ajoutez le premier véhicule pour suivre ses échéances.</p>
        </div>
      )}

      <div className="space-y-4">
        {vehicles.map(vehicle => {
          const insurance = deadlineStatus(vehicle.insuranceExpiry);
          const control = deadlineStatus(vehicle.technicalControl);
          const service = deadlineStatus(vehicle.nextService);
          return (
            <article key={vehicle.id} className="glass-panel space-y-4 rounded-[28px] border border-white/8 p-5">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-white/5 bg-[#4F8CFF]/10 p-2.5 text-[#4F8CFF]"><Car className="h-5 w-5" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{vehicle.name}</h3>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">{vehicle.plate}</p>
                  </div>
                </div>
                {isParent && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      title="Modifier le véhicule"
                      onClick={() => {
                        const nextName = window.prompt('Modifier le modèle :', vehicle.name);
                        if (!nextName) return;
                        const nextPlate = window.prompt("Modifier la plaque d'immatriculation :", vehicle.plate);
                        if (!nextPlate) return;
                        setVehicles(current => current.map(item => item.id === vehicle.id ? { ...item, name: nextName, plate: nextPlate.toUpperCase() } : item));
                      }}
                      className="rounded-xl bg-white/5 p-2 text-white/65 hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Supprimer le véhicule"
                      onClick={() => window.confirm('Supprimer ce véhicule ?') && setVehicles(current => current.filter(item => item.id !== vehicle.id))}
                      className="rounded-xl bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Assurance', vehicle.insuranceExpiry, insurance],
                  ['Contrôle technique', vehicle.technicalControl, control],
                  ['Prochaine révision', vehicle.nextService, service]
                ].map(([label, value, status]) => (
                  <div key={String(label)} className="rounded-2xl bg-white/3 p-3">
                    <span className="text-[9px] font-bold text-white/40">{String(label)}</span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <strong className="text-[10px] text-white">{formatDate(String(value))}</strong>
                      <span className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[8px] font-black ${typeof status === 'object' ? status.classes : ''}`}>
                        {typeof status === 'object' ? status.label : ''}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="rounded-2xl bg-white/3 p-3">
                  <span className="text-[9px] font-bold text-white/40">Kilométrage</span>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <strong className="text-xs text-[#4F8CFF]">{(vehicle.mileage || 0).toLocaleString('fr-FR')} km</strong>
                    {isParent && (
                      <button
                        type="button"
                        title="Mettre à jour le kilométrage"
                        onClick={() => {
                          const next = window.prompt('Nouveau kilométrage :', String(vehicle.mileage || 0));
                          if (next === null || !Number.isFinite(Number(next))) return;
                          setVehicles(current => current.map(item => item.id === vehicle.id ? { ...item, mileage: Math.max(0, Number(next)) } : item));
                        }}
                        className="text-[#4F8CFF]"
                      >
                        <Gauge className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {isParent && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="glass-panel rounded-[28px] border border-[#4F8CFF]/20 bg-[#4F8CFF]/5 p-5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4F8CFF]">Dépenses sur 365 jours</span>
            <strong className="mt-4 block text-3xl font-black text-white">{annualCost.toFixed(2)} €</strong>
            <p className="mt-1 text-[10px] leading-relaxed text-white/40">Carburant, péages, entretien et assurance.</p>
          </div>
          <form onSubmit={handleAddExpense} className="glass-panel space-y-3 rounded-[28px] border border-white/8 p-5">
            <div className="flex items-center gap-2 text-[#4F8CFF]"><Coins className="h-4 w-4" /><span className="text-[10px] font-black uppercase">Ajouter un frais</span></div>
            <div className="grid grid-cols-2 gap-2">
              <select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)} className="rounded-xl border border-white/8 bg-[#07111F] px-3 py-2 text-xs text-white">
                <option>Essence</option><option>Péage</option><option>Maintenance</option><option>Assurance</option><option>Autre</option>
              </select>
              <input type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={event => setExpenseAmount(event.target.value)} placeholder="Montant" className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" />
            </div>
            <select value={expenseAccountId} onChange={event => setExpenseAccountId(event.target.value)} className="w-full rounded-xl border border-white/8 bg-[#07111F] px-3 py-2 text-xs text-white">
              <option value="">Compte bancaire...</option>
              {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <button type="submit" className="w-full rounded-xl bg-[#4F8CFF] py-2.5 text-[10px] font-black uppercase text-white">Enregistrer la dépense</button>
          </form>
        </div>
      )}

      {isParent && (
        <form onSubmit={handleAddVehicle} className="glass-panel space-y-4 rounded-[28px] border border-white/8 p-5">
          <div className="flex items-center gap-2 text-[#4F8CFF]"><Plus className="h-4 w-4" /><span className="text-[10px] font-black uppercase">Ajouter un véhicule</span></div>
          <div className="grid grid-cols-2 gap-3">
            <input required value={name} onChange={event => setName(event.target.value)} placeholder="Marque / modèle" className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-xs text-white" />
            <input required value={plate} onChange={event => setPlate(event.target.value)} placeholder="Plaque" className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-xs text-white" />
            <input type="number" min="0" required value={mileage} onChange={event => setMileage(event.target.value)} placeholder="Kilométrage" className="rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-xs text-white" />
            <label className="text-[9px] font-bold text-white/40">Contrôle technique<input type="date" value={technicalControl} onChange={event => setTechnicalControl(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[9px] font-bold text-white/40">Assurance<input type="date" value={insuranceExpiry} onChange={event => setInsuranceExpiry(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
            <label className="text-[9px] font-bold text-white/40">Prochaine révision<input type="date" value={nextService} onChange={event => setNextService(event.target.value)} className="mt-1 w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white" /></label>
          </div>
          <button type="submit" className="w-full rounded-[18px] bg-gradient-to-r from-[#4F8CFF] to-[#6C5CFF] py-3 text-xs font-black text-white">Enregistrer le véhicule</button>
        </form>
      )}
    </div>
  );
};
