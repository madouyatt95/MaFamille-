import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { answerWorkspace, freshSnapshot, memoryMatch, type ChosenMemory, type WorkspaceAnswer, type WorkspaceRecord, type WorkspaceSnapshot } from '../ai/local/familyWorkspace';
import { deleteWorkspaceRecord, loadWorkspace, loadWorkspaceIdentity, loadWorkspaceRecords, saveWorkspaceRecord } from '../services/familyWorkspaceService';
import { getSupabaseClient } from '../utils/supabase';
import { WorkspacePlans } from './WorkspacePlans';
import { WorkspaceMemory, type SaveWorkspace } from './WorkspaceMemory';
import { WorkspaceSpecialists, type SpecialistGenerator } from './WorkspaceSpecialists';
import { VoiceBench, type VoiceBenchObservation } from './VoiceBench';

const sourceLabels = { agenda: 'Agenda', external: 'Calendriers importés', recipes: 'Recettes', groceries: 'Courses', tasks: 'Tâches' };
export function FamilyWorkspace({ generate, ready, onPrepare, onStop }: { generate: SpecialistGenerator; ready: boolean; onPrepare(): void; onStop(): void }) {
  const [identities, setIdentities] = useState<Awaited<ReturnType<typeof loadWorkspaceIdentity>>>([]);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>();
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [recordsReady, setRecordsReady] = useState(false);
  const [tab, setTab] = useState<'dialogue' | 'plans' | 'memory' | 'specialists'>('dialogue');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<WorkspaceAnswer>();
  const [memoryChoices, setMemoryChoices] = useState<WorkspaceRecord[]>([]);
  const [history, setHistory] = useState<{ text: string; reply: string; ms: number }[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceEpoch, setVoiceEpoch] = useState(0);
  const [rating, setRating] = useState('');
  const request = useRef(0);
  const authUser = useRef<string | null>(null);
  const currentSnapshot = useRef(snapshot);
  useEffect(() => { currentSnapshot.current = snapshot; }, [snapshot]);
  const clear = useCallback(() => { request.current++; setBusy(false); setVoiceActive(false); setSnapshot(undefined); setRecords([]); setRecordsReady(false); setAnswer(undefined); setHistory([]); setMemoryChoices([]); setText(''); setVoiceEpoch(value => value + 1); }, []);
  useEffect(() => {
    let active = true;
    void loadWorkspaceIdentity().then(value => { if (active) setIdentities(value); }).catch(error => { if (active) setNotice(error instanceof Error ? error.message : 'Connexion indisponible.'); });
    const client = getSupabaseClient();
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id || null;
      const changed = authUser.current !== nextUser;
      authUser.current = nextUser;
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'SIGNED_IN' && changed) {
        clear(); setIdentities([]);
        setTimeout(() => { if (active) void loadWorkspaceIdentity().then(value => { if (active) setIdentities(value); }).catch(() => {}); }, 0);
      }
    });
    const profileChanged = () => { const id = localStorage.getItem('mf_active_member_id'); if (currentSnapshot.current && id && id !== currentSnapshot.current.actorId) clear(); };
    window.addEventListener('storage', profileChanged); window.addEventListener('focus', profileChanged);
    const invalidate = () => { request.current++; };
    return () => { active = false; invalidate(); subscription?.data.subscription.unsubscribe(); window.removeEventListener('storage', profileChanged); window.removeEventListener('focus', profileChanged); };
  }, [clear]);
  const load = async (foyerId: string, actorId: string) => {
    const token = ++request.current;
    setBusy(true); setNotice(''); setSyncNotice(''); setSnapshot(undefined); setRecords([]); setRecordsReady(false); setAnswer(undefined); setHistory([]); setMemoryChoices([]); setVoiceEpoch(value => value + 1);
    try {
      const next = await loadWorkspace(foyerId, actorId);
      if (request.current !== token) return;
      setSnapshot(next);
      try { const values = await loadWorkspaceRecords(foyerId); if (request.current === token) { setRecords(values); setRecordsReady(true); } }
      catch (error) { if (request.current === token) { setRecordsReady(false); setSyncNotice(error instanceof Error ? error.message : 'Synchronisation indisponible.'); } }
    } catch (error) { if (request.current === token) setNotice(error instanceof Error ? error.message : 'Chargement impossible.'); }
    finally { if (request.current === token) setBusy(false); }
  };
  const stillOwn = () => {
    if (!snapshot || !freshSnapshot(snapshot)) throw new Error('Actualisez le contexte avant de poursuivre.');
    const active = localStorage.getItem('mf_active_member_id');
    if (active && active !== '1' && active !== snapshot.actorId) { clear(); throw new Error('Le profil actif a changé. Rechargez votre contexte.'); }
    return snapshot;
  };
  const save: SaveWorkspace = async (kind, title, audience, payload, existing) => {
    const token = request.current;
    try {
      const context = stillOwn();
      const saved = await saveWorkspaceRecord(context.foyerId, { id: existing?.id || crypto.randomUUID(), revision: existing?.revision || 0, owner_member_id: context.actorId, kind, title, audience, payload });
      if (request.current !== token) return false;
      setRecords(values => [saved, ...values.filter(record => record.id !== saved.id)]); setSyncNotice('Enregistré dans le foyer.'); return saved;
    } catch (error) { if (request.current === token) setSyncNotice(error instanceof Error ? error.message : 'Enregistrement impossible.'); return false; }
  };
  const remove = async (record: WorkspaceRecord) => {
    const token = request.current;
    try { const context = stillOwn(); await deleteWorkspaceRecord(context.foyerId, record); if (token === request.current) setRecords(values => values.filter(value => value.id !== record.id)); }
    catch (error) { if (token === request.current) setSyncNotice(error instanceof Error ? error.message : 'Suppression impossible.'); }
  };
  const submit = useCallback((phrase: string, recognitionMs = 0, alternatives?: string[], expand = true): VoiceBenchObservation => {
    const start = performance.now();
    const value = phrase.trim();
    if (!snapshot) return { transcript: value, recognitionMs, parseMs: 0, interpretation: 'Chargez votre foyer.', status: 'rejected' };
    let next: WorkspaceAnswer;
    const matches = expand ? memoryMatch(value, records) : [];
    if (!freshSnapshot(snapshot)) {
      next = { kind: 'clarify', message: 'Actualisez le contexte du foyer avant de poursuivre.', lines: [], references: [] }; setMemoryChoices([]);
    } else if (alternatives?.some(candidate => candidate.trim() !== value && JSON.stringify(answerWorkspace(candidate, snapshot, answer)) !== JSON.stringify(answerWorkspace(value, snapshot, answer)))) {
      next = { kind: 'clarify', message: 'Plusieurs phrases ont été reconnues. Corrigez la transcription à l’écran avant de poursuivre.', lines: alternatives, references: [] };
    } else if (matches.length) {
      setMemoryChoices(matches);
      next = { kind: 'answer', message: 'Cette phrase correspond à une information que vous avez choisie.', lines: matches.map(record => (record.payload as ChosenMemory).meaning), references: [] };
    } else { setMemoryChoices([]); next = answerWorkspace(value, snapshot, answer); }
    const ms = performance.now() - start;
    setAnswer(next); setText(''); setRating(''); setHistory(values => [...values, { text: value, reply: next.message, ms }].slice(-12));
    return { transcript: value, recognitionMs, parseMs: ms, interpretation: next.message, speech: `${next.message} ${next.lines.slice(0, 3).join('. ')}`, status: next.kind === 'clarify' ? 'needs_clarification' : 'answered' };
  }, [answer, records, snapshot]);
  return <section aria-label="Mon foyer" className="mt-5 space-y-5">
    <div className="flex flex-wrap items-center gap-3 border-b border-family-border pb-4"><div className="min-w-0 flex-1"><h2 className="text-lg font-bold">Mon foyer</h2><p className="mt-1 text-xs text-family-text-secondary">{snapshot ? `${snapshot.actorName} · actualisé à ${new Date(snapshot.fetchedAt).toLocaleTimeString('fr-FR')} · ${snapshot.timezone}` : 'Choisissez votre profil pour charger les informations autorisées.'}</p></div>{snapshot && <><button disabled={busy || voiceActive} title="Actualiser le foyer" aria-label="Actualiser le foyer" onClick={() => void load(snapshot.foyerId, snapshot.actorId)} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border disabled:opacity-40"><RefreshCw size={18} /></button><button title="Effacer le contexte de cet écran" aria-label="Effacer le contexte de cet écran" onClick={clear} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border"><Trash2 size={18} /></button></>}</div>
    {!snapshot && <div className="space-y-3">{identities.map(identity => <button disabled={busy} key={identity.id} onClick={() => void load(identity.foyerId, identity.id)} className="flex min-h-11 items-center gap-2 rounded-lg border border-family-border px-3 text-sm disabled:opacity-40"><RefreshCw size={16} />Charger le foyer de {identity.name}</button>)}{!identities.length && <a className="inline-flex min-h-11 items-center text-sm text-family-primary" href="/app">Ouvrir MyFamily+ pour se connecter</a>}</div>}
    {busy && <p role="status" className="text-sm">Chargement du contexte autorisé…</p>}{notice && <p role="status" className="text-sm text-family-warning">{notice}</p>}
    {snapshot && <><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="État des sources">{Object.entries(snapshot.sources).map(([key, status]) => <span key={key} className={status.state === 'ready' ? 'text-family-text-secondary' : 'text-family-warning'}>{sourceLabels[key as keyof typeof sourceLabels]} : {status.state === 'ready' ? `${status.count} éléments` : status.state === 'limited' ? 'liste partielle' : 'indisponible'}</span>)}</div><p className="text-xs text-family-text-secondary">Période consultée : {snapshot.range.start} au {snapshot.range.end}. Les préparations et préférences sont séparées de l’agenda et des courses.</p></>}
    <div role="tablist" aria-label="Parcours du foyer" className="flex flex-wrap border-b border-family-border">{([['dialogue', 'Questions'], ['plans', 'Préparer'], ['memory', 'Mémoire'], ['specialists', 'Aides spécialisées']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} disabled={!snapshot && id !== 'specialists' || voiceActive} onClick={() => setTab(id)} className={`min-h-11 border-b-2 px-3 text-sm disabled:opacity-40 ${tab === id ? 'border-family-primary font-bold' : 'border-transparent'}`}>{label}</button>)}</div>
    {tab === 'dialogue' && snapshot && <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"><div className="min-w-0 space-y-4">
      <ol aria-label="Dialogue avec le foyer" className="space-y-3 text-sm">{history.map((item, index) => <li key={index} className="space-y-1 border-l-2 border-family-border pl-3"><p className="break-words font-semibold">{item.text}</p><p className="break-words text-family-text-secondary">{item.reply}</p></li>)}</ol>
      {!history.length && <p className="text-sm text-family-text-secondary">« Qu’avons-nous vendredi ? » · « Quels créneaux libres demain après-midi ? » · « Quelles recettes avons-nous ? »</p>}
      {answer && <div className="space-y-2" aria-live="polite"><p role="status" className="text-sm font-semibold">{answer.message}</p><ul className="space-y-2 text-sm">{answer.lines.map((line, index) => <li className="break-words" key={index}>{line}</li>)}</ul>{memoryChoices.filter(record => (record.payload as ChosenMemory).kind === 'shortcut').map(record => <button key={record.id} onClick={() => submit((record.payload as ChosenMemory).meaning, 0, undefined, false)} className="flex min-h-10 items-center gap-2 text-sm text-family-primary"><ArrowRight size={16} />Utiliser « {record.title} »</button>)}{answer.kind === 'unsupported' && <button onClick={() => setTab('plans')} className="min-h-10 text-sm text-family-primary">Ouvrir les préparations</button>}</div>}
      <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); if (text.trim()) submit(text); }}><label className="min-w-0 flex-1 text-sm">Votre demande<textarea aria-label="Demande à mon foyer" maxLength={500} value={text} onChange={event => setText(event.target.value)} className="app-field mt-1 w-full rounded-lg p-2" /></label><button disabled={!text.trim() || voiceActive} title="Consulter le foyer" aria-label="Consulter le foyer" className="grid h-11 w-11 place-items-center rounded-lg border border-family-border disabled:opacity-40"><ArrowRight size={18} /></button></form>
      <VoiceBench key={`${snapshot.actorId}:${voiceEpoch}`} onTranscript={submit} onListeningChange={setVoiceActive} compact />
      {history.length > 0 && <label className="block text-xs">Résultat conforme à ma demande<select className="app-field mt-1 min-h-10 w-full rounded-lg p-2" value={rating} onChange={event => setRating(event.target.value)}><option value="">Non évalué</option><option value="correct">Oui</option><option value="wrong">À corriger</option></select></label>}
    </div><aside className="min-w-0 space-y-3 border-t border-family-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h3 className="text-sm font-bold">Informations utilisées</h3>{answer?.references.map(reference => <a key={reference.id} href={reference.href} className="flex min-h-11 items-center gap-2 break-words text-sm text-family-primary"><ExternalLink size={15} className="shrink-0" />{reference.label}</a>)}{!answer?.references.length && <p className="text-xs text-family-text-secondary">Aucune source sélectionnée pour cette réponse.</p>}<p className="text-xs text-family-text-secondary">Le contexte reste dans la mémoire de cet écran. Aucune donnée du foyer n’est envoyée à Qwen par les questions.</p></aside></div>}
    {tab === 'plans' && snapshot && <WorkspacePlans key={snapshot.fetchedAt} snapshot={snapshot} records={records} save={save} available={recordsReady} />}
    {tab === 'memory' && snapshot && <WorkspaceMemory key={snapshot.actorId} snapshot={snapshot} records={records} save={save} remove={remove} available={recordsReady} />}
    {tab === 'specialists' && <WorkspaceSpecialists recipes={snapshot?.recipes || []} generate={generate} ready={ready} onPrepare={onPrepare} onStop={onStop} />}
    {syncNotice && <p role="status" className="text-sm text-family-warning">{syncNotice}</p>}
    {records.length > 0 && <details className="border-t border-family-border pt-4"><summary className="cursor-pointer text-sm">Mes préparations et informations conservées</summary><ul className="mt-3 divide-y divide-family-border">{records.map(record => <li key={record.id} className="flex items-center gap-3 py-2"><span className="min-w-0 flex-1 break-words text-sm">{record.title} · {record.audience === 'family' ? 'Famille' : 'Personnel'}</span>{snapshot && (record.owner_member_id === snapshot.actorId || record.audience === 'family' && snapshot.parent) && <button title={`Supprimer ${record.title}`} aria-label={`Supprimer ${record.title}`} onClick={() => { if (window.confirm(`Supprimer « ${record.title} » des préparations synchronisées ?`)) void remove(record); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-family-border"><Trash2 size={16} /></button>}</li>)}</ul><button title="Exporter mes préparations" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'myfamily-preparations.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="mt-3 flex min-h-10 items-center gap-2 text-sm"><Download size={16} />Exporter les informations conservées</button></details>}
  </section>;
}
