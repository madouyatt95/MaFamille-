import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, RefreshCw, X } from 'lucide-react';
import { loadVoicePilot, commitVoicePilot, type PilotSnapshot } from '../../services/voicePilotService';
import { pilotKey, pilotList, pilotAfter } from '../../ai/local/voicePilot';
import { parseFamilyLabVoice, emptyFamilyVoiceContext, type FamilyVoiceContext, type FamilyVoiceResult } from '../../ai/local/familyVoiceDialogue';
import { eventMoveCandidates, requestedEventTime, type MoveRequest } from '../../ai/local/eventMove';
import { advanceEventMove, type EventMoveDraft } from '../../ai/local/eventMoveDialogue';
import { describeGroceryChanges } from '../../ai/local/labActionSummary';
import { detectProtectedVoiceDomain } from '../../ai/local/safeGroceryParserV2';
import { VoiceBench, type VoiceBenchObservation } from '../../dev/VoiceBench';
import { getSupabaseClient } from '../../utils/supabase';

type Props = { initialText: string; foyerId: string; memberId: string; scope: string; onClose(): void; onSaved(): void };
export default function VoicePilotPanel({ initialText, foyerId, memberId, scope, onClose, onSaved }: Props) {
  const [snapshot, setSnapshot] = useState<PilotSnapshot>();
  const [result, setResult] = useState<FamilyVoiceResult>();
  const [move, setMove] = useState<MoveRequest | null>(null);
  const [moveReady, setMoveReady] = useState(false);
  const [selected, setSelected] = useState('');
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('Chargement de votre liste et de votre agenda…');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [finished, setFinished] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const context = useRef<FamilyVoiceContext>(emptyFamilyVoiceContext());
  const agendaContext = useRef<EventMoveDraft | null>(null);
  const current = useRef<PilotSnapshot | undefined>(undefined);
  const saving = useRef(false);
  const generation = useRef(0);
  const commitId = useRef(crypto.randomUUID());
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
  const submit = useCallback((phrase: string, recognitionMs = 0, alternatives?: string[]): VoiceBenchObservation => {
    const start = performance.now(); const state = current.current;
    let message = 'Actualisez les données avant de poursuivre.'; let status = 'rejected';
    if (state && !saving.current && Date.now() - state.loadedAt < 120000) {
      const domain = detectProtectedVoiceDomain(phrase);
      const previousAgenda = agendaContext.current;
      const agendaAnswer = advanceEventMove(phrase, previousAgenda, state.events, state.members || [], Date.now(), timezone, state.scope);
      setResult(undefined); setMove(null); setMoveReady(false);
      if (agendaAnswer) {
        context.current = emptyFamilyVoiceContext();
        if (alternatives?.some(value => value.trim() !== phrase.trim())) { agendaContext.current = null; setSelected(''); message = 'Plusieurs transcriptions possibles. Saisissez la phrase exacte pour déplacer le rendez-vous.'; }
        else {
          agendaContext.current = agendaAnswer.draft;
          setMoveReady(agendaAnswer.ready);
          setMove(agendaAnswer.draft?.request || null);
          setSelected(previous => agendaAnswer.candidates.length === 1 ? agendaAnswer.candidates[0].id : agendaAnswer.draft?.expiresAt === previousAgenda?.expiresAt && agendaAnswer.candidates.some(row => row.id === previous) ? previous : '');
          message = agendaAnswer.message; status = agendaAnswer.draft ? 'needs_clarification' : 'cancelled';
        }
      } else if (!['courses', 'unknown'].includes(domain)) {
        context.current = emptyFamilyVoiceContext();
        message = domain === 'budget' ? 'Aucune proposition Courses conservée. Fermez cet essai, puis utilisez le micro principal pour le Budget habituel.' : 'Cette demande reste dans le module habituel. Aucun changement enregistré.';
      } else {
        agendaContext.current = null; setSelected(''); setDurations({});
        try {
          const next = parseFamilyLabVoice(phrase, context.current, { scopeKey: state.scope, list: pilotList(state.groceries), now: Date.now(), utteranceId: crypto.randomUUID(), alternatives });
          if (next.expenses.length || next.receipt?.expenses.length) {
            context.current = emptyFamilyVoiceContext(); message = 'Courses et Budget mélangés : rien n’est enregistré. Reformulez les deux demandes séparément.';
          } else {
            context.current = next.context; setResult(next); status = next.status;
            message = next.receipt ? 'Proposition confirmée oralement. Vérifiez le récapitulatif puis enregistrez.' : next.message;
          }
        } catch (error) { message = error instanceof Error ? error.message : 'Liste non interprétable.'; context.current = emptyFamilyVoiceContext(); }
      }
      commitId.current = crypto.randomUUID(); setText('');
    }
    setNotice(message);
    return { transcript: phrase, recognitionMs, parseMs: performance.now() - start, interpretation: message, status };
  }, [timezone]);
  const load = useCallback(async () => {
    const token = ++generation.current; current.current = undefined; setSnapshot(undefined); setResult(undefined); setMove(null); setSelected(''); setDurations({}); context.current = emptyFamilyVoiceContext(); agendaContext.current = null; setBlocked(false); setBusy(true);
    try {
      const next = await loadVoicePilot(foyerId, memberId);
      if (token !== generation.current) return;
      if (localStorage.getItem(pilotKey(next.scope)) !== '1') throw new Error('Le mode d’essai est désactivé.');
      current.current = next; setSnapshot(next); setFinished(false); submit(initialText);
    } catch (error) { if (token === generation.current) setNotice(error instanceof Error ? error.message : 'Chargement impossible.'); }
    finally { if (token === generation.current) setBusy(false); }
  }, [foyerId, memberId, initialText, submit]);
  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const invalidate = () => { generation.current++; current.current = undefined; };
    const check = () => {
      const state = current.current;
      if (state && (localStorage.getItem('mf_active_member_id') !== memberId || localStorage.getItem(pilotKey(state.scope)) !== '1')) { current.current = undefined; generation.current++; close.current(); }
    };
    const subscription = getSupabaseClient()?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || current.current && !current.current.scope.startsWith(`${session?.user.id}:`)) { current.current = undefined; generation.current++; close.current(); }
    });
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving.current) close.current();
      if (event.key === 'Tab') {
        const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]') || [])];
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('storage', check); window.addEventListener('focus', check); window.addEventListener('mf-voice-pilot-change', check); window.addEventListener('keydown', escape);
    return () => { clearTimeout(start); invalidate(); subscription?.data.subscription.unsubscribe(); window.removeEventListener('storage', check); window.removeEventListener('focus', check); window.removeEventListener('mf-voice-pilot-change', check); window.removeEventListener('keydown', escape); document.body.style.overflow = oldOverflow; previousFocus?.focus(); };
  }, [load, memberId]);
  const event = snapshot?.events.find(row => row.id === selected);
  const nextTime = event && move && moveReady ? requestedEventTime(event, move) : null;
  const candidates = snapshot && move ? eventMoveCandidates(snapshot.events, move) : [];
  const nearby = event && snapshot ? snapshot.events.filter(row => {
    if (row.done || !row.date_time || !event.date_time) return false;
    const delta = Date.parse(event.date_time) - Date.parse(row.date_time); return delta === 0 || delta === 86400000;
  }) : [];
  const proposal = result?.receipt?.after || result?.context.grocery.proposal;
  let changes: string[] = [];
  try { if (proposal && snapshot) changes = describeGroceryChanges(pilotList(snapshot.groceries), proposal); } catch { /* Error is shown by submit. */ }
  const canSave = Boolean(snapshot && !finished && !blocked && !busy && !listening && (move ? event && nextTime && nearby.every(row => durations[row.id] >= 5 && durations[row.id] <= 720) : result?.receipt && changes.length));
  const save = async () => {
    if (!snapshot || !canSave || saving.current) return;
    saving.current = true; setBusy(true); const token = generation.current;
    try {
      if (localStorage.getItem(pilotKey(snapshot.scope)) !== '1') throw new Error('Le mode d’essai est désactivé.');
      const action = move && event && nextTime ? { kind: 'event' as const, eventId: event.id, time: nextTime, durations, timezone } : { kind: 'groceries' as const, after: pilotAfter(snapshot.groceries, result!.receipt!.after, () => crypto.randomUUID()) };
      await commitVoicePilot(snapshot, commitId.current, action);
      if (token === generation.current) { setFinished(true); setNotice('Enregistré dans votre foyer.'); current.current = undefined; onSaved(); }
    } catch (error) { if (token === generation.current) { setBlocked(true); setNotice(error instanceof Error ? error.message : 'Enregistrement non confirmé. Actualisez avant de réessayer.'); } }
    finally { saving.current = false; if (token === generation.current) setBusy(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-3 text-family-text">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="voice-pilot-title" className="app-surface flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-family-border shadow-xl">
      <header className="flex shrink-0 items-center gap-2 border-b border-family-border p-4"><h2 id="voice-pilot-title" className="flex-1 text-lg font-bold">Vérifier ma demande</h2><button aria-label="Fermer sans autre changement" title="Fermer" disabled={busy} onClick={onClose} className="grid h-11 w-11 place-items-center"><X size={20} /></button></header>
      <div className="min-h-0 space-y-4 overflow-y-auto p-4">
        <p className="break-words text-sm text-family-text-secondary">{initialText}</p>
        <p role="status" className="break-words text-sm font-semibold">{notice}</p>
        {!finished && snapshot && !blocked && <>
          {move && <><label className="block text-sm">Rendez-vous<select aria-label="Rendez-vous à déplacer" value={selected} onChange={e => setSelected(e.target.value)} className="app-field mt-1 min-h-11 w-full rounded-lg p-2"><option value="">Choisir un rendez-vous</option>{candidates.map(row => <option key={row.id} value={row.id}>{row.title} · {row.date_time} · {row.time || 'horaire inconnu'}</option>)}</select></label>{!candidates.length && <p className="text-sm">Aucun rendez-vous correspondant. Précisez son titre exact.</p>}
            {event && <><p className="text-sm"><strong>{event.title}</strong> : {event.time || 'inconnu'} → {nextTime || 'déplacement non pris en charge'} ({timezone})</p><p className="text-xs text-family-text-secondary">Durées utilisées uniquement pour vérifier les conflits, sans modifier le carnet. Un chevauchement avec un autre membre bloque aussi cet essai.</p>{nearby.map(row => <label key={row.id} className="flex flex-wrap items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-words">{row.title} · {row.date_time} · {row.time} : durée (min)</span><input aria-label={`Durée de ${row.title}`} type="number" min="5" max="720" step="1" value={durations[row.id] || ''} onChange={e => setDurations(values => ({ ...values, [row.id]: Number(e.target.value) }))} className="app-field min-h-11 w-24 rounded-lg p-2" /></label>)}</>}
          </>}
          {!move && <ul aria-label="Modifications proposées" className="space-y-2 text-sm">{changes.map((line, i) => <li className="break-words" key={i}>{line}</li>)}</ul>}
          {result?.context.hearing?.choices.map((choice, index) => <button key={choice} disabled={listening} onClick={() => submit(String(index + 1))} className="block min-h-11 w-full break-words rounded-lg border border-family-border p-2 text-left text-sm">{index + 1}. {choice}</button>)}
          {!result?.receipt && <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (text.trim()) submit(text); }}><label className="min-w-0 flex-1 text-sm">Précision ou correction<textarea autoFocus aria-label="Précision ou correction" maxLength={500} value={text} onChange={e => setText(e.target.value)} className="app-field mt-1 w-full rounded-lg p-2" /></label><button title="Interpréter" aria-label="Interpréter" disabled={!text.trim() || listening} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-family-border disabled:opacity-40"><ArrowRight size={18} /></button></form>}
          {!result?.receipt && <VoiceBench compact realProposal onTranscript={submit} onListeningChange={setListening} />}
          {result?.status === 'proposed' && result.context.grocery.hasProposal && <button disabled={listening} onClick={() => submit('confirme')} className="flex min-h-11 items-center gap-2 text-sm"><Check size={16} />Confirmer la proposition</button>}
          {(result?.receipt || move && event) && <button disabled={!canSave} onClick={() => void save()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-family-primary px-3 text-sm font-bold text-white disabled:opacity-40"><Check size={18} />Enregistrer dans mon foyer</button>}
        </>}
        {(!snapshot || blocked) && !busy && <button onClick={() => void load()} className="flex min-h-11 items-center gap-2 text-sm"><RefreshCw size={16} />Actualiser et reprendre la demande</button>}
        {!finished && <button disabled={busy} className="min-h-11 text-sm underline" onClick={() => { localStorage.removeItem(pilotKey(scope)); window.dispatchEvent(new Event('mf-voice-pilot-change')); onClose(); }}>Revenir au micro habituel</button>}
        {finished && <button autoFocus onClick={onClose} className="min-h-11 text-sm font-bold">Terminer</button>}
      </div>
    </section>
  </div>, document.body);
}
