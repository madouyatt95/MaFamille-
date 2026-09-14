import { useEffect, useRef, useState } from 'react';
import { Check, Play, Square, ThumbsDown, ThumbsUp } from 'lucide-react';
import { assessExercise, learningExercises, mediationFrame, type SpecialistKind } from '../ai/local/workspaceSpecialists';
import type { WorkspaceRecipe } from '../ai/local/familyWorkspace';

export type SpecialistGenerator = (kind: SpecialistKind, input: string, context: string) => Promise<{ text: string; durationMs: number }>;
export function WorkspaceSpecialists({ recipes, generate, ready, onPrepare, onStop }: { recipes: WorkspaceRecipe[]; generate: SpecialistGenerator; ready: boolean; onPrepare(): void; onStop(): void }) {
  const [kind, setKind] = useState<SpecialistKind>('ecole');
  const [exerciseId, setExerciseId] = useState('fractions');
  const [attempt, setAttempt] = useState('');
  const [hint, setHint] = useState(0);
  const [stage, setStage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [passed, setPassed] = useState(false);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [agreement, setAgreement] = useState('');
  const [accepted, setAccepted] = useState([false, false]);
  const [recipeId, setRecipeId] = useState('');
  const [request, setRequest] = useState('');
  const [output, setOutput] = useState('');
  const [duration, setDuration] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<'yes' | 'no' | ''>('');
  const [consent, setConsent] = useState(false);
  const generation = useRef(0);
  const stopRef = useRef(onStop);
  useEffect(() => { stopRef.current = onStop; }, [onStop]);
  useEffect(() => () => { generation.current++; stopRef.current(); }, []);
  const exercise = learningExercises.find(item => item.id === exerciseId)!;
  const frame = mediationFrame(first, second);
  const recipe = recipes.find(item => item.id === recipeId);
  const clear = () => { generation.current++; onStop(); setBusy(false); setOutput(''); setRating(''); setDuration(undefined); };
  const run = async () => {
    if (!ready || !consent || busy || kind === 'peacemaker' && frame.blocked) return;
    const token = ++generation.current;
    const context = kind === 'ecole' ? `Niveau ${exercise.level}. Question : ${(stage ? exercise.next : exercise).question}. Tentative : ${attempt}. Retour vérifié : ${feedback}` : kind === 'peacemaker' ? `Point de vue A : ${first}\nPoint de vue B : ${second}` : recipe ? `Recette ${recipe.title}\nIngrédients : ${recipe.ingredients.join(', ')}\nÉtapes : ${recipe.steps.join('; ')}` : '';
    if (!context || !request.trim()) return;
    setBusy(true); setOutput(''); setRating(''); setDuration(undefined);
    try { const response = await generate(kind, request, context); if (generation.current === token) { setOutput(response.text); setDuration(response.durationMs); } }
    catch { if (generation.current === token) setOutput('Le modèle local n’a pas répondu. Le parcours guidé ci-dessus reste disponible.'); }
    finally { if (generation.current === token) setBusy(false); }
  };
  return <section aria-label="Aides spécialisées" className="space-y-5">
    <div role="tablist" aria-label="Spécialités" className="flex flex-wrap gap-2 border-b border-family-border pb-3">{([['ecole', 'Devoirs'], ['peacemaker', 'Médiation'], ['courses', 'Recettes']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={kind === id} onClick={() => { clear(); setKind(id); setRequest(''); }} className={`min-h-10 border-b-2 px-3 text-sm ${kind === id ? 'border-family-primary font-bold' : 'border-transparent'}`}>{label}</button>)}</div>
    {kind === 'ecole' && <div className="space-y-3">
      <label className="block text-sm">Exercice guidé<select className="app-field mt-1 w-full rounded-lg p-2" value={exerciseId} onChange={event => { clear(); setExerciseId(event.target.value); setStage(0); setHint(0); setFeedback(''); setAttempt(''); setPassed(false); }}>{learningExercises.map(item => <option key={item.id} value={item.id}>{item.title} · {item.level}</option>)}</select></label>
      <p className="font-semibold">{(stage ? exercise.next : exercise).question}</p>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); const result = assessExercise(exerciseId, attempt, stage, hint); setFeedback(result.feedback); setHint(result.hint); setPassed(result.correct); }}><input aria-label="Réponse à l’exercice" className="app-field min-w-0 flex-1 rounded-lg p-2" value={attempt} maxLength={300} onChange={event => { setAttempt(event.target.value); setPassed(false); }} /><button title="Vérifier la réponse" aria-label="Vérifier la réponse" className="grid h-11 w-11 place-items-center rounded-lg border border-family-border"><Check size={18} /></button></form>
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
      {passed && stage === 0 && <button onClick={() => { setStage(1); setAttempt(''); setPassed(false); setFeedback(''); setHint(0); }} className="min-h-10 text-sm font-bold text-family-primary">Essayer un exercice de transfert</button>}
    </div>}
    {kind === 'peacemaker' && <div className="space-y-3">
      <label className="block text-sm">Premier point de vue<textarea className="app-field mt-1 w-full rounded-lg p-2" value={first} maxLength={1000} onChange={event => { setFirst(event.target.value); setAccepted([false, false]); clear(); }} /></label>
      <label className="block text-sm">Second point de vue<textarea className="app-field mt-1 w-full rounded-lg p-2" value={second} maxLength={1000} onChange={event => { setSecond(event.target.value); setAccepted([false, false]); clear(); }} /></label>
      <p role="status" className="text-sm">{frame.message}</p><ul className="space-y-1 text-sm">{frame.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul>
      {!frame.blocked && first.trim() && second.trim() && <><label className="block text-sm">Notre accord<textarea className="app-field mt-1 w-full rounded-lg p-2" value={agreement} maxLength={1000} onChange={event => { setAgreement(event.target.value); setAccepted([false, false]); }} /></label><div className="flex flex-wrap gap-4">{['Accord de la première personne', 'Accord de la seconde personne'].map((label, index) => <label key={label} className="flex items-center gap-2 text-xs"><input type="checkbox" disabled={!agreement.trim()} checked={accepted[index]} onChange={event => setAccepted(value => value.map((item, i) => i === index ? event.target.checked : item))} />{label}</label>)}</div>{accepted.every(Boolean) && <p role="status" className="text-sm text-family-success">Accord accepté par les deux personnes pour cette séance.</p>}</>}
    </div>}
    {kind === 'courses' && <div className="space-y-3"><label className="block text-sm">Recette du carnet<select className="app-field mt-1 w-full rounded-lg p-2" value={recipeId} onChange={event => { clear(); setRecipeId(event.target.value); }}><option value="">Choisir une recette</option>{recipes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{recipe && <><ul className="list-inside list-disc text-sm">{recipe.ingredients.map((line, i) => <li key={i}>{line}</li>)}</ul><ol className="list-inside list-decimal space-y-2 text-sm">{recipe.steps.map((line, i) => <li key={i}>{line}</li>)}</ol></>}{!recipes.length && <p className="text-sm text-family-text-secondary">Chargez votre foyer pour retrouver vos recettes enregistrées.</p>}</div>}
    <div className="space-y-3 border-t border-family-border pt-4">
      <h3 className="font-bold">Une autre explication avec Qwen</h3>
      {!ready && <button onClick={onPrepare} className="min-h-10 text-sm text-family-primary">Préparer le modèle local</button>}
      <label className="block text-sm">{kind === 'courses' ? 'Contrainte ou variante souhaitée' : 'Votre demande'}<textarea className="app-field mt-1 w-full rounded-lg p-2" value={request} maxLength={1000} onChange={event => { clear(); setRequest(event.target.value); }} /></label>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); if (!event.target.checked) clear(); }} />Utiliser les informations de cette séance avec le modèle local</label>
      <div className="flex gap-2"><button disabled={!ready || !consent || !request.trim() || busy || kind === 'courses' && !recipe || kind === 'peacemaker' && (frame.blocked || !first.trim() || !second.trim())} onClick={run} className="flex min-h-11 items-center gap-2 rounded-lg border border-family-border px-3 text-sm disabled:opacity-40"><Play size={16} />Proposer une explication</button>{busy && <button onClick={clear} aria-label="Arrêter Qwen" title="Arrêter Qwen" className="grid h-11 w-11 place-items-center rounded-lg border border-family-border"><Square size={16} /></button>}</div>
      {output && <div className="space-y-3 border-l-2 border-family-primary pl-3"><p className="whitespace-pre-wrap text-sm leading-relaxed">{output}</p>{duration !== undefined && <p className="text-xs text-family-text-secondary">Proposition générée à vérifier · {(duration / 1000).toFixed(1)} s</p>}<div className="flex items-center gap-2 text-xs">Cette réponse vous aide-t-elle ?<button aria-label="Réponse utile" title="Réponse utile" aria-pressed={rating === 'yes'} onClick={() => setRating('yes')} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border"><ThumbsUp size={16} /></button><button aria-label="Réponse à améliorer" title="Réponse à améliorer" aria-pressed={rating === 'no'} onClick={() => setRating('no')} className="grid h-10 w-10 place-items-center rounded-lg border border-family-border"><ThumbsDown size={16} /></button></div></div>}
    </div>
  </section>;
}
