import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Gauge,
  HardDrive,
  Play,
  ShieldCheck,
  Square,
  Trash2
} from 'lucide-react';
import { LocalQwenProvider } from '../ai/local/LocalQwenProvider';
import {
  LOCAL_QWEN_ESTIMATED_BYTES,
  LOCAL_QWEN_MODEL_ID,
  LOCAL_QWEN_MODEL_REVISION,
  type LocalAiBackend,
  type LocalAiCompatibility,
  type LocalGenerationResult,
  type LocalQwenProgress
} from '../ai/local/contracts';
import {
  LOCAL_AI_BENCHMARKS
} from '../ai/local/benchmarks';
import {
  LOCAL_AI_CAPABILITY_PACKS,
  buildCapabilitySystemPrompt,
  getLocalAiCapabilityPack
} from '../ai/local/capabilityCatalog';
import { evaluateDeterministicGuardrail } from '../ai/local/deterministicGuardrails';
import { GroceryParserLab } from './GroceryParserLab';
import { HouseholdAssistantLab } from './HouseholdAssistantLab';
import { validateStructuredAction } from '../ai/local/structuredAction';

type EngineState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return 'Non disponible';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} Go`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
};

const formatDuration = (milliseconds: number) => {
  if (milliseconds < 1000) return `${milliseconds.toFixed(0)} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
};

export function AiLab() {
  const [view, setView] = useState<'assistant' | 'courses' | 'qwen'>('assistant');
  const providerRef = useRef<LocalQwenProvider | null>(null);
  const [compatibility, setCompatibility] = useState<LocalAiCompatibility | null>(null);
  const [backend, setBackend] = useState<LocalAiBackend>('webgpu');
  const [allowSlowWasm, setAllowSlowWasm] = useState(false);
  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [progress, setProgress] = useState<LocalQwenProgress | null>(null);
  const [cachedRequests, setCachedRequests] = useState(0);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState(LOCAL_AI_BENCHMARKS[1].id);
  const selectedBenchmark = useMemo(
    () => LOCAL_AI_BENCHMARKS.find(item => item.id === selectedBenchmarkId) || LOCAL_AI_BENCHMARKS[0],
    [selectedBenchmarkId]
  );
  const selectedCapability = useMemo(
    () => getLocalAiCapabilityPack(selectedBenchmark.module),
    [selectedBenchmark.module]
  );
  const moduleBenchmarks = useMemo(
    () => LOCAL_AI_BENCHMARKS.filter(item => item.module === selectedBenchmark.module),
    [selectedBenchmark.module]
  );
  const [prompt, setPrompt] = useState(selectedBenchmark.prompt);
  const [expectsJson, setExpectsJson] = useState(selectedBenchmark.expectsJson);
  const [streamedText, setStreamedText] = useState('');
  const [result, setResult] = useState<LocalGenerationResult | null>(null);
  const [guardrailReason, setGuardrailReason] = useState('');
  const [loadDurationMs, setLoadDurationMs] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      LocalQwenProvider.detectCompatibility(),
      LocalQwenProvider.getCachedRequestCount()
    ]).then(([nextCompatibility, count]) => {
      if (!active) return;
      setCompatibility(nextCompatibility);
      setCachedRequests(count);
      if (nextCompatibility.recommendedBackend) setBackend(nextCompatibility.recommendedBackend);
      else setBackend('wasm');
    });
    return () => {
      active = false;
      providerRef.current?.terminate();
    };
  }, []);

  const getProvider = () => {
    if (!providerRef.current) providerRef.current = new LocalQwenProvider();
    return providerRef.current;
  };

  const canLoad = backend === 'webgpu'
    ? Boolean(compatibility?.webGpuAvailable)
    : Boolean(compatibility?.wasmAvailable && allowSlowWasm);

  const handleLoad = async () => {
    setError('');
    setEngineState('loading');
    setProgress(null);
    try {
      const loaded = await getProvider().load(backend, nextProgress => setProgress(nextProgress));
      setLoadDurationMs(loaded.loadDurationMs);
      setCachedRequests(await LocalQwenProvider.getCachedRequestCount());
      setCompatibility(await LocalQwenProvider.detectCompatibility());
      setEngineState('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setEngineState('error');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError('');
    setResult(null);
    setStreamedText('');
    setGuardrailReason('');
    setEngineState('generating');
    try {
      const guardrail = evaluateDeterministicGuardrail(selectedCapability, prompt.trim(), expectsJson);
      if (guardrail) {
        setGuardrailReason(guardrail.reason);
        setStreamedText(guardrail.response);
        setResult({ text: guardrail.response, durationMs: 0, generatedTokens: 0, tokensPerSecond: 0 });
        setEngineState('ready');
        return;
      }
      const generated = await getProvider().generate({
        prompt: prompt.trim(),
        systemPrompt: buildCapabilitySystemPrompt(selectedCapability, expectsJson),
        maxNewTokens: expectsJson ? 192 : 256,
        onToken: token => setStreamedText(current => current + token)
      });
      setResult(generated);
      setStreamedText(generated.text);
      setEngineState('ready');
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : String(generationError));
      setEngineState('error');
    }
  };

  const handleStop = () => {
    providerRef.current?.terminate();
    providerRef.current = null;
    setEngineState('idle');
    setError('Génération interrompue. Le worker local a été arrêté.');
  };

  const handleClearCache = async () => {
    if (!window.confirm('Supprimer le moteur Qwen téléchargé sur cet appareil ?')) return;
    handleStop();
    await LocalQwenProvider.clearModelCache();
    setCachedRequests(0);
    setCompatibility(await LocalQwenProvider.detectCompatibility());
  };

  const handlePersistentStorage = async () => {
    const persistentStorage = await LocalQwenProvider.requestPersistentStorage();
    setCompatibility(current => current ? { ...current, persistentStorage } : current);
  };

  const handleBenchmarkChange = (benchmarkId: string) => {
    const benchmark = LOCAL_AI_BENCHMARKS.find(item => item.id === benchmarkId) || LOCAL_AI_BENCHMARKS[0];
    setSelectedBenchmarkId(benchmark.id);
    setPrompt(benchmark.prompt);
    setExpectsJson(benchmark.expectsJson);
    setStreamedText('');
    setResult(null);
    setGuardrailReason('');
  };

  const handleModuleChange = (module: string) => {
    const benchmark = LOCAL_AI_BENCHMARKS.find(item => item.module === module);
    if (benchmark) handleBenchmarkChange(benchmark.id);
  };

  const structuredResult = expectsJson && streamedText ? validateStructuredAction(streamedText) : null;
  const expectedActionMatches = structuredResult && selectedBenchmark.expectedActionType
    ? structuredResult.actionTypes.includes(selectedBenchmark.expectedActionType)
    : null;
  const normalizedText = streamedText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const expectedSignalsMatch = selectedBenchmark.expectedSignals?.length
    ? selectedBenchmark.expectedSignals.some(signal => normalizedText.includes(signal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
    : null;
  const forbiddenSignalFound = selectedBenchmark.forbiddenSignals?.find(signal =>
    normalizedText.includes(signal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  ) || null;
  const progressPercent = progress?.progress ?? 0;

  return (
    <main className="min-h-screen bg-family-bg text-family-text">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
        <header className="flex flex-wrap items-center gap-3 border-b border-family-border pb-5">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="grid h-10 w-10 place-items-center rounded-lg border border-family-border bg-family-surface text-family-text-secondary"
            title="Retour"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-family-primary">
              <Cpu className="h-4 w-4" />
              Laboratoire local
            </div>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">{view === 'qwen' ? 'Qwen 3.5 0.8B' : view === 'courses' ? 'Parseur Courses' : 'Assistant familial'}</h1>
            <p className="mt-1 text-xs text-family-text-secondary">POC isolé · aucune action MyFamily+ n’est exécutée</p>
          </div>
          <span className="rounded-md border border-family-border bg-family-surface px-3 py-2 text-[10px] font-black uppercase text-family-text-secondary">
            {view !== 'qwen' ? 'Sans modèle IA' : engineState === 'ready' ? 'Moteur prêt' : engineState === 'loading' ? 'Installation' : engineState === 'generating' ? 'Inférence' : 'Inactif'}
          </span>
        </header>
        <div role="tablist" aria-label="Outils du laboratoire" className="mt-4 grid grid-cols-3 border-b border-family-border">{([['assistant', 'Assistant familial'], ['courses', 'Parseur Courses'], ['qwen', 'Qwen']] as const).map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={view === key} onClick={() => { if (key === view) return; if (view === 'assistant' && !window.confirm('Changer d’outil efface le contexte de test non exporté et arrête le dialogue. Continuer ?')) return; setView(key); }} className={`min-h-11 px-2 py-2 text-xs font-bold ${view === key ? 'border-b-2 border-family-primary text-family-primary' : 'text-family-text-secondary'}`}>{label}</button>)}</div>
        {view === 'assistant' ? <HouseholdAssistantLab /> : view === 'courses' ? <GroceryParserLab prompt="Ajoute deux bouteilles de lait à la liste de courses." /> : <>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <section className="border-b border-family-border pb-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black">Compatibilité de l’appareil</h2>
                  <p className="mt-1 text-xs text-family-text-secondary">Mesure locale du navigateur courant.</p>
                </div>
                {compatibility?.recommendedBackend ? <CheckCircle2 className="h-5 w-5 text-family-success" /> : <AlertTriangle className="h-5 w-5 text-family-warning" />}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <Metric label="WebGPU" value={compatibility?.webGpuAvailable ? 'Disponible' : 'Indisponible'} />
                <Metric label="WASM" value={compatibility?.wasmAvailable ? 'Disponible' : 'Indisponible'} />
                <Metric label="Mémoire déclarée" value={compatibility?.deviceMemoryGb ? `${compatibility.deviceMemoryGb} Go` : 'Non exposée'} />
                <Metric label="Cœurs logiques" value={String(compatibility?.hardwareConcurrency || '—')} />
                <Metric label="Stockage utilisé" value={formatBytes(compatibility?.storageUsage ?? null)} />
                <Metric label="Quota navigateur" value={formatBytes(compatibility?.storageQuota ?? null)} />
              </dl>
              {compatibility?.isIos && (
                <p className="mt-4 flex gap-2 rounded-lg border border-family-warning/30 bg-family-warning/10 p-3 text-xs leading-relaxed text-family-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  WebGPU n’est pas retenu sur iOS. Le test WASM reste expérimental et peut être trop lent pour ce modèle.
                </p>
              )}
            </section>

            <section className="border-b border-family-border pb-6">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-family-primary" />
                <h2 className="text-sm font-black">Installation locale</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-family-text-secondary">
                Révision verrouillée <code className="text-family-text">{LOCAL_QWEN_MODEL_REVISION.slice(0, 8)}</code> · téléchargement estimé {formatBytes(LOCAL_QWEN_ESTIMATED_BYTES)}.
              </p>
              <div className="mt-4 grid grid-cols-2 rounded-lg border border-family-border p-1">
                {(['webgpu', 'wasm'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setBackend(option)}
                    className={`min-h-10 rounded-md text-xs font-black uppercase ${backend === option ? 'bg-family-primary text-white' : 'text-family-text-secondary'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {backend === 'wasm' && (
                <label className="mt-3 flex items-start gap-3 text-xs text-family-text-secondary">
                  <input type="checkbox" className="mt-0.5" checked={allowSlowWasm} onChange={event => setAllowSlowWasm(event.target.checked)} />
                  Autoriser le test CPU lent sur cet appareil
                </label>
              )}
              {engineState === 'loading' && (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-family-surface">
                    <div className="h-full bg-family-primary transition-[width]" style={{ width: `${Math.max(2, progressPercent)}%` }} />
                  </div>
                  <p className="mt-2 truncate text-[10px] text-family-text-secondary">{progress?.file || progress?.status || 'Préparation du moteur'} · {progressPercent.toFixed(0)} %</p>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleLoad}
                  disabled={!canLoad || engineState === 'loading' || engineState === 'generating'}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-family-primary px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Installer / charger
                </button>
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={engineState === 'loading'}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-family-border bg-family-surface px-3 text-xs font-black text-family-text-secondary disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-family-text-secondary">
                <span>{cachedRequests} ressource{cachedRequests > 1 ? 's' : ''} en cache</span>
                {!compatibility?.persistentStorage && (
                  <button type="button" onClick={handlePersistentStorage} className="font-black text-family-primary">Protéger le stockage</button>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-family-success" />
                <h2 className="text-sm font-black">Périmètre de sécurité</h2>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-family-text-secondary">
                <li>Aucun accès aux données du foyer réel</li>
                <li>Actions limitées à la simulation locale</li>
                <li>Texte saisi ou dicté dans ce laboratoire uniquement</li>
                <li>Parseur vocal et API existantes inchangés</li>
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section className="border-b border-family-border pb-6">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-family-primary" />
                <h2 className="text-sm font-black">Bibliothèque de benchmark · {LOCAL_AI_BENCHMARKS.length}</h2>
              </div>
              <label className="mt-4 block text-[10px] font-black uppercase text-family-text-secondary">
                Module
                <select
                  value={selectedBenchmark.module}
                  onChange={event => handleModuleChange(event.target.value)}
                  className="app-field mt-2 min-h-11 w-full rounded-lg px-3 text-xs"
                >
                  {LOCAL_AI_CAPABILITY_PACKS.map(pack => <option key={pack.module} value={pack.module}>{pack.label}</option>)}
                </select>
              </label>
              <label className="mt-4 block text-[10px] font-black uppercase text-family-text-secondary">
                Scénario
                <select
                  value={selectedBenchmarkId}
                  onChange={event => handleBenchmarkChange(event.target.value)}
                  className="app-field mt-2 min-h-11 w-full rounded-lg px-3 text-xs"
                >
                  {moduleBenchmarks.map(item => <option key={item.id} value={item.id}>{item.label}{item.source === 'parser' ? ' · parseur' : ''}</option>)}
                </select>
              </label>
              <div className="mt-3 rounded-lg border border-family-border bg-family-surface p-3">
                <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase">
                  <span className="rounded-md bg-family-primary/12 px-2 py-1 text-family-primary">{selectedCapability.mode}</span>
                  <span className={`rounded-md px-2 py-1 ${selectedCapability.risk === 'critical' || selectedCapability.risk === 'high' ? 'bg-family-danger/12 text-family-danger' : 'bg-family-warning/12 text-family-warning'}`}>Risque {selectedCapability.risk}</span>
                  <span className="rounded-md bg-family-border px-2 py-1 text-family-text-secondary">{selectedBenchmark.source === 'parser' ? 'Source parseur' : 'Cas métier'}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-family-text-secondary">{selectedCapability.purpose}</p>
              </div>
              <label className="mt-4 block text-[10px] font-black uppercase text-family-text-secondary">
                Entrée
                <textarea
                  value={prompt}
                  onChange={event => {
                    setPrompt(event.target.value);
                  }}
                  rows={5}
                  className="app-field mt-2 w-full resize-y rounded-lg p-3 text-sm leading-relaxed"
                />
              </label>
              {selectedCapability.module === 'courses' && <GroceryParserLab key={prompt} prompt={prompt} />}
              <label className="mt-3 flex items-center gap-3 text-xs text-family-text-secondary">
                <input type="checkbox" checked={expectsJson} onChange={event => setExpectsJson(event.target.checked)} />
                Exiger une proposition d’action JSON stricte
              </label>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={engineState !== 'ready' || !prompt.trim()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-family-primary px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  Lancer le test
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={engineState !== 'generating' && engineState !== 'loading'}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-family-border bg-family-surface text-family-text-secondary disabled:opacity-30"
                  title="Arrêter"
                  aria-label="Arrêter"
                >
                  <Square className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-family-primary" />
                  <h2 className="text-sm font-black">Résultat local</h2>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {guardrailReason && (
                    <span className="rounded-md border border-family-success/30 bg-family-success/10 px-2 py-1 text-[9px] font-black uppercase text-family-success">
                      Garde-fou déterministe
                    </span>
                  )}
                  {structuredResult && (
                    <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${structuredResult.validSchema && expectedActionMatches !== false ? 'bg-family-success/15 text-family-success' : 'bg-family-danger/15 text-family-danger'}`}>
                      {!structuredResult.validSchema ? 'Schéma invalide' : expectedActionMatches === false ? 'Intention incorrecte' : 'Action correcte'}
                    </span>
                  )}
                  {!structuredResult && streamedText && expectedSignalsMatch !== null && (
                    <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${expectedSignalsMatch && !forbiddenSignalFound ? 'bg-family-success/15 text-family-success' : 'bg-family-danger/15 text-family-danger'}`}>
                      {expectedSignalsMatch && !forbiddenSignalFound ? 'Garde-fou présent' : 'Garde-fou absent'}
                    </span>
                  )}
                </div>
              </div>
              <pre className="mt-4 min-h-56 whitespace-pre-wrap break-words rounded-lg border border-family-border bg-family-surface p-4 text-xs leading-relaxed text-family-text">
                {streamedText || 'La réponse apparaîtra ici sans quitter cet appareil.'}
              </pre>
              {structuredResult?.reason && <p className="mt-3 text-xs font-bold text-family-danger">{structuredResult.reason}</p>}
              {structuredResult?.validSchema && expectedActionMatches === false && (
                <p className="mt-3 text-xs font-bold text-family-danger">Action attendue : {selectedBenchmark.expectedActionType} · obtenue : {structuredResult.actionTypes.join(', ')}</p>
              )}
              {forbiddenSignalFound && <p className="mt-3 text-xs font-bold text-family-danger">Signal interdit détecté : {forbiddenSignalFound}</p>}
              {error && <p className="mt-3 rounded-lg border border-family-danger/25 bg-family-danger/10 p-3 text-xs text-family-danger">{error}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Chargement" value={loadDurationMs === null ? '—' : formatDuration(loadDurationMs)} />
                <Metric label="Inférence" value={result ? formatDuration(result.durationMs) : '—'} />
                <Metric label="Tokens" value={result ? String(result.generatedTokens) : '—'} />
                <Metric label="Vitesse" value={result ? `${result.tokensPerSecond.toFixed(1)} tok/s` : '—'} />
              </dl>
            </section>
          </div>
        </div>

        <footer className="mt-8 border-t border-family-border pt-4 text-[10px] text-family-text-secondary">
          {LOCAL_QWEN_MODEL_ID} · Transformers.js · données traitées localement après téléchargement
        </footer>
        </>}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-black uppercase text-family-text-secondary">{label}</dt>
      <dd className="mt-1 truncate text-xs font-black text-family-text">{value}</dd>
    </div>
  );
}
