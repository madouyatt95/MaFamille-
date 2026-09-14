import { useState } from 'react';
import { Download, Play, Save, Trash2 } from 'lucide-react';
import { feedbackKey, replayFeedback, validFeedback, type ParserFeedback } from '../ai/local/parserFeedback';

export function ParserFeedbackPanel({ scope, turns }: { scope: string; turns: string[] }) {
  const [rows, setRows] = useState<ParserFeedback[]>(() => { try { const parsed: unknown = JSON.parse(localStorage.getItem(feedbackKey(scope)) || '[]'); return Array.isArray(parsed) ? parsed.filter(validFeedback).slice(-50) : []; } catch { return []; } });
  const [input, setInput] = useState(turns.slice(-10).join('\n'));
  const [names, setNames] = useState('');
  const [status, setStatus] = useState<ParserFeedback['expectedStatus']>('proposed');
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('');
  const persist = (next: ParserFeedback[]) => { try { localStorage.setItem(feedbackKey(scope), JSON.stringify(next)); setRows(next); } catch { setNotice('Stockage indisponible. Aucun retour enregistré.'); } };
  return <details className="mt-4 border-t border-family-border pt-3 text-sm"><summary className="cursor-pointer py-2">Ce n’est pas ce que j’ai demandé</summary>
    <p className="mt-2 text-xs text-family-text-secondary">Cas rejoué depuis une liste vide. Les phrases restent sur cet appareil, sans audio ni envoi automatique. Retirez les informations personnelles avant un export.</p>
    <label className="mt-3 block">Phrases à rejouer, une par ligne<textarea aria-label="Phrases à rejouer" value={input} onChange={event => setInput(event.target.value)} maxLength={5000} className="app-field mt-1 w-full rounded-lg p-2" /></label>
    <button type="button" className="min-h-10 text-xs underline" onClick={() => setInput(turns.slice(-10).join('\n'))}>Reprendre les dernières phrases</button>
    <label className="mt-3 block">Résultat attendu<select value={status} onChange={event => setStatus(event.target.value as ParserFeedback['expectedStatus'])} className="app-field mt-1 min-h-11 w-full rounded-lg p-2"><option value="proposed">Proposition</option><option value="needs_clarification">Question</option><option value="out_of_scope">Autre module</option><option value="cancelled">Annulation</option></select></label>
    <label className="mt-3 block">Produits attendus, séparés par une virgule<input value={names} onChange={event => setNames(event.target.value)} maxLength={1400} className="app-field mt-1 min-h-11 w-full rounded-lg p-2" /></label>
    <label className="mt-3 flex gap-2"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Je souhaite conserver ce cas de test sur cet appareil.</label>
    <button disabled={!consent || !input.trim()} className="mt-3 inline-flex min-h-11 items-center gap-2 disabled:opacity-40" onClick={() => { const row: ParserFeedback = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), turns: input.split('\n').map(value => value.trim()).filter(Boolean), expectedNames: names.split(',').map(value => value.trim()).filter(Boolean), expectedStatus: status }; if (!validFeedback(row)) { setNotice('Limite : dix phrases de 500 caractères et vingt produits.'); return; } persist([...rows, row].slice(-50)); setConsent(false); }}><Save size={16} />Conserver le cas</button>
    <ul className="divide-y divide-family-border">{rows.map(row => <li key={row.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 break-words">{row.turns[0]}</span><button title="Rejouer le test" aria-label="Rejouer le test" onClick={() => { const result = replayFeedback(row); setNotice(`${result.passed ? 'Conforme' : 'À corriger'} : ${result.status} · ${result.names.join(', ') || 'aucun produit'}`); }} className="grid h-11 w-11 shrink-0 place-items-center"><Play size={16} /></button><button title="Oublier ce test" aria-label="Oublier ce test" onClick={() => persist(rows.filter(value => value.id !== row.id))} className="grid h-11 w-11 shrink-0 place-items-center"><Trash2 size={16} /></button></li>)}</ul>
    {!!rows.length && <button className="inline-flex min-h-11 items-center gap-2" onClick={() => { if (!window.confirm('Exporter les phrases affichées dans un fichier local ? Vérifiez qu’elles ne contiennent pas d’informations privées avant de le partager.')) return; const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'myfamily-parser-tests.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}><Download size={16} />Exporter les tests</button>}
    {notice && <p role="status" className="mt-2 text-sm">{notice}</p>}
  </details>;
}
