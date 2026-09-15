import { defineConfig, mergeConfig } from 'vite';
import base from '../../vite.config';

// Explicit local-only preview: neither service nor auth can reach Supabase.
export default mergeConfig(base, defineConfig({
  server: { host: '127.0.0.1', port: 4184, strictPort: true },
  resolve: { alias: [
    { find: /.*\/services\/voicePilotService(?:\.ts)?$/, replacement: new URL('./voice-pilot-service.ts', import.meta.url).pathname },
    { find: /.*\/utils\/supabase(?:\.ts)?$/, replacement: new URL('./voice-pilot-auth.ts', import.meta.url).pathname },
  ] },
}));
