import { useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, RefreshCw, Store, Users, X } from 'lucide-react';
import type { Abonnement, Account, Debt, Member, Transaction } from '../types';
import { getSupabaseClient } from '../utils/supabase';
import {
  buildUnifiedForecast,
  diagnoseBudget,
  forecastBalanceAt,
  type BudgetDiagnostic
} from '../utils/budgetEngine';
import { getMerchantPreferences, removeMerchantPreference } from '../utils/merchantDirectory';

type PilotageView = 'forecast' | 'health' | 'shared' | 'merchants';

interface BudgetPilotageProps {
  accounts: Account[];
  transactions: Transaction[];
  abonnements: Abonnement[];
  suspendedAbonnementIds: string[];
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  members: Member[];
  foyerId: string;
  isAuthorized: boolean;
  formatMoney: (value: number) => string;
  onReconcileAccount: (account: Account, actualBalance: number) => Promise<void>;
  onOpenTransaction: (transactionId: string) => void;
}

const diagnosticStyle: Record<BudgetDiagnostic['level'], string> = {
  info: 'border-[#6C5CFF]/20 bg-[#6C5CFF]/8 text-[#B8B0FF]',
  warning: 'border-[#FFB020]/25 bg-[#FFB020]/8 text-[#FFD080]',
  error: 'border-[#FF5577]/25 bg-[#FF5577]/8 text-[#FF9DAF]'
};

export function BudgetPilotage({
  accounts,
  transactions,
  abonnements,
  suspendedAbonnementIds,
  debts,
  setDebts,
  members,
  foyerId,
  isAuthorized,
  formatMoney,
  onReconcileAccount,
  onOpenTransaction
}: BudgetPilotageProps) {
  const [view, setView] = useState<PilotageView>('forecast');
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(null);
  const [actualBalance, setActualBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [, setMerchantRevision] = useState(0);
  const [debtForm, setDebtForm] = useState({ title: '', amount: '', payerId: '', debtorId: '' });

  const forecastEntries = useMemo(
    () => buildUnifiedForecast(abonnements, transactions, suspendedAbonnementIds, 90),
    [abonnements, transactions, suspendedAbonnementIds]
  );
  const startingBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts]);
  const forecasts = useMemo(() => [30, 60, 90].map(days => ({
    days,
    balance: forecastBalanceAt(startingBalance, forecastEntries, days)
  })), [forecastEntries, startingBalance]);
  const firstNegative = (() => {
    let balance = startingBalance;
    for (const entry of forecastEntries) {
      balance += entry.type === 'income' ? entry.amount : -entry.amount;
      if (balance < 0) return { date: entry.date, balance };
    }
    return null;
  })();
  const diagnostics = useMemo(() => diagnoseBudget(accounts, transactions, abonnements), [accounts, transactions, abonnements]);
  const merchantRules = getMerchantPreferences();

  const saveDebt = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(debtForm.amount);
    const payer = members.find(member => member.id === debtForm.payerId);
    const debtor = members.find(member => member.id === debtForm.debtorId);
    if (!payer || !debtor || payer.id === debtor.id || !Number.isFinite(amount) || amount <= 0) return;
    const debt: Debt = {
      id: `debt-${Date.now()}`,
      title: debtForm.title.trim() || 'Dépense partagée',
      amount,
      payerId: payer.id,
      payerName: payer.name,
      debtorId: debtor.id,
      debtorName: debtor.name,
      isRepaid: false
    };
    const client = getSupabaseClient();
    if (client && foyerId) {
      const { error } = await client.from('debts').insert({
        id: debt.id,
        foyer_id: foyerId,
        title: debt.title,
        amount: debt.amount,
        payer_id: debt.payerId,
        payer_name: debt.payerName,
        debtor_id: debt.debtorId,
        debtor_name: debt.debtorName,
        is_repaid: false
      });
      if (error) throw error;
    }
    setDebts(current => [debt, ...current]);
    setDebtForm({ title: '', amount: '', payerId: '', debtorId: '' });
  };

  const toggleDebt = async (debt: Debt) => {
    const nextStatus = !debt.isRepaid;
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('debts').update({ is_repaid: nextStatus }).eq('id', debt.id);
      if (error) throw error;
    }
    setDebts(current => current.map(item => item.id === debt.id ? { ...item, isRepaid: nextStatus } : item));
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/7 bg-white/3 p-2">
        {[
          { id: 'forecast', label: 'Prévisions', icon: CalendarRange },
          { id: 'health', label: 'Contrôle', icon: RefreshCw, count: diagnostics.length },
          { id: 'shared', label: 'Partage', icon: Users, count: debts.filter(debt => !debt.isRepaid).length },
          { id: 'merchants', label: 'Commerces', icon: Store, count: merchantRules.length }
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setView(item.id as PilotageView)} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[10px] font-black transition ${view === item.id ? 'bg-[#6C5CFF] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-4 w-4" />{item.label}
              {!!item.count && <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8px]">{item.count}</span>}
            </button>
          );
        })}
      </div>

      {view === 'forecast' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {forecasts.map(forecast => (
              <div key={forecast.days} className="glass-panel rounded-3xl border border-white/7 p-4">
                <span className="text-[9px] font-black uppercase text-white/40">Dans {forecast.days} jours</span>
                <strong className={`mt-2 block text-xl ${forecast.balance < 0 ? 'text-[#FF5577]' : 'text-white'}`}>{formatMoney(forecast.balance)}</strong>
                <small className="text-[9px] text-white/35">Après les échéances connues</small>
              </div>
            ))}
          </div>
          {firstNegative ? (
            <div className="rounded-2xl border border-[#FF5577]/25 bg-[#FF5577]/8 p-4 text-xs text-[#FF9DAF]">
              <strong>Solde négatif possible le {new Date(`${firstNegative.date}T12:00:00`).toLocaleDateString('fr-FR')}</strong>
              <p className="mt-1 text-[10px] opacity-80">Projection : {formatMoney(firstNegative.balance)}. Vérifiez les revenus récurrents et les échéances.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/8 p-4 text-xs text-[#79E8AA]">
              <CheckCircle2 className="h-5 w-5" /><span>Aucun passage en négatif détecté dans les 90 prochains jours.</span>
            </div>
          )}
          <div className="glass-panel overflow-hidden rounded-3xl border border-white/7">
            <div className="border-b border-white/7 p-4"><h3 className="text-xs font-black text-white">Prochaines échéances</h3><p className="mt-1 text-[9px] text-white/40">Abonnements et opérations récurrentes réunis sans doublons.</p></div>
            <div className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {forecastEntries.slice(0, 30).map(entry => (
                <div key={entry.id} className="flex items-center justify-between gap-4 p-3.5 text-xs">
                  <div className="min-w-0"><strong className="block truncate text-white">{entry.title}</strong><small className="text-[9px] text-white/40">{new Date(`${entry.date}T12:00:00`).toLocaleDateString('fr-FR')} · {entry.source === 'subscription' ? 'Abonnement' : 'Récurrence'}</small></div>
                  <strong className={entry.type === 'income' ? 'text-[#00D26A]' : 'text-[#FF6B86]'}>{entry.type === 'income' ? '+' : '-'}{formatMoney(entry.amount)}</strong>
                </div>
              ))}
              {forecastEntries.length === 0 && <p className="p-8 text-center text-xs text-white/35">Aucune échéance configurée.</p>}
            </div>
          </div>
        </div>
      )}

      {view === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {accounts.map(account => (
              <div key={account.id} className="glass-panel flex items-center justify-between gap-4 rounded-3xl border border-white/7 p-4">
                <div><strong className="text-sm text-white">{account.name}</strong><p className="mt-1 text-[10px] text-white/40">Solde MyFamily+ : {formatMoney(account.balance)}</p></div>
                {isAuthorized && <button type="button" onClick={() => { setReconcileAccount(account); setActualBalance(account.balance.toFixed(2)); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black text-white">Rapprocher</button>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {diagnostics.map(diagnostic => (
              <button key={diagnostic.id} type="button" onClick={() => diagnostic.transactionId && onOpenTransaction(diagnostic.transactionId)} className={`w-full rounded-2xl border p-3.5 text-left ${diagnosticStyle[diagnostic.level]}`}>
                <strong className="block text-xs">{diagnostic.title}</strong><span className="mt-1 block text-[10px] opacity-80">{diagnostic.description}</span>
              </button>
            ))}
            {diagnostics.length === 0 && <div className="flex items-center gap-3 rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/8 p-4 text-xs text-[#79E8AA]"><CheckCircle2 className="h-5 w-5" />Aucune incohérence détectée.</div>}
          </div>
        </div>
      )}

      {view === 'shared' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {isAuthorized && (
            <form onSubmit={saveDebt} className="glass-panel space-y-3 rounded-3xl border border-white/7 p-5">
              <div><h3 className="text-sm font-black text-white">Nouvelle dépense partagée</h3><p className="mt-1 text-[9px] text-white/40">Indiquez qui a avancé l’argent et qui doit rembourser.</p></div>
              <input required value={debtForm.title} onChange={event => setDebtForm(current => ({ ...current, title: event.target.value }))} placeholder="Ex. Restaurant familial" className="app-field min-h-11 w-full rounded-xl px-3 text-xs" />
              <input required type="number" min="0.01" step="0.01" value={debtForm.amount} onChange={event => setDebtForm(current => ({ ...current, amount: event.target.value }))} placeholder="Montant à rembourser" className="app-field min-h-11 w-full rounded-xl px-3 text-xs" />
              <div className="grid grid-cols-2 gap-3">
                <select required value={debtForm.payerId} onChange={event => setDebtForm(current => ({ ...current, payerId: event.target.value }))} className="app-field min-h-11 rounded-xl px-2 text-xs"><option value="">A payé</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
                <select required value={debtForm.debtorId} onChange={event => setDebtForm(current => ({ ...current, debtorId: event.target.value }))} className="app-field min-h-11 rounded-xl px-2 text-xs"><option value="">Doit rembourser</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
              </div>
              <button type="submit" className="min-h-11 w-full rounded-xl bg-[#6C5CFF] text-xs font-black text-white">Créer le remboursement</button>
            </form>
          )}
          <div className="glass-panel overflow-hidden rounded-3xl border border-white/7">
            <div className="border-b border-white/7 p-4"><h3 className="text-xs font-black text-white">Remboursements</h3></div>
            <div className="divide-y divide-white/5">
              {debts.map(debt => (
                <div key={debt.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><strong className={`block truncate text-xs ${debt.isRepaid ? 'text-white/40 line-through' : 'text-white'}`}>{debt.title}</strong><small className="text-[9px] text-white/40">{debt.debtorName} doit {formatMoney(debt.amount)} à {debt.payerName}</small></div>
                  {isAuthorized && <button type="button" onClick={() => toggleDebt(debt)} className={`rounded-xl px-3 py-2 text-[9px] font-black ${debt.isRepaid ? 'bg-white/5 text-white/50' : 'bg-[#00D26A]/12 text-[#79E8AA]'}`}>{debt.isRepaid ? 'Rouvrir' : 'Remboursé'}</button>}
                </div>
              ))}
              {debts.length === 0 && <p className="p-8 text-center text-xs text-white/35">Aucun remboursement en attente.</p>}
            </div>
          </div>
        </div>
      )}

      {view === 'merchants' && (
        <div className="glass-panel overflow-hidden rounded-3xl border border-white/7">
          <div className="border-b border-white/7 p-4"><h3 className="text-xs font-black text-white">Règles apprises sur cet appareil</h3><p className="mt-1 text-[9px] text-white/40">MyFamily+ réutilise automatiquement le compte et la catégorie validés.</p></div>
          <div className="divide-y divide-white/5">
            {merchantRules.map(rule => (
              <div key={rule.merchantKey} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><strong className="block truncate text-xs capitalize text-white">{rule.merchantKey}</strong><small className="text-[9px] text-white/40">{[rule.preference.category, rule.preference.subCategory, accounts.find(account => account.id === rule.preference.accountId)?.name].filter(Boolean).join(' · ')}</small></div>
                <button type="button" onClick={() => { removeMerchantPreference(rule.merchantKey); setMerchantRevision(current => current + 1); }} className="rounded-xl border border-white/10 p-2 text-white/45" title="Oublier cette règle"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {merchantRules.length === 0 && <p className="p-8 text-center text-xs text-white/35">Aucune règle enregistrée. Activez « Mémoriser » lors d’une dépense.</p>}
          </div>
        </div>
      )}

      {reconcileAccount && (
        <div className="app-overlay fixed inset-0 z-[70] flex items-center justify-center p-4">
          <form onSubmit={async event => {
            event.preventDefault();
            const balance = Number(actualBalance);
            if (!Number.isFinite(balance)) return;
            setIsSaving(true);
            try { await onReconcileAccount(reconcileAccount, balance); setReconcileAccount(null); }
            finally { setIsSaving(false); }
          }} className="app-surface w-full max-w-sm rounded-3xl border border-white/10 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-white">Rapprocher {reconcileAccount.name}</h3><p className="mt-1 text-[10px] text-white/45">Saisissez le solde réellement affiché par votre banque.</p></div><button type="button" onClick={() => setReconcileAccount(null)} className="p-2 text-white/50"><X className="h-4 w-4" /></button></div>
            <label className="mt-4 block text-[10px] font-bold text-white/55">Solde réel<input autoFocus type="number" step="0.01" value={actualBalance} onChange={event => setActualBalance(event.target.value)} className="app-field mt-2 min-h-12 w-full rounded-xl px-3 text-base font-black" /></label>
            <div className="mt-4 rounded-2xl border border-white/7 bg-white/4 p-3 text-[10px] text-white/50">Une opération d’ajustement traçable sera créée. L’historique existant ne sera pas modifié.</div>
            <button disabled={isSaving} type="submit" className="mt-4 min-h-11 w-full rounded-xl bg-[#6C5CFF] text-xs font-black text-white disabled:opacity-50">{isSaving ? 'Rapprochement…' : 'Valider le solde'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
