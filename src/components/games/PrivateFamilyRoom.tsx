import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, LogIn, Radio, Users, X } from 'lucide-react';
import { familyGameService, type FamilyGameRoom, type FamilyGameType } from '../../services/familyGameService';

interface PrivateFamilyRoomProps {
  foyerId: string;
  familyName: string;
  selectedGame: FamilyGameType;
  onRoomReady?: (room: FamilyGameRoom) => void;
  onRoomClosed?: () => void;
}

export function PrivateFamilyRoom({ foyerId, familyName, selectedGame, onRoomReady, onRoomClosed }: PrivateFamilyRoomProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [room, setRoom] = useState<FamilyGameRoom | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const roomId = room?.id;

  useEffect(() => {
    if (!roomId) return;
    const channel = familyGameService.subscribeToRoom(roomId, nextRoom => {
      setRoom(nextRoom);
      if (nextRoom.status === 'active') onRoomReady?.(nextRoom);
    });
    return () => {
      void familyGameService.unsubscribe(channel);
    };
  }, [onRoomReady, roomId]);

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const nextRoom = await familyGameService.createRoom(foyerId, selectedGame, familyName);
      setRoom(nextRoom);
      setMode('create');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Création de la partie impossible.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const nextRoom = await familyGameService.joinRoom(foyerId, code, familyName);
      setRoom(nextRoom);
      onRoomReady?.(nextRoom);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Ce code est invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(`Code à partager : ${room.code}`);
    }
  };

  const closeRoom = async () => {
    if (!room) return;
    setLoading(true);
    setError('');
    try {
      await familyGameService.performRoomAction(
        room.id,
        foyerId,
        room.hostFoyerId === foyerId ? 'cancel' : 'leave'
      );
      setRoom(null);
      setMode('menu');
      onRoomClosed?.();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de quitter la salle.');
    } finally {
      setLoading(false);
    }
  };

  if (room) {
    const active = room.status === 'active';
    return (
      <div className="glass-panel rounded-[24px] border border-[#6C5CFF]/20 p-5 text-center space-y-4">
        <span className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-[#00D26A]/12 text-[#00D26A]' : 'bg-[#6C5CFF]/12 text-[#6C5CFF]'}`}>
          {active ? <Users className="w-6 h-6" /> : <Radio className="w-6 h-6 animate-pulse" />}
        </span>
        <div>
          <h3 className="text-base font-black text-white">{active ? `${room.guestName} a rejoint la partie` : 'En attente d’une autre famille'}</h3>
          <p className="mt-1 text-xs text-white/50">{active ? 'La salle privée est prête.' : 'Partagez uniquement ce code à une famille que vous connaissez.'}</p>
        </div>
        <button type="button" onClick={copyCode} className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-4 flex items-center justify-between">
          <span className="text-2xl font-black tracking-[0.28em] text-white pl-[0.28em]">{room.code}</span>
          {copied ? <Check className="w-5 h-5 text-[#00D26A]" /> : <Copy className="w-5 h-5 text-white/50" />}
        </button>
        <p className="text-[10px] text-white/40">Le code expire automatiquement sous 2 heures.</p>
        <button type="button" onClick={() => void closeRoom()} disabled={loading} className="w-full rounded-2xl border border-[#FF4D6D]/20 py-3 text-xs font-black text-[#FF4D6D] flex items-center justify-center gap-2">
          <X className="w-4 h-4" /> {room.hostFoyerId === foyerId ? 'Annuler la salle' : 'Quitter la partie'}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[24px] border border-white/8 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="p-2.5 rounded-2xl bg-[#6C5CFF]/12 text-[#6C5CFF]"><Link2 className="w-5 h-5" /></span>
        <div>
          <h3 className="text-sm font-black text-white">Défier une famille connue</h3>
          <p className="text-[10px] text-white/45">Invitation privée, sans recherche publique.</p>
        </div>
      </div>

      {mode === 'menu' && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={createRoom} disabled={loading} className="py-3 rounded-2xl bg-[#6C5CFF] text-white text-xs font-black flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} Créer
          </button>
          <button type="button" onClick={() => setMode('join')} className="py-3 rounded-2xl border border-white/8 bg-white/5 text-white text-xs font-black flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Rejoindre
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-3">
          <input
            value={code}
            onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="CODE À 6 CARACTÈRES"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-base font-black tracking-[0.18em] text-white outline-none focus:border-[#6C5CFF]"
          />
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setMode('menu')} className="px-4 rounded-2xl border border-white/8 text-white/50">Retour</button>
            <button type="button" onClick={joinRoom} disabled={loading || code.length !== 6} className="py-3 rounded-2xl bg-[#00D26A] disabled:opacity-40 text-[#07111F] text-xs font-black">
              {loading ? 'Connexion...' : 'Rejoindre la salle'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-[#FF4D6D]">{error}</p>}
    </div>
  );
}
