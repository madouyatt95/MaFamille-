import { useCallback, useRef, useState } from 'react';
import { ArrowRight, Check, Download, FlaskConical, RotateCcw, Upload, Undo2 } from 'lucide-react';
import { parseHouseholdVoice, describeHouseholdOperation, type HouseholdAnswer } from '../ai/local/householdAssistant';
import { actorIsParent, canReadAudience, commitHouseholdProposal, createHouseholdData, importHouseholdData, undoHouseholdSimulation, validateHouseholdData, type HouseholdData, type HouseholdSimulation } from '../ai/local/householdLabData';
import { createHouseholdFixture } from '../ai/local/householdLabFixture';
import { VoiceBench, type VoiceBenchObservation } from './VoiceBench';
import { HouseholdRoutineEditor } from './HouseholdRoutineEditor';

const statuses = { proposed: 'À confirmer', needs_clarification: 'À préciser', confirmed: 'Confirmé', cancelled: 'Annulé', rejected: 'Non appliqué', answered: 'Résultats', ignored: 'Ignoré' };
const examples = [
  ['Réception', 'On reçoit six personnes samedi soir'],
  ['Historique', 'Remets les courses de la semaine dernière sans les boissons'],
  ['Rendez-vous', 'Décale le dentiste à vendredi'],
  ['Achat partiel', 'J’ai pris deux bouteilles sur les trois'],
  ['Répartition', 'J’ai payé 42 euros dont 12 pour la pharmacie'],
  ['Destinataire', 'Ajoute du pain pour maman'],
  ['Routine', 'Prépare notre départ en vacances'],
];
export function HouseholdAssistantLab() {
  const [state, setState] = useState<HouseholdSimulation>(() => ({ data: createHouseholdData(), applied: [] }));
  const [actorId, setActorId] = useState('');
  const [result, setResult] = useState<HouseholdAnswer>();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [canWrite, setCanWrite] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [source, setSource] = useState('Contexte vide');
  const [dataView, setDataView] = useState('courses');
  const sequence = useRef(0);
  const upload = useRef<HTMLInputElement>(null);
  const data = state.data;
  const parent = actorIsParent(data, actorId);
  const operations = result?.context?.operations || [];
  const resetDialogue = () => { setResult(undefined); setHistory([]); setInput(''); setEpoch(value => value + 1); };
  const setData = (next: HouseholdData) => {
    if (!validateHouseholdData(next)) { setNotice('Données invalides : aucun changement.'); return; }
    setState(value => ({ data: { ...next, revision: value.data.revision + 1 }, applied: value.applied }));
    resetDialogue(); setNotice('Contexte modifié. Les anciennes propositions sont invalidées.');
  };
  const load = (next: HouseholdData, label: string) => {
    if (data.members.length && !window.confirm('Remplacer le contexte de test et ses modifications ? Aucun foyer réel ne sera touché.')) return;
    setState({ data: next, applied: [] }); setActorId(next.members[0]?.id || ''); setSource(label); setCanWrite(false); resetDialogue(); setNotice('Contexte chargé uniquement dans la mémoire de cette page.');
  };
  const submit = useCallback((text: string, recognitionMs = 0, alternatives?: string[]): VoiceBenchObservation => {
    const start = performance.now();
    const next = parseHouseholdVoice(text, data, result?.context, { actorId, now: Date.now(), utteranceId: `${epoch}:${++sequence.current}`, alternatives });
    const parseMs = performance.now() - start;
    setResult(next); setHistory(value => [...value, text].slice(-8)); setInput(''); setNotice('');
    const descriptions = (next.context?.operations || []).map(op => describeHouseholdOperation(op, data));
    const speech = next.status === 'proposed' ? `${descriptions.slice(0, 5).join('. ')}${descriptions.length > 5 ? '. Vérifiez les autres modifications affichées' : ''}. Confirmez-vous ?` : `${next.message} ${next.choices.map((choice, i) => `${i + 1}. ${choice.label}`).join('. ')} ${next.results.slice(0, 5).join('. ')}`;
    return { transcript: text, recognitionMs, parseMs, interpretation: next.message, status: next.status, speech };
  }, [actorId, data, epoch, result?.context]);
  const apply = () => {
    const outcome = commitHouseholdProposal(state, result?.proposal, result?.status === 'confirmed', { actorId, canWrite });
    setState(outcome.state); setNotice(outcome.message);
    if (outcome.applied) setResult(value => value ? { ...value, context: undefined } : value);
  };
  const audience = (id: string | null) => id === null ? 'Famille' : data.members.find(member => member.id === id)?.name || 'Membre absent';
  const visible = (memberId: string | null) => canReadAudience(data, actorId, memberId);
  const rows = dataView === 'courses' ? data.groceries.filter(item => visible(item.memberId)).map(item => `${item.name} · ${item.quantity} · ${item.bought} acheté(s), ${Number((item.amount.value - item.bought).toFixed(6))} restant(s) · ${audience(item.memberId)}`)
    : dataView === 'agenda' ? data.events.filter(event => visible(event.memberId)).map(event => `${event.title} · ${event.date} ${event.time} · ${event.duration} min · ${audience(event.memberId)}`)
      : dataView === 'taches' ? data.tasks.filter(task => visible(task.memberId)).map(task => `${task.title} · ${task.date} · ${audience(task.memberId)}`)
        : dataView === 'budget' ? parent ? data.expenses.map(expense => `${expense.label} · ${(expense.cents / 100).toFixed(2)} € · ${audience(expense.memberId)}`) : []
          : dataView === 'rappels' ? data.reminders.filter(reminder => visible(reminder.memberId)).map(reminder => `${reminder.title} · ${reminder.date} ${reminder.time} · ${audience(reminder.memberId)}`)
            : dataView === 'repas' ? data.plans.filter(plan => visible(plan.memberId)).map(plan => `${plan.menu} · ${plan.people} personnes · ${plan.date} · ${audience(plan.memberId)}`)
              : data.history.flatMap(entry => entry.items.filter(item => visible(item.memberId)).map(item => `${entry.date} · ${item.name} · ${item.quantity} · ${audience(item.memberId)}`));
  return <section className="mt-6 min-w-0" aria-label="Assistant familial transversal">
    <div className="flex flex-wrap items-center gap-2 border-b border-family-border pb-4">
      <p className="mr-auto text-xs font-semibold text-family-warning">{source} · Simulation uniquement · {data.timezone}</p>
      <button type="button" disabled={voiceActive || Boolean(actorId) && !parent} onClick={() => load(createHouseholdFixture(Date.now()), 'Scénario fictif explicite')} className="flex min-h-10 items-center gap-2 rounded-lg border border-family-border px-3 text-xs font-semibold disabled:opacity-40"><FlaskConical size={16} />Charger un scénario fictif</button>
      <button type="button" title="Importer un contexte JSON" aria-label="Importer un contexte JSON" disabled={voiceActive || Boolean(actorId) && !parent} onClick={() => upload.current?.click()} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border disabled:opacity-40"><Upload size={16} /></button>
      <input type="file" accept="application/json,.json" ref={upload} className="hidden" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { if (file.size > 250000) throw new Error('Limite : 250 Ko.'); load(importHouseholdData(await file.text()), 'Contexte importé explicitement'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Import impossible.'); } }} />
      <button type="button" title="Exporter le contexte de test" aria-label="Exporter le contexte de test" disabled={!parent || voiceActive} onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'myfamily-contexte-laboratoire.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border disabled:opacity-40"><Download size={16} /></button>
    </div>
    {!data.members.length && <p className="my-4 text-sm text-family-text-secondary">Aucune donnée du foyer chargée. Importez un contexte ou choisissez le scénario fictif.</p>}
    <div className="mt-4 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="min-w-0">
        <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-bold">Membre actif<select aria-label="Membre actif" disabled={voiceActive} value={actorId} onChange={event => { setActorId(event.target.value); setCanWrite(false); resetDialogue(); setNotice('Profil changé. Dialogue et consentement vocal réinitialisés.'); }} className="app-field mt-1 min-h-11 w-full rounded-lg px-3"><option value="" disabled>Choisir un membre</option>{data.members.map(member => <option value={member.id} key={member.id}>{member.name} · {member.role === 'parent' ? 'Parent' : 'Enfant'}</option>)}</select></label><button type="button" aria-label="Recommencer le dialogue familial" title="Recommencer le dialogue familial" onClick={resetDialogue} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-family-border"><RotateCcw size={18} /></button></div>
        <label className="mt-4 block text-xs">Exemple de demande<select aria-label="Exemple de demande" disabled={voiceActive} value="" onChange={event => setInput(event.target.value)} className="app-field mt-1 min-h-10 w-full rounded-lg px-3"><option value="">Choisir un exemple</option>{examples.map(([label, phrase]) => <option key={label} value={phrase}>{label}</option>)}</select></label>
        <ol className="mt-4 space-y-2 text-xs text-family-text-secondary" aria-label="Historique du dialogue familial">{history.map((line, index) => <li key={index} className="break-words">{index + 1}. {line}</li>)}</ol>
        <div aria-live="polite" className="mt-4 border-l-2 border-family-primary pl-3">
          <h2 className="text-sm font-bold">{result ? statuses[result.status] : 'Nouvelle demande'}</h2>
          <p role="status" className="mt-2 text-sm leading-relaxed">{result?.message || 'Prêt pour votre demande.'}</p>
          {result?.results.length ? <ul aria-label="Résultats du contexte" className="mt-3 space-y-2 text-sm">{result.results.map((row, index) => <li className="break-words" key={index}>{row}</li>)}</ul> : null}
          {operations.length > 0 && <ul aria-label="Actions familiales proposées" className="mt-3 space-y-2 text-sm">{operations.map((op, index) => <li className="break-words" key={index}>{describeHouseholdOperation(op, data)}</li>)}</ul>}
        </div>
        {result?.choices.length ? <div className="mt-3 flex flex-col gap-2" aria-label="Choix de précision">{result.choices.map((choice, i) => <button type="button" disabled={voiceActive} key={choice.id} onClick={() => submit(choice.reply)} className="min-h-11 break-words rounded-lg border border-family-border px-3 py-2 text-left text-sm disabled:opacity-40">{i + 1}. {choice.label}</button>)}</div> : null}
        <form onSubmit={event => { event.preventDefault(); if (input.trim()) submit(input); }} className="mt-4 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-bold">Votre phrase<textarea aria-label="Votre phrase" rows={2} maxLength={500} disabled={!actorId || voiceActive} value={input} onChange={event => setInput(event.target.value)} className="app-field mt-1 w-full resize-y rounded-lg px-3 py-2 text-sm" /></label><button type="submit" title="Analyser la demande familiale" aria-label="Analyser la demande familiale" disabled={!actorId || !input.trim() || voiceActive} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-family-primary text-white disabled:opacity-40"><ArrowRight size={18} /></button></form>
        {result?.status === 'proposed' && <button type="button" disabled={voiceActive} onClick={() => submit('oui')} className="mt-3 flex min-h-10 items-center gap-2 text-sm font-bold text-family-success"><Check size={16} />Confirmer l’ensemble familial</button>}
        {actorId && <VoiceBench key={actorId + ':' + epoch} onTranscript={submit} onListeningChange={setVoiceActive} />}
        <div className="mt-4 border-t border-family-border pt-4"><label className="flex gap-2 text-xs"><input type="checkbox" checked={canWrite} disabled={!actorId || voiceActive} onChange={event => setCanWrite(event.target.checked)} />Autoriser les modifications dans cette simulation</label><div className="mt-3 flex gap-2"><button type="button" disabled={voiceActive || result?.status !== 'confirmed' || !result.proposal || state.applied.includes(result.proposal.id)} onClick={apply} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-family-border px-3 text-sm font-bold disabled:opacity-40"><Check size={17} />Appliquer l’ensemble</button><button type="button" disabled={!state.undo || voiceActive} title="Annuler le dernier ensemble simulé" aria-label="Annuler le dernier ensemble simulé" onClick={() => { const outcome = undoHouseholdSimulation(state, { actorId, canWrite }); setState(outcome.state); resetDialogue(); setNotice(outcome.message); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-family-border disabled:opacity-40"><Undo2 size={18} /></button></div></div>
        {notice && <p role="status" className="mt-3 text-xs text-family-warning">{notice}</p>}
      </div>
      <div className="min-w-0 space-y-5 border-t border-family-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <section aria-label="Contexte inspectable"><h2 className="text-sm font-bold">Contexte fourni · révision {data.revision}</h2><label className="mt-3 block text-xs">Données<select aria-label="Données du contexte" value={dataView} onChange={event => setDataView(event.target.value)} className="app-field mt-1 min-h-10 w-full rounded-lg px-3"><option value="courses">Courses</option><option value="agenda">Agenda</option><option value="taches">Tâches</option>{parent && <option value="budget">Dépenses</option>}<option value="repas">Repas</option><option value="rappels">Rappels simulés</option><option value="historique">Historique des courses</option></select></label><ul className="mt-3 divide-y divide-family-border text-sm" aria-label="Données accessibles">{rows.length ? rows.map((row, i) => <li key={i} className="break-words py-3 leading-relaxed">{row}</li>) : <li className="py-3 text-family-text-secondary">Aucune donnée accessible.</li>}</ul></section>
        {parent && <fieldset disabled={voiceActive} className="min-w-0"><HouseholdRoutineEditor key={data.scopeKey + ':' + actorId} data={data} onChange={setData} /></fieldset>}
      </div>
    </div>
  </section>;
}
