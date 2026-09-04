import type { FamilyModule } from '../../types.ts';
import {
  LOCAL_AI_CAPABILITY_CATALOG,
  LOCAL_AI_CAPABILITY_PACKS,
  buildCapabilitySystemPrompt,
  type LocalAiActionType
} from './capabilityCatalog.ts';
import { PARSER_DERIVED_EXAMPLES } from './parserExampleLibrary.ts';

export type LocalAiBenchmark = {
  id: string;
  module: FamilyModule;
  category: string;
  label: string;
  prompt: string;
  expectsJson: boolean;
  source: 'capability' | 'parser';
  expectedActionType?: LocalAiActionType;
  expectedSignals?: string[];
  forbiddenSignals?: string[];
};

const capabilityBenchmarks: LocalAiBenchmark[] = LOCAL_AI_CAPABILITY_PACKS.flatMap(pack =>
  pack.examples.map(example => ({
    ...example,
    id: `${pack.module}-${example.id}`,
    module: pack.module,
    category: pack.label,
    source: 'capability' as const
  }))
);

const parserBenchmarks: LocalAiBenchmark[] = PARSER_DERIVED_EXAMPLES.map(example => ({
  id: example.id,
  module: example.module,
  category: LOCAL_AI_CAPABILITY_CATALOG[example.module].label,
  label: example.label,
  prompt: example.prompt,
  expectsJson: true,
  source: 'parser',
  expectedActionType: example.expectedActionType
}));

export const LOCAL_AI_BENCHMARKS: LocalAiBenchmark[] = [
  ...capabilityBenchmarks,
  ...parserBenchmarks
];

export const STRUCTURED_ACTION_SYSTEM_PROMPT = buildCapabilitySystemPrompt(
  LOCAL_AI_CAPABILITY_CATALOG.courses,
  true
);

export const TEXT_SYSTEM_PROMPT = buildCapabilitySystemPrompt(
  LOCAL_AI_CAPABILITY_CATALOG.accueil,
  false
);
