import { useState } from 'react';
import { Plus, Save, Trash2, Pencil, X } from 'lucide-react';
import { validateHouseholdData, type HouseholdData, type HouseholdRoutine, type RoutineStep } from '../ai/local/householdLabData';
import { foldVoice, normalizeSafeVoiceText } from '../ai/local/safeGroceryEntities';

const blankStep = (): RoutineStep => ({ kind: 'task', text: '', daysBefore: 0, time: '09:00' });
export function HouseholdRoutineEditor({ data, onChange }: { data: HouseholdData; onChange(data: HouseholdData): void }) {
  const [editing, setEditing] = useState<HouseholdRoutine | null>(null);
  const [error, setError] = useState('');
  const changeStep = (index: number, patch: Partial<RoutineStep>) => setEditing(value => value ? { ...value, steps: value.steps.map((step, i) => i === index ? { ...step, ...patch } : step) } : value);
  const save = () => {
    if (!editing) return;
    const next = { ...data, routines: [...data.routines.filter(routine => routine.id !== editing.id), editing] };
    if (!validateHouseholdData(next)) { setError('Vérifiez le nom, la phrase, les étapes et les délais (0 à 90 jours).'); return; }
    const trigger = foldVoice(normalizeSafeVoiceText(editing.trigger));
    if (/^(?:oui|non|ok|annule|stop|confirme|valide|arrete)$/.test(trigger)) { setError('Choisissez une phrase distincte des confirmations et annulations.'); return; }
    if (data.routines.some(routine => routine.id !== editing.id && foldVoice(normalizeSafeVoiceText(routine.trigger)) === trigger)) { setError('Cette phrase déclenche déjà une autre routine.'); return; }
    onChange(next); setEditing(null); setError('');
  };
  return <section className="border-t border-family-border pt-4" aria-label="Routines personnalisées">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">Routines personnalisées</h3><button type="button" title="Ajouter une routine" aria-label="Ajouter une routine" className="grid h-10 w-10 place-items-center rounded-lg border border-family-border" onClick={() => { setEditing({ id: crypto.randomUUID(), name: '', trigger: '', steps: [blankStep()] }); setError(''); }}><Plus size={18} /></button></div>
    <ul className="mt-3 divide-y divide-family-border">{data.routines.map(routine => <li key={routine.id} className="flex items-center gap-2 py-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{routine.name}</p><p className="break-words text-xs text-family-text-secondary">« {routine.trigger} » · {routine.steps.length} étapes</p></div><button type="button" aria-label={`Modifier ${routine.name}`} title="Modifier la routine" onClick={() => { setEditing(structuredClone(routine)); setError(''); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-family-border"><Pencil size={16} /></button><button type="button" aria-label={`Supprimer ${routine.name}`} title="Supprimer la routine" onClick={() => { if (window.confirm(`Supprimer la routine « ${routine.name} » du laboratoire ?`)) onChange({ ...data, routines: data.routines.filter(item => item.id !== routine.id) }); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-family-border"><Trash2 size={16} /></button></li>)}</ul>
    {!data.routines.length && !editing && <p className="my-3 text-sm text-family-text-secondary">Aucune routine définie.</p>}
    {editing && <form onSubmit={event => { event.preventDefault(); save(); }} className="mt-3 space-y-3 border-l-2 border-family-primary pl-3" aria-label="Édition d’une routine">
      <label className="block text-xs">Nom de la routine<input required maxLength={70} value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} className="app-field mt-1 min-h-10 w-full rounded-lg px-3" /></label>
      <label className="block text-xs">Phrase de déclenchement<input required maxLength={100} value={editing.trigger} onChange={event => setEditing({ ...editing, trigger: event.target.value })} className="app-field mt-1 min-h-10 w-full rounded-lg px-3" /></label>
      {editing.steps.map((step, index) => <div key={index} className="space-y-2 border-t border-family-border pt-3">
        <div className="flex items-center gap-2"><label className="min-w-0 flex-1 text-xs">Étape {index + 1}<select aria-label={`Type étape ${index + 1}`} value={step.kind} onChange={event => changeStep(index, { kind: event.target.value as RoutineStep['kind'] })} className="app-field mt-1 min-h-10 w-full rounded-lg px-2"><option value="task">Tâche</option><option value="grocery">Courses</option><option value="reminder">Rappel</option></select></label><button type="button" disabled={editing.steps.length === 1} title="Retirer cette étape" aria-label={`Retirer étape ${index + 1}`} onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== index) })} className="mt-4 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-family-border disabled:opacity-30"><Trash2 size={16} /></button></div>
        <input required aria-label={`Contenu étape ${index + 1}`} maxLength={120} value={step.text} onChange={event => changeStep(index, { text: event.target.value })} className="app-field min-h-10 w-full rounded-lg px-3 text-sm" />
        {step.kind !== 'grocery' && <div className="grid grid-cols-2 gap-2"><label className="text-xs">Jours avant<input type="number" min={0} max={90} value={step.daysBefore} onChange={event => changeStep(index, { daysBefore: Number(event.target.value) })} className="app-field mt-1 min-h-10 w-full rounded-lg px-2" /></label>{step.kind === 'reminder' && <label className="min-w-0 text-xs">Heure<input type="time" required value={step.time} onChange={event => changeStep(index, { time: event.target.value })} className="app-field mt-1 min-h-10 w-full rounded-lg px-2" /></label>}</div>}
      </div>)}
      {error && <p role="alert" className="text-xs text-family-danger">{error}</p>}
      <div className="flex items-center gap-2"><button type="button" disabled={editing.steps.length >= 20} onClick={() => setEditing({ ...editing, steps: [...editing.steps, blankStep()] })} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border" title="Ajouter une étape" aria-label="Ajouter une étape"><Plus size={16} /></button><button type="submit" className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-family-primary px-2 text-xs font-bold text-white"><Save size={16} />Enregistrer la routine</button><button type="button" title="Annuler l’édition" aria-label="Annuler l’édition" onClick={() => setEditing(null)} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border"><X size={16} /></button></div>
    </form>}
  </section>;
}
