import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Save, Undo2 } from 'lucide-react';
import { rememberConfirmedGroceryProducts, type SafeGroceryStatus } from '../ai/local/safeGroceryParserV2';
import { parseSmartNaturalSentence } from '../utils/groceryParser';
import { parseFamilyLabVoice, emptyFamilyVoiceContext } from '../ai/local/familyVoiceDialogue';
import { createFamilySimulation, simulateFamilyCommit, undoFamilySimulation, familyUndoToken } from '../ai/local/familyVoiceSimulation';
import { vocabularyAliases, type FamilyVocabularyEntry } from '../ai/local/familyVocabulary';
import { loadLabVocabulary } from './labVocabularyStorage';
import { LabVocabularyEditor } from './LabVocabularyEditor';
import { VoiceBench, type VoiceBenchObservation } from './VoiceBench';
import { describeGroceryChanges } from '../ai/local/labActionSummary';

const labels: Record<SafeGroceryStatus, string> = { proposed: 'Proposition prête', needs_clarification: 'À préciser', confirmed: 'Confirmé', cancelled: 'Annulé', rejected: 'Rejeté', out_of_scope: 'Autre module', ignored: 'Ignoré' };
const money = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function GroceryParserLab({ prompt }: { prompt: string }) {
  const [scopeKey, setScopeKey] = useState('lab:parent');
  const [canWrite, setCanWrite] = useState(false);
  const [simulation, setSimulation] = useState(() => createFamilySimulation('lab:parent'));
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [saved, setSaved] = useState(() => loadLabVocabulary('lab:parent'));
  const [dialogue, setDialogue] = useState(() => parseFamilyLabVoice(prompt, undefined, { scopeKey: 'lab:parent', aliases: vocabularyAliases(saved), vocabulary: saved.map(item => item.product), utteranceId: 'lab-0' }));
  const [reply, setReply] = useState('');
  const [alternative, setAlternative] = useState('');
  const [history, setHistory] = useState<string[]>([prompt]);
  const [notice, setNotice] = useState('');
  const [voiceEpoch, setVoiceEpoch] = useState(0);
  const [voiceActive, setVoiceActive] = useState(false);
  const sequence = useRef(0);
  const [sessionId] = useState(() => globalThis.crypto?.randomUUID?.() || `lab-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const result = dialogue.grocery;
  const legacyItems = useMemo(() => parseSmartNaturalSentence(history.at(-1) || '', 'Foyer'), [history]);
  const items = dialogue.receipt?.after || dialogue.context.grocery.proposal;
  const policy = { scopeKey, canWrite };
  const changes = describeGroceryChanges(dialogue.receipt?.before || dialogue.context.grocery.baseList || simulation.groceries.list, items);
  const alreadyApplied = Boolean(dialogue.receipt && simulation.groceries.appliedProposalIds.includes(dialogue.receipt.id) || dialogue.undoReceipt && !familyUndoToken(simulation));

  const submit = (text: string, recognitionMs = 0, alternatives?: string[]): VoiceBenchObservation => {
    const started = performance.now();
    sequence.current += 1;
    const next = parseFamilyLabVoice(text, dialogue.context, { scopeKey, vocabulary: [...vocabulary, ...saved.map(item => item.product)], aliases: vocabularyAliases(saved), list: simulation.groceries.list, utteranceId: sessionId + ':' + sequence.current, alternatives, undo: familyUndoToken(simulation) });
    const parseMs = performance.now() - started;
    setDialogue(next); setHistory(lines => [...lines, text].slice(-8)); setReply(''); setAlternative(''); setNotice('');
    const summary = [...(next.receipt?.after || next.context.grocery.proposal).map(item => item.quantity + ' ' + item.name + (item.completed ? ', acheté' : ', à acheter')), ...next.expenses.map(item => money(item.cents) + ' ' + item.label)].join(' · ');
    const spokenChanges = [...describeGroceryChanges(next.context.grocery.baseList || simulation.groceries.list, next.context.grocery.hasProposal ? next.context.grocery.proposal : simulation.groceries.list), ...next.expenses.map(item => `Noter ${money(item.cents)} de ${item.label}`)];
    const speech = next.status === 'confirmed' ? 'Confirmé. Prêt à appliquer dans la simulation.' : next.status === 'proposed' && !next.context.pendingUndo && spokenChanges.length ? `${spokenChanges.slice(0, 5).join('. ')}${spokenChanges.length > 5 ? `. Et ${spokenChanges.length - 5} autres modifications affichées. Vérifiez-les à l’écran` : ''}. Confirmez-vous ?` : next.message;
    return { transcript: text, recognitionMs, parseMs, interpretation: labels[next.status] + ' · ' + (summary || next.message), status: next.status, speech };
  };
  const reset = () => {
    sequence.current += 1;
    setVoiceEpoch(value => value + 1);
    setDialogue(parseFamilyLabVoice(prompt, undefined, { scopeKey, vocabulary: [...vocabulary, ...saved.map(item => item.product)], aliases: vocabularyAliases(saved), list: simulation.groceries.list, utteranceId: sessionId + ':' + sequence.current }));
    setReply(''); setAlternative(''); setHistory([prompt]); setNotice('');
  };
  const changeVocabulary = (entries: FamilyVocabularyEntry[]) => {
    setSaved(entries); setVoiceEpoch(value => value + 1);
    setDialogue(parseFamilyLabVoice('annule')); setHistory([]); setReply('');
  };

  return <section className="mt-4 min-w-0 border-y border-family-border py-4" aria-label="Laboratoire du dialogue Courses">
    <header className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-black">Dialogue Courses et Budget</h3>
      <button type="button" onClick={reset} title="Recommencer le dialogue" aria-label="Recommencer le dialogue" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-family-border"><RotateCcw size={16} /></button>
    </header>
    <p className="mt-1 text-xs text-family-warning">Simulation · micro principal et données du foyer inchangés</p>
    <ol aria-label="Phrases du dialogue" className="mt-3 space-y-1 text-xs text-family-text-secondary">{history.map((line, index) => <li key={index} className="break-words">{index + 1}. {line}</li>)}</ol>
    <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="min-w-0 border-l-2 border-family-border pl-3">
        <h4 className="text-xs font-bold">Parseur historique seul</h4>
        <p className="mt-1 break-words text-xs text-family-text-secondary">{legacyItems.map(item => item.quantity + ' ' + item.name).join(' · ') || 'Aucun produit'}</p>
      </div>
      <div className="min-w-0 border-l-2 border-family-success pl-3" aria-live="polite">
        <h4 className="text-xs font-bold">Dialogue sécurisé · {labels[dialogue.status]}</h4>
        {items.length > 0 && <p className="mt-2 break-words text-xs font-bold">Courses : {items.map(item => item.quantity + ' ' + item.name + (item.completed ? ' (acheté)' : ' (à acheter)')).join(' · ')}</p>}
        {!items.length && <p className="mt-1 text-xs">{dialogue.context.grocery.hasProposal ? 'Liste vide proposée' : 'Aucun ajout Courses'}</p>}
        {dialogue.expenses.map((expense, index) => <p key={index} className="mt-2 break-words text-xs font-bold">Budget : {money(expense.cents)} · {expense.label}</p>)}
      </div>
    </div>
    {dialogue.context.grocery.planning?.people && <p className="mt-3 text-xs">Préparation pour {dialogue.context.grocery.planning.people} personnes</p>}
    {result.missingFields.length > 0 && dialogue.status === 'needs_clarification' && <p className="mt-3 text-xs text-family-text-secondary">À préciser : {result.missingFields.join(', ')}</p>}
    <p className="mt-3 text-xs leading-relaxed" role="status">{dialogue.message}</p>
    {['proposed', 'confirmed'].includes(dialogue.status) && (dialogue.receipt || dialogue.context.grocery.hasProposal) && changes.length > 0 && <ul aria-label="Modifications proposées" className="mt-3 space-y-1 border-l-2 border-family-primary pl-3 text-xs">{changes.map(change => <li key={change} className="break-words">{change}</li>)}</ul>}
    {dialogue.context.hearing && <div className="mt-3 flex flex-col gap-2" aria-label="Choisir la transcription">{dialogue.context.hearing.choices.map((choice, i) => <button key={choice} type="button" disabled={voiceActive} onClick={() => submit(String(i + 1))} className="min-h-11 break-words rounded-lg border border-family-border px-3 py-2 text-left text-xs">{i + 1}. {choice}</button>)}</div>}
    <form className="mt-3 flex min-w-0 gap-2" onSubmit={event => { event.preventDefault(); if (reply.trim()) submit(reply, 0, alternative.trim() ? [alternative] : undefined); }}>
      <label className="min-w-0 flex-1 text-xs font-bold">Phrase suivante<input aria-label="Phrase suivante" disabled={voiceActive} maxLength={500} value={reply} onChange={event => setReply(event.target.value)} className="app-field mt-1 min-h-11 w-full rounded-lg px-3 text-sm" /></label>
      <button type="submit" disabled={!reply.trim() || voiceActive} title="Analyser la phrase" aria-label="Analyser la phrase" className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-family-primary text-white disabled:opacity-40"><ArrowRight size={18} /></button>
    </form>
    <details className="mt-2 text-xs"><summary className="cursor-pointer py-2">Rejouer une hésitation de transcription</summary><label className="block">Autre transcription possible<input aria-label="Autre transcription possible" disabled={voiceActive} maxLength={500} value={alternative} onChange={event => setAlternative(event.target.value)} className="app-field mt-1 min-h-10 w-full rounded-lg px-3" /></label></details>
    {(dialogue.status === 'proposed' || dialogue.context.grocery.pending?.kind === 'unknown_product') && <button type="button" disabled={voiceActive} onClick={() => submit('oui')} className="mt-3 flex min-h-10 items-center gap-2 text-xs font-bold text-family-success disabled:opacity-40"><Check size={16} />{dialogue.context.grocery.pending?.kind === 'unknown_product' ? 'Confirmer les noms' : 'Confirmer l’ensemble'}</button>}

    <VoiceBench key={scopeKey + ':' + voiceEpoch} onTranscript={submit} onListeningChange={setVoiceActive} />
    <div className="mt-4 border-t border-family-border pt-4">
      <h4 className="text-xs font-black">Simulation · révision {simulation.groceries.revision}</h4>
      <ul aria-label="Liste simulée" className="mt-2 space-y-1 text-xs">{simulation.groceries.list.length ? simulation.groceries.list.map(item => <li key={item.name} className="flex gap-2"><input aria-label={`${item.name} acheté`} type="checkbox" checked={Boolean(item.completed)} disabled={voiceActive} onChange={() => submit(`${item.completed ? 'décoche' : 'coche'} ${item.name}`)} /><span className={item.completed ? 'line-through text-family-text-secondary' : ''}>{item.quantity} {item.name}</span></li>) : <li className="text-family-text-secondary">Liste vide</li>}</ul>
      <ul aria-label="Dépenses simulées" className="mt-2 space-y-1 text-xs">{simulation.expenses.map((expense, index) => <li key={index}>{money(expense.cents)} · {expense.label}</li>)}</ul>
      <label className="mt-3 block text-xs">Profil de test<select aria-label="Profil de test" value={scopeKey} onChange={event => {
        const scope = event.target.value;
        setScopeKey(scope); setSimulation(createFamilySimulation(scope)); setVocabulary([]); setSaved(loadLabVocabulary(scope)); setCanWrite(false);
        setDialogue(parseFamilyLabVoice('annule', emptyFamilyVoiceContext(), { scopeKey: scope })); setReply(''); setAlternative(''); setHistory([]); setNotice('Profil changé. Les anciennes propositions ne sont plus applicables.');
      }} className="app-field mt-1 min-h-10 w-full rounded-lg px-2"><option value="lab:parent">Parent de test</option><option value="lab:enfant">Autre membre de test</option></select></label>
      <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={canWrite} onChange={event => setCanWrite(event.target.checked)} />Autoriser l’écriture simulée</label>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={dialogue.status !== 'confirmed' || voiceActive || alreadyApplied} onClick={() => { const outcome = simulateFamilyCommit(simulation, dialogue, policy); setSimulation(outcome.state); setNotice(outcome.reason); }} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-family-border px-2 text-xs font-bold disabled:opacity-40"><Check size={16} className="shrink-0" />Appliquer à la simulation</button>
        <button type="button" title="Annuler la dernière modification simulée" aria-label="Annuler la dernière modification simulée" disabled={!simulation.groceries.undo || voiceActive} onClick={() => { const outcome = undoFamilySimulation(simulation, policy); setSimulation(outcome.state); setNotice(outcome.reason); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-family-border disabled:opacity-40"><Undo2 size={16} /></button>
      </div>
      {result.learnableProducts.length > 0 && dialogue.status === 'confirmed' && <button type="button" onClick={() => {
        if (dialogue.receipt?.scopeKey !== scopeKey) return;
        setVocabulary(rememberConfirmedGroceryProducts(result, vocabulary, true)); setNotice('Noms mémorisés uniquement dans cette session.');
      }} className="mt-3 flex min-h-10 items-center gap-2 text-xs font-bold"><Save size={16} />Mémoriser ces noms pour cette session</button>}
      {vocabulary.length > 0 && <p className="mt-2 text-xs text-family-text-secondary">Vocabulaire de session : {vocabulary.join(', ')}</p>}
      {notice && <p className="mt-3 text-xs text-family-warning" role="status">{notice}</p>}
    </div>
    <fieldset disabled={voiceActive} className="min-w-0"><LabVocabularyEditor key={scopeKey} scope={scopeKey} entries={saved} onChange={changeVocabulary} /></fieldset>
  </section>;
}
