import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { loadVoicePilot } from '../services/voicePilotService';
import { pilotKey, pilotScope } from '../ai/local/voicePilot';
import { getSupabaseClient } from '../utils/supabase';

export function VoicePilotSwitch({ foyerId, memberId }: { foyerId: string; memberId: string }) {
  const [scope, setScope] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    void getSupabaseClient()?.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const key = pilotScope(data.user.id, foyerId, memberId); setScope(key);
      try { setEnabled(localStorage.getItem(pilotKey(key)) === '1'); } catch { /* Disabled without storage. */ }
    });
    return () => { active = false; };
  }, [foyerId, memberId]);
  if (Capacitor.isNativePlatform()) return null;
  const toggle = async () => {
    if (!scope || busy) return;
    setBusy(true); setNotice('');
    try {
      if (enabled) localStorage.removeItem(pilotKey(scope));
      else {
        if (!window.confirm('Activer le mode d’essai du micro sur cette PWA, pour votre propre profil parent ? Les Courses et déplacements de rendez-vous seront des propositions à confirmer avant enregistrement. Budget et iOS restent sur le fonctionnement actuel.')) return;
        const snapshot = await loadVoicePilot(foyerId, memberId);
        if (snapshot.scope !== scope) throw new Error('Le compte a changé. Rechargez le laboratoire.');
        localStorage.setItem(pilotKey(scope), '1');
      }
      setEnabled(!enabled); window.dispatchEvent(new Event('mf-voice-pilot-change'));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Activation impossible.'); }
    finally { setBusy(false); }
  };
  return <section className="border-y border-family-border py-4 text-sm" aria-label="Mode d’essai du micro PWA">
    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" role="switch" checked={enabled} disabled={busy || !scope} onChange={() => void toggle()} />Mode d’essai du micro PWA</label>
    <p className="mt-2 text-xs text-family-text-secondary">Sur cet appareil et ce profil uniquement. Courses et déplacement de rendez-vous après confirmation ; Budget inchangé. Désactivation possible à tout moment. Le Premium reste nécessaire pour le micro principal.</p>
    {notice && <p role="status" className="mt-2 text-family-warning">{notice}</p>}
  </section>;
}
