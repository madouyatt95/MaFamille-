import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Crosshair, EyeOff, LogOut, Radio, RefreshCcw, Shield, Ship, Users } from 'lucide-react';
import { PrivateFamilyRoom } from './PrivateFamilyRoom';
import { familyGameService, type FamilyGameRoom } from '../../services/familyGameService';

type Mode = 'bot' | 'local' | 'private';
type Difficulty = 'easy' | 'normal' | 'hard';
type ShotResult = 'hit' | 'miss';
type Shot = { cell: string; result: ShotResult };

interface BattleshipGameProps {
  foyerId: string;
  familyName: string;
  isPremium: boolean;
  playerNames: [string, string];
  room: FamilyGameRoom | null;
  onRoomChange: (room: FamilyGameRoom | null) => void;
  onTriggerPaywall?: () => void;
  onFinished: (scores: [number, number], winnerName: string, mode: Mode) => void;
}

const SIZE = 10;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];
const CELLS = Array.from({ length: SIZE * SIZE }, (_, index) => `${Math.floor(index / SIZE)}-${index % SIZE}`);
const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const randomFleet = (): string[][] => {
  const occupied = new Set<string>();
  const ships: string[][] = [];
  SHIP_LENGTHS.forEach(length => {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * (horizontal ? SIZE : SIZE - length + 1));
      const column = Math.floor(Math.random() * (horizontal ? SIZE - length + 1 : SIZE));
      const cells = Array.from({ length }, (_, offset) => `${row + (horizontal ? 0 : offset)}-${column + (horizontal ? offset : 0)}`);
      if (cells.every(cell => !occupied.has(cell))) {
        cells.forEach(cell => occupied.add(cell));
        ships.push(cells);
        return;
      }
    }
  });
  return ships.length === SHIP_LENGTHS.length ? ships : randomFleet();
};

const fleetCells = (fleet: string[][]): Set<string> => new Set(fleet.flat());
const hitCount = (shots: Shot[]): number => shots.filter(shot => shot.result === 'hit').length;
const hasWon = (shots: Shot[]): boolean => hitCount(shots) >= SHIP_LENGTHS.reduce((sum, length) => sum + length, 0);

const parseShots = (value: unknown): Shot[] => Array.isArray(value)
  ? value.filter((item): item is Shot =>
      Boolean(item) && typeof item === 'object' &&
      typeof (item as Shot).cell === 'string' &&
      ((item as Shot).result === 'hit' || (item as Shot).result === 'miss'))
  : [];

export function BattleshipGame({
  foyerId,
  familyName,
  isPremium,
  playerNames,
  room,
  onRoomChange,
  onTriggerPaywall,
  onFinished
}: BattleshipGameProps) {
  const [mode, setMode] = useState<Mode>(() => room?.gameType === 'battleship' ? 'private' : 'bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [fleets, setFleets] = useState<[string[][], string[][]]>(() => [randomFleet(), randomFleet()]);
  const [shots, setShots] = useState<[Shot[], Shot[]]>([[], []]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [started, setStarted] = useState(false);
  const [passScreen, setPassScreen] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [privateFleetPlaced, setPrivateFleetPlaced] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [revealedPrivateFleets, setRevealedPrivateFleets] = useState<{ host: string[]; guest: string[] } | null>(null);
  const reportedPrivateWinner = useRef<number | null>(null);
  const celebratedWinner = useRef<number | null>(null);
  const privateRoom = room?.gameType === 'battleship' ? room : null;
  const localPrivateIndex: 0 | 1 = privateRoom?.guestUserId && privateRoom.guestUserId === currentUserId ? 1 : 0;
  const privateShots: [Shot[], Shot[]] = [
    parseShots(privateRoom?.state.hostShots),
    parseShots(privateRoom?.state.guestShots)
  ];
  const privateTurn: 0 | 1 = privateRoom?.state.turn === 1 ? 1 : 0;
  const bothPrivateReady = Boolean(privateRoom?.state.hostReady && privateRoom?.state.guestReady);
  const privateWinner = privateRoom?.state.winner === 0 || privateRoom?.state.winner === 1
    ? privateRoom.state.winner
    : null;

  useEffect(() => {
    const resolvedWinner = mode === 'private' ? privateWinner : winner;
    if (resolvedWinner === null) {
      celebratedWinner.current = null;
      return;
    }
    if (celebratedWinner.current === resolvedWinner) return;
    celebratedWinner.current = resolvedWinner;
    navigator.vibrate?.([90, 45, 120, 45, 180]);
  }, [mode, privateWinner, winner]);
  const ownFleet = fleets[mode === 'private' ? localPrivateIndex : currentPlayer];
  const ownFleetSet = useMemo(() => fleetCells(ownFleet), [ownFleet]);
  const privateOpponentFleetSet = useMemo(() => {
    if (!revealedPrivateFleets) return null;
    return new Set(localPrivateIndex === 0 ? revealedPrivateFleets.guest : revealedPrivateFleets.host);
  }, [localPrivateIndex, revealedPrivateFleets]);
  const rematchRequested = localPrivateIndex === 0
    ? privateRoom?.state.rematchHost === true
    : privateRoom?.state.rematchGuest === true;
  const opponentRematchRequested = localPrivateIndex === 0
    ? privateRoom?.state.rematchGuest === true
    : privateRoom?.state.rematchHost === true;

  const reset = useCallback(() => {
    setFleets([randomFleet(), randomFleet()]);
    setShots([[], []]);
    setCurrentPlayer(0);
    setStarted(false);
    setPassScreen(false);
    setWinner(null);
    setMessage('');
    setPrivateFleetPlaced(false);
    setRevealedPrivateFleets(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    void familyGameService.getCurrentUserId().then(setCurrentUserId);
  }, []);

  useEffect(() => {
    if (!privateRoom?.id) return;
    const channel = familyGameService.subscribeToRoom(privateRoom.id, nextRoom => onRoomChange(nextRoom));
    const refreshRoom = () => {
      if (document.visibilityState !== 'visible') return;
      void familyGameService.fetchRoom(privateRoom.id).then(nextRoom => {
        if (!nextRoom || nextRoom.status === 'cancelled') {
          onRoomChange(null);
          reset();
          return;
        }
        onRoomChange(nextRoom);
      });
    };
    const ready = localPrivateIndex === 0 ? privateRoom.state.hostReady : privateRoom.state.guestReady;
    if (ready) {
      queueMicrotask(() => {
        setPrivateFleetPlaced(true);
        setStarted(true);
      });
      void familyGameService.getBattleshipFleet(privateRoom.id, foyerId).then(cells => {
        if (cells.length === 0) return;
        setFleets(previous => localPrivateIndex === 0 ? [[cells], previous[1]] : [previous[0], [cells]]);
      });
    }
    document.addEventListener('visibilitychange', refreshRoom);
    window.addEventListener('online', refreshRoom);
    return () => {
      document.removeEventListener('visibilitychange', refreshRoom);
      window.removeEventListener('online', refreshRoom);
      void familyGameService.unsubscribe(channel);
    };
  }, [foyerId, localPrivateIndex, onRoomChange, privateRoom?.id, privateRoom?.state.guestReady, privateRoom?.state.hostReady, reset]);

  useEffect(() => {
    if (!privateRoom || privateRoom.status !== 'active' || privateWinner !== null) return;
    if (privateRoom.state.hostReady || privateRoom.state.guestReady) return;
    if (!privateFleetPlaced && !started) return;
    queueMicrotask(() => {
      reportedPrivateWinner.current = null;
      reset();
      setMode('private');
      setMessage('Revanche acceptée. Placez votre nouvelle flotte.');
    });
  }, [privateFleetPlaced, privateRoom, privateWinner, reset, started]);

  useEffect(() => {
    if (privateWinner === null || reportedPrivateWinner.current === privateWinner || !privateRoom) return;
    const shouldReport = currentUserId === privateRoom.hostUserId
      || (privateRoom.guestFoyerId !== privateRoom.hostFoyerId && currentUserId === privateRoom.guestUserId);
    if (!shouldReport) return;
    reportedPrivateWinner.current = privateWinner;
    const winnerName = privateWinner === 0 ? privateRoom.hostName : (privateRoom.guestName || 'Famille invitée');
    onFinished(privateWinner === localPrivateIndex ? [1, 0] : [0, 1], winnerName, 'private');
  }, [currentUserId, localPrivateIndex, onFinished, privateRoom, privateWinner]);

  useEffect(() => {
    if (!privateRoom?.id || privateWinner === null || revealedPrivateFleets) return;
    void familyGameService.getBattleshipRevealedFleets(privateRoom.id, foyerId).then(fleetsResult => {
      if (fleetsResult) setRevealedPrivateFleets(fleetsResult);
    });
  }, [foyerId, privateRoom?.id, privateWinner, revealedPrivateFleets]);

  const chooseBotCell = (botShots: Shot[]): string => {
    const tried = new Set(botShots.map(shot => shot.cell));
    const available = CELLS.filter(cell => !tried.has(cell));
    if (difficulty !== 'easy') {
      const lastHit = [...botShots].reverse().find(shot => shot.result === 'hit');
      if (lastHit) {
        const [row, column] = lastHit.cell.split('-').map(Number);
        const adjacent = [`${row - 1}-${column}`, `${row + 1}-${column}`, `${row}-${column - 1}`, `${row}-${column + 1}`]
          .filter(cell => CELLS.includes(cell) && !tried.has(cell));
        if (adjacent.length > 0) return randomItem(adjacent);
      }
    }
    if (difficulty === 'hard') {
      const parity = available.filter(cell => cell.split('-').map(Number).reduce((a, b) => a + b, 0) % 2 === 0);
      if (parity.length > 0) return randomItem(parity);
    }
    return randomItem(available);
  };

  const fireLocalShot = (cell: string) => {
    if (!started || winner !== null || passScreen || busy || shots[currentPlayer].some(shot => shot.cell === cell)) return;
    const targetFleet = fleetCells(fleets[currentPlayer === 0 ? 1 : 0]);
    const result: ShotResult = targetFleet.has(cell) ? 'hit' : 'miss';
    const nextShots = [...shots] as [Shot[], Shot[]];
    nextShots[currentPlayer] = [...nextShots[currentPlayer], { cell, result }];
    setShots(nextShots);
    navigator.vibrate?.(result === 'hit' ? [70, 30, 100] : 35);
    if (hasWon(nextShots[currentPlayer])) {
      setWinner(currentPlayer);
      onFinished(currentPlayer === 0 ? [1, 0] : [0, 1], playerNames[currentPlayer], mode);
      return;
    }
    if (mode === 'local') {
      setPassScreen(true);
      return;
    }
    setBusy(true);
    const botCell = chooseBotCell(nextShots[1]);
    const botResult: ShotResult = fleetCells(fleets[0]).has(botCell) ? 'hit' : 'miss';
    window.setTimeout(() => {
      setShots(previous => {
        const updated: [Shot[], Shot[]] = [previous[0], [...previous[1], { cell: botCell, result: botResult }]];
        if (hasWon(updated[1])) {
          setWinner(1);
          onFinished([0, 1], 'Ordinateur', 'bot');
        }
        return updated;
      });
      setBusy(false);
    }, 480);
  };

  const placePrivateFleet = async () => {
    if (!privateRoom) return;
    setBusy(true);
    setMessage('');
    try {
      const nextRoom = await familyGameService.placeBattleshipFleet(privateRoom.id, foyerId, fleets[localPrivateIndex]);
      onRoomChange(nextRoom);
      setPrivateFleetPlaced(true);
      setStarted(true);
      setMessage('Flotte prête. La bataille commencera dès que les deux familles seront prêtes.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Placement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const firePrivateShot = async (cell: string) => {
    if (!privateRoom || !bothPrivateReady || privateTurn !== localPrivateIndex || privateWinner !== null || busy) return;
    const ownShots = privateShots[localPrivateIndex];
    if (ownShots.some(shot => shot.cell === cell)) return;
    setBusy(true);
    setMessage('');
    try {
      const nextRoom = await familyGameService.fireBattleshipShot(privateRoom.id, foyerId, cell);
      onRoomChange(nextRoom);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tir impossible.');
    } finally {
      setBusy(false);
    }
  };

  const closePrivateRoom = async () => {
    if (!privateRoom || busy) return;
    setBusy(true);
    try {
      await familyGameService.closeRoom(privateRoom.id, foyerId);
      onRoomChange(null);
      reset();
      setMode('private');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de quitter la salle.');
    } finally {
      setBusy(false);
    }
  };

  const requestPrivateRematch = async () => {
    if (!privateRoom || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const nextRoom = await familyGameService.requestBattleshipRematch(privateRoom.id, foyerId);
      onRoomChange(nextRoom);
      if (nextRoom.status === 'active') {
        reportedPrivateWinner.current = null;
        reset();
        setMode('private');
        setMessage('Revanche lancée. Placez votre nouvelle flotte.');
      } else {
        setMessage('Demande envoyée. La revanche commencera lorsque l’autre joueur acceptera.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Revanche impossible.');
    } finally {
      setBusy(false);
    }
  };

  const renderGrid = (gridShots: Shot[], ships: Set<string> | null, onCell: (cell: string) => void, disabled = false, revealMissingShips = false) => (
    <div className="battleship-grid grid grid-cols-10 gap-1 rounded-[20px] border border-[#4F8CFF]/25 bg-[#4F8CFF]/8 p-2">
      {CELLS.map(cell => {
        const shot = gridShots.find(item => item.cell === cell);
        const ship = ships?.has(cell);
        return (
          <button
            key={cell}
            type="button"
            disabled={disabled || Boolean(shot)}
            onClick={() => onCell(cell)}
            className={`aspect-square min-w-0 rounded-[5px] border transition-all ${
              shot?.result === 'hit' ? 'border-[#FF4D6D] bg-[#FF4D6D] shadow-[0_0_10px_rgba(255,77,109,.4)]'
                : shot?.result === 'miss' ? 'border-[#4F8CFF]/20 bg-white/45'
                  : ship && revealMissingShips ? 'border-[#FFB020] bg-[#FFB020] shadow-[0_0_10px_rgba(255,176,32,.35)]'
                  : ship ? 'border-[#6C5CFF]/45 bg-[#6C5CFF]/55'
                    : 'border-[#4F8CFF]/12 bg-[#4F8CFF]/12 hover:bg-[#4F8CFF]/25'
            }`}
            aria-label={`Case ${cell}${shot ? `, ${shot.result === 'hit' ? 'touché' : 'manqué'}` : ''}`}
          />
        );
      })}
    </div>
  );

  if (!started && mode !== 'private') {
    return (
      <section className="glass-panel rounded-[24px] border border-white/8 p-5 space-y-5">
        <div>
          <h2 className="text-base font-black text-white">Choisissez votre bataille</h2>
          <p className="mt-1 text-xs text-white/50">Les flottes sont placées automatiquement et peuvent être mélangées avant de commencer.</p>
        </div>
        <div className="family-games-intro grid gap-2 rounded-[22px] border border-white/8 bg-white/5 p-3 sm:grid-cols-3">
          {[
            'Choisissez votre mode de jeu.',
            'Gardez votre flotte secrète.',
            'Touchez tous les bateaux adverses pour gagner.'
          ].map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/10 p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4F8CFF]/12 text-[10px] font-black text-[#8AB7FF]">{index + 1}</span>
              <p className="mt-2 text-[10px] font-bold leading-relaxed text-white/60">{item}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['bot', Bot, 'Ordinateur'],
            ['local', Users, 'Même écran'],
            ['private', Radio, 'Duel privé']
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => value === 'private' && !isPremium ? onTriggerPaywall?.() : setMode(value)}
              className={`rounded-2xl border p-3 text-center ${mode === value ? 'border-[#4F8CFF] bg-[#4F8CFF]/12' : 'border-white/8 bg-white/5'}`}
            >
              <Icon className="mx-auto h-5 w-5 text-[#4F8CFF]" />
              <strong className="mt-2 block text-[10px] text-white">{label}</strong>
            </button>
          ))}
        </div>
        {mode === 'bot' && (
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map(value => (
              <button key={value} type="button" onClick={() => setDifficulty(value)} className={`rounded-xl border py-2 text-[10px] font-black capitalize ${difficulty === value ? 'border-[#FFB020] bg-[#FFB020]/10 text-[#FFB020]' : 'border-white/8 text-white/50'}`}>
                {value === 'easy' ? 'Facile' : value === 'normal' ? 'Normal' : 'Difficile'}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-white">Aperçu de votre flotte</span>
            <button type="button" onClick={() => setFleets([randomFleet(), randomFleet()])} className="rounded-xl border border-white/8 p-2 text-white/55" title="Mélanger la flotte">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
          {renderGrid([], fleetCells(fleets[0]), () => undefined, true)}
        </div>
        <button type="button" onClick={() => setStarted(true)} className="w-full rounded-2xl bg-[#4F8CFF] py-4 text-sm font-black text-white">
          Lancer la bataille
        </button>
      </section>
    );
  }

  if (mode === 'private') {
    return (
      <div className="space-y-5">
        {!privateRoom && (
          <PrivateFamilyRoom
            foyerId={foyerId}
            familyName={familyName}
            selectedGame="battleship"
            onRoomReady={nextRoom => onRoomChange(nextRoom)}
            onRoomClosed={() => onRoomChange(null)}
          />
        )}
        {privateRoom && (
          <>
            <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/8 p-4 flex items-center justify-between gap-3">
              <span><strong className="block text-xs text-white">{privateRoom.hostName}</strong><span className="text-[9px] text-white/40">Hôte</span></span>
              <span className="text-[10px] font-black uppercase text-[#9E94FF]">Salle {privateRoom.code}</span>
              <span className="text-right"><strong className="block text-xs text-white">{privateRoom.guestName || 'En attente'}</strong><span className="text-[9px] text-white/40">Invité</span></span>
            </div>
            {!privateFleetPlaced && !(localPrivateIndex === 0 ? privateRoom.state.hostReady : privateRoom.state.guestReady) ? (
              <section className="glass-panel rounded-[24px] border border-white/8 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span><strong className="block text-sm text-white">Votre flotte privée</strong><span className="text-[9px] text-white/45">L’autre famille ne peut jamais voir ces positions.</span></span>
                  <button type="button" onClick={() => setFleets(previous => localPrivateIndex === 0 ? [randomFleet(), previous[1]] : [previous[0], randomFleet()])} className="p-2 rounded-xl border border-white/8 text-white/55"><RefreshCcw className="h-4 w-4" /></button>
                </div>
                {renderGrid([], ownFleetSet, () => undefined, true)}
                <button type="button" disabled={busy || privateRoom.status !== 'active'} onClick={() => void placePrivateFleet()} className="w-full rounded-2xl bg-[#4F8CFF] py-4 text-xs font-black text-white disabled:opacity-45">
                  {privateRoom.status !== 'active' ? 'En attente de l’autre famille' : busy ? 'Validation...' : 'Valider ma flotte'}
                </button>
              </section>
            ) : (
              <section className="space-y-4">
                <div className={`rounded-2xl border p-4 text-center ${privateTurn === localPrivateIndex ? 'border-[#00D26A]/25 bg-[#00D26A]/8' : 'border-white/8 bg-white/5'}`}>
                  <strong className="text-sm text-white">{privateWinner !== null ? 'Partie terminée' : !bothPrivateReady ? 'En attente de la flotte adverse...' : privateTurn === localPrivateIndex ? 'À vous de tirer' : 'L’autre famille réfléchit...'}</strong>
                </div>
                {privateWinner !== null && (
                  <div className="rounded-[24px] border border-[#00D26A]/25 bg-[#00D26A]/8 p-5 text-center">
                    <Check className="mx-auto h-9 w-9 text-[#00D26A]" />
                    <h2 className="mt-2 text-lg font-black text-white">
                      {privateWinner === localPrivateIndex ? 'Vous remportez la bataille !' : 'La flotte adverse remporte la bataille'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => void requestPrivateRematch()}
                      disabled={busy || rematchRequested}
                      className="mt-4 w-full rounded-2xl bg-[#4F8CFF] py-3 text-xs font-black text-white disabled:opacity-50"
                    >
                      {rematchRequested
                        ? opponentRematchRequested ? 'Revanche en préparation...' : 'En attente de l’autre joueur'
                        : 'Proposer une revanche'}
                    </button>
                  </div>
                )}
                <div>
                  <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-white">Océan adverse</strong><Crosshair className="h-4 w-4 text-[#FF4D6D]" /></div>
                  {renderGrid(privateShots[localPrivateIndex], privateWinner !== null ? privateOpponentFleetSet : null, cell => void firePrivateShot(cell), !bothPrivateReady || privateTurn !== localPrivateIndex || privateWinner !== null || busy, privateWinner !== null)}
                  {privateWinner !== null && (
                    <p className="mt-2 text-[10px] font-bold text-white/45">
                      Rouge : touché · Bleu : raté · Jaune : bateau non trouvé.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-white">Votre flotte</strong><Shield className="h-4 w-4 text-[#6C5CFF]" /></div>
                  {renderGrid(privateShots[localPrivateIndex === 0 ? 1 : 0], ownFleetSet, () => undefined, true)}
                </div>
              </section>
            )}
            <button type="button" onClick={() => void closePrivateRoom()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF4D6D]/20 py-3 text-xs font-black text-[#FF4D6D]">
              <LogOut className="h-4 w-4" /> {privateRoom.status === 'finished' ? 'Fermer la salle' : 'Quitter la partie'}
            </button>
          </>
        )}
        {message && <p className="rounded-xl border border-white/8 bg-white/5 p-3 text-center text-xs font-bold text-white/60">{message}</p>}
      </div>
    );
  }

  if (passScreen) {
    const nextPlayer = currentPlayer === 0 ? 1 : 0;
    return (
      <section className="glass-panel min-h-[480px] rounded-[28px] border border-white/8 p-8 flex flex-col items-center justify-center text-center">
        <EyeOff className="h-14 w-14 text-[#6C5CFF]" />
        <h2 className="mt-5 text-xl font-black text-white">Passez l’appareil à {playerNames[nextPlayer]}</h2>
        <p className="mt-2 text-xs text-white/50">La grille précédente est masquée pour garder les flottes secrètes.</p>
        <button type="button" onClick={() => {
          setCurrentPlayer(nextPlayer);
          setPassScreen(false);
        }} className="mt-6 rounded-2xl bg-[#6C5CFF] px-6 py-4 text-xs font-black text-white">
          Je suis {playerNames[nextPlayer]}
        </button>
      </section>
    );
  }

  const playerShots = shots[currentPlayer];
  const incomingShots = shots[currentPlayer === 0 ? 1 : 0];
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map(index => (
          <div key={index} className={`rounded-2xl border p-3 ${currentPlayer === index && winner === null ? 'border-[#4F8CFF]/40 bg-[#4F8CFF]/10' : 'border-white/8 bg-white/5'}`}>
            <strong className="block truncate text-xs text-white">{mode === 'bot' && index === 1 ? 'Ordinateur' : playerNames[index]}</strong>
            <span className="text-[9px] text-white/45">{hitCount(shots[index])}/17 touches</span>
          </div>
        ))}
      </div>
      {winner === null ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-white">Choisissez votre cible</strong><Crosshair className="h-4 w-4 text-[#FF4D6D]" /></div>
            {renderGrid(playerShots, null, fireLocalShot, busy)}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-white">Votre flotte</strong><Ship className="h-4 w-4 text-[#6C5CFF]" /></div>
            {renderGrid(incomingShots, fleetCells(fleets[currentPlayer]), () => undefined, true)}
          </div>
        </>
      ) : (
        <div className="game-victory rounded-[24px] border border-[#00D26A]/25 bg-[#00D26A]/8 p-6 text-center">
          <Check className="mx-auto h-10 w-10 text-[#00D26A]" />
          <h2 className="mt-3 text-lg font-black text-white">{winner === 1 && mode === 'bot' ? 'L’ordinateur gagne cette bataille' : `${playerNames[winner]} remporte la bataille !`}</h2>
          <div className="mt-5 text-left">
            <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-white">Flotte adverse révélée</strong><Ship className="h-4 w-4 text-[#FFB020]" /></div>
            {renderGrid(shots[winner], fleetCells(fleets[winner === 0 ? 1 : 0]), () => undefined, true, true)}
            <p className="mt-2 text-[10px] font-bold text-white/50">Jaune : bateau restant à trouver.</p>
          </div>
          <button type="button" onClick={reset} className="mt-5 rounded-2xl bg-[#4F8CFF] px-6 py-3 text-xs font-black text-white">Nouvelle bataille</button>
        </div>
      )}
    </section>
  );
}
