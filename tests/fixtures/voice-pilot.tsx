import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import VoicePilotPanel from '../../src/components/voice/VoicePilotPanel';
import '../../src/index.css';
// Only served by Vite in the isolated browser check, never a production route.
if (import.meta.env.DEV && location.hostname === '127.0.0.1') {
  const params = new URLSearchParams(location.search);
  document.documentElement.className = `theme-${params.get('theme') || 'dark'}`;
  localStorage.setItem('mf_active_member_id', 'parent-test');
  localStorage.setItem('mf_voice_pilot_v1:test:foyer-test:parent-test', '1');
  function Fixture() {
    const [open, setOpen] = useState(true);
    return <><button onClick={() => setOpen(true)}>Nouvelle demande fictive</button>{open && <VoicePilotPanel initialText={params.get('phrase') || 'ajoute deux packs de six yaourts, un nature et l’autre à la fraise'} foyerId="foyer-test" memberId="parent-test" scope="test:foyer-test:parent-test" onOpenMeals={() => { setOpen(false); document.body.dataset.mealsOpened = 'true'; }} onClose={() => { setOpen(false); document.body.dataset.closed = 'true'; }} onSaved={() => { document.body.dataset.saved = 'true'; }} />}</>;
  }
  createRoot(document.getElementById('root')!).render(<Fixture />);
}
