import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../utils/supabase';

export type FamilyGameType = 'memory' | 'connect4' | 'family-challenge' | 'mime-challenge' | 'battleship';

export type FamilyGameResult = {
  id: string;
  gameType: FamilyGameType;
  winnerName?: string;
  playerNames: string[];
  scores: number[];
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  playedAt: string;
};

export type FamilyGameRoom = {
  id: string;
  code: string;
  gameType: FamilyGameType;
  hostFoyerId: string;
  guestFoyerId?: string;
  hostUserId?: string;
  guestUserId?: string;
  hostName: string;
  guestName?: string;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  state: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
};

export type FamilyGameRoomAction =
  | 'configure'
  | 'start_timer'
  | 'expire_turn'
  | 'finish_game'
  | 'next_round'
  | 'confirm_close_answer'
  | 'reject_close_answer'
  | 'resume'
  | 'claim_forfeit'
  | 'leave'
  | 'cancel';

export type FamilyChallengeSubmission = {
  room: FamilyGameRoom;
  status: 'accepted' | 'close' | 'rejected' | 'duplicate' | 'round_finished' | 'game_finished';
  message?: string;
};

type GameResultRow = {
  id: string;
  game_type: FamilyGameType;
  winner_name?: string | null;
  player_names?: string[] | null;
  scores?: number[] | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown> | null;
  played_at: string;
};

type GameRoomRow = {
  id: string;
  room_code: string;
  game_type: FamilyGameType;
  host_foyer_id: string;
  guest_foyer_id?: string | null;
  host_user_id?: string | null;
  guest_user_id?: string | null;
  host_name: string;
  guest_name?: string | null;
  status: FamilyGameRoom['status'];
  state?: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
};

const mapResult = (row: GameResultRow): FamilyGameResult => ({
  id: row.id,
  gameType: row.game_type,
  winnerName: row.winner_name || undefined,
  playerNames: Array.isArray(row.player_names) ? row.player_names : [],
  scores: Array.isArray(row.scores) ? row.scores.map(Number) : [],
  durationSeconds: row.duration_seconds ?? undefined,
  metadata: row.metadata || {},
  playedAt: row.played_at
});

const mapRoom = (row: GameRoomRow): FamilyGameRoom => ({
  id: row.id,
  code: row.room_code,
  gameType: row.game_type,
  hostFoyerId: row.host_foyer_id,
  guestFoyerId: row.guest_foyer_id || undefined,
  hostUserId: row.host_user_id || undefined,
  guestUserId: row.guest_user_id || undefined,
  hostName: row.host_name,
  guestName: row.guest_name || undefined,
  status: row.status,
  state: row.state || {},
  createdAt: row.created_at,
  expiresAt: row.expires_at
});

const localResultsKey = (foyerId: string) => `mf_family_game_results_${foyerId}`;
const pendingResultsKey = (foyerId: string) => `mf_family_game_results_pending_${foyerId}`;

const readLocalResults = (foyerId: string): FamilyGameResult[] => {
  try {
    const value = JSON.parse(localStorage.getItem(localResultsKey(foyerId)) || '[]');
    return Array.isArray(value) ? value.slice(0, 30) : [];
  } catch {
    return [];
  }
};

const storeLocalResult = (foyerId: string, result: FamilyGameResult, pending: boolean) => {
  const local = [result, ...readLocalResults(foyerId).filter(item => item.id !== result.id)].slice(0, 30);
  localStorage.setItem(localResultsKey(foyerId), JSON.stringify(local));
  if (pending) {
    try {
      const queued = JSON.parse(localStorage.getItem(pendingResultsKey(foyerId)) || '[]') as FamilyGameResult[];
      localStorage.setItem(pendingResultsKey(foyerId), JSON.stringify([result, ...queued.filter(item => item.id !== result.id)].slice(0, 50)));
    } catch {
      localStorage.setItem(pendingResultsKey(foyerId), JSON.stringify([result]));
    }
  }
};

const getRoomErrorMessage = (error: { message?: string; code?: string }): string => {
  const message = `${error.message || ''} ${error.code || ''}`.toLowerCase();
  if (message.includes('create_family_game_room') || message.includes('apply_family_game_action') || message.includes('pgrst202')) {
    return 'Le service de parties privées doit être activé sur Supabase. Appliquez la dernière migration puis réessayez.';
  }
  if (message.includes('jwt') || message.includes('session') || message.includes('auth')) {
    return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  }
  if (message.includes('rate') || message.includes('tentative')) {
    return 'Trop de tentatives rapprochées. Patientez une minute puis réessayez.';
  }
  if (message.includes('permission') || message.includes('accès refusé') || message.includes('row-level')) {
    return 'Ce compte n’a pas accès à cette famille.';
  }
  return error.message || 'Le service de parties privées est momentanément indisponible.';
};

export const familyGameService = {
  async getCurrentUserId(): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user?.id || null;
  },

  async fetchActiveRoom(foyerId: string): Promise<FamilyGameRoom | null> {
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') return null;
    const { data: userData } = await client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;
    const { data, error } = await client
      .from('family_game_rooms')
      .select('id, room_code, game_type, host_foyer_id, guest_foyer_id, host_user_id, guest_user_id, host_name, guest_name, status, state, created_at, expires_at')
      .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
      .in('status', ['waiting', 'active'])
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[familyGameService] Active room unavailable:', error.message);
      return null;
    }
    return data ? mapRoom(data as GameRoomRow) : null;
  },

  async fetchRoom(roomId: string): Promise<FamilyGameRoom | null> {
    const client = getSupabaseClient();
    if (!client || !roomId) return null;
    const { data, error } = await client
      .from('family_game_rooms')
      .select('id, room_code, game_type, host_foyer_id, guest_foyer_id, host_user_id, guest_user_id, host_name, guest_name, status, state, created_at, expires_at')
      .eq('id', roomId)
      .maybeSingle();
    if (error) {
      console.warn('[familyGameService] Room refresh unavailable:', error.message);
      return null;
    }
    return data ? mapRoom(data as GameRoomRow) : null;
  },

  async fetchResults(foyerId: string, options: { cloud?: boolean } = {}): Promise<FamilyGameResult[]> {
    const client = getSupabaseClient();
    const local = readLocalResults(foyerId);
    if (options.cloud === false || !client || !foyerId || foyerId === 'local') return local;
    await this.syncPendingResults(foyerId);
    const { data, error } = await client
      .from('family_game_results')
      .select('id, game_type, winner_name, player_names, scores, duration_seconds, metadata, played_at')
      .eq('foyer_id', foyerId)
      .order('played_at', { ascending: false })
      .limit(30);
    if (error) {
      console.warn('[familyGameService] Results unavailable:', error.message);
      return local;
    }
    const cloud = (data || []).map(row => mapResult(row as GameResultRow));
    const merged = [...cloud, ...local.filter(item => !cloud.some(cloudItem => cloudItem.id === item.id))]
      .sort((left, right) => right.playedAt.localeCompare(left.playedAt))
      .slice(0, 30);
    localStorage.setItem(localResultsKey(foyerId), JSON.stringify(merged));
    return merged;
  },

  async saveResult(foyerId: string, result: Omit<FamilyGameResult, 'id' | 'playedAt'>): Promise<FamilyGameResult | null> {
    const localResult: FamilyGameResult = {
      ...result,
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString()
    };
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') {
      storeLocalResult(foyerId, localResult, foyerId !== 'local');
      return localResult;
    }
    const { data, error } = await client
      .from('family_game_results')
      .insert({
        id: localResult.id,
        foyer_id: foyerId,
        game_type: result.gameType,
        winner_name: result.winnerName || null,
        player_names: result.playerNames,
        scores: result.scores,
        duration_seconds: result.durationSeconds ?? null,
        metadata: result.metadata || {},
        played_at: localResult.playedAt
      })
      .select('id, game_type, winner_name, player_names, scores, duration_seconds, metadata, played_at')
      .single();
    if (error) {
      console.warn('[familyGameService] Result kept locally:', error.message);
      storeLocalResult(foyerId, localResult, true);
      return localResult;
    }
    const saved = mapResult(data as GameResultRow);
    storeLocalResult(foyerId, saved, false);
    return saved;
  },

  async syncPendingResults(foyerId: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') return;
    let pending: FamilyGameResult[];
    try {
      pending = JSON.parse(localStorage.getItem(pendingResultsKey(foyerId)) || '[]');
    } catch {
      return;
    }
    if (!Array.isArray(pending) || pending.length === 0) return;
    const remaining: FamilyGameResult[] = [];
    for (const result of pending.slice(0, 10)) {
      const { error } = await client.from('family_game_results').insert({
        id: result.id,
        foyer_id: foyerId,
        game_type: result.gameType,
        winner_name: result.winnerName || null,
        player_names: result.playerNames,
        scores: result.scores,
        duration_seconds: result.durationSeconds ?? null,
        metadata: result.metadata || {},
        played_at: result.playedAt
      });
      if (error && error.code !== '23505') remaining.push(result);
    }
    localStorage.setItem(pendingResultsKey(foyerId), JSON.stringify([...remaining, ...pending.slice(10)]));
  },

  async createRoom(foyerId: string, gameType: FamilyGameType, hostName: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    if (!foyerId || foyerId === 'local') throw new Error('Sélectionnez une famille synchronisée pour créer une partie privée.');

    const existingRoom = await this.fetchActiveRoom(foyerId);
    if (existingRoom?.gameType === gameType) {
      if (gameType === 'family-challenge') {
        await this.closeRoom(existingRoom.id, foyerId);
      } else {
        return existingRoom;
      }
    }
    if (existingRoom && existingRoom.gameType !== gameType) {
      throw new Error('Une autre salle privée est déjà ouverte. Fermez-la avant de créer cette partie.');
    }

    const { data, error } = await client.rpc('create_family_game_room', {
      p_foyer_id: foyerId,
      p_game_type: gameType,
      p_host_name: hostName
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Supabase n’a pas retourné la salle créée.');
    return mapRoom(row as GameRoomRow);
  },

  async joinRoom(foyerId: string, code: string, guestName: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('join_family_game_room', {
      p_foyer_id: foyerId,
      p_room_code: code.trim().toUpperCase(),
      p_guest_name: guestName
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async performRoomAction(
    roomId: string,
    foyerId: string,
    action: FamilyGameRoomAction,
    payload: Record<string, unknown> = {}
  ): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('apply_family_game_action', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_action: action,
      p_payload: payload
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async submitChallengeAnswer(roomId: string, foyerId: string, roundNumber: number, answerText: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('submit_family_game_answer', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_round_number: roundNumber,
      p_answer_text: answerText
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async submitChallengeGuess(roomId: string, foyerId: string, answerText: string): Promise<FamilyChallengeSubmission> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('submit_family_challenge_guess', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_answer_text: answerText
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const value = (Array.isArray(data) ? data[0] : data) as {
      room?: GameRoomRow;
      status?: FamilyChallengeSubmission['status'];
      message?: string;
    } | null;
    if (!value?.room) throw new Error('Supabase n’a pas retourné l’état de la partie.');
    return {
      room: mapRoom(value.room),
      status: value.status || 'rejected',
      message: value.message
    };
  },

  async forceChallengeFaceoffRandom(roomId: string, foyerId: string, winnerTeam: 0 | 1, answerIndex: number): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('force_family_challenge_faceoff_random', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_winner_team: winnerTeam,
      p_answer_index: answerIndex
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async refreshRoom(roomId: string, foyerId: string): Promise<FamilyGameRoom> {
    return this.performRoomAction(roomId, foyerId, 'resume');
  },

  async placeBattleshipFleet(roomId: string, foyerId: string, ships: string[][]): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('place_battleship_fleet', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_ships: ships
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async fireBattleshipShot(roomId: string, foyerId: string, cell: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('fire_battleship_shot', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_cell: cell
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async requestBattleshipRematch(roomId: string, foyerId: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('request_battleship_rematch', {
      p_room_id: roomId,
      p_foyer_id: foyerId
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async closeRoom(roomId: string, foyerId: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('close_family_game_room', {
      p_room_id: roomId,
      p_foyer_id: foyerId
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async playConnect4Column(roomId: string, foyerId: string, column: number): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('play_private_connect4', {
      p_room_id: roomId,
      p_foyer_id: foyerId,
      p_column: column
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async requestConnect4Rematch(roomId: string, foyerId: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    const { data, error } = await client.rpc('request_connect4_rematch', {
      p_room_id: roomId,
      p_foyer_id: foyerId
    });
    if (error) throw new Error(getRoomErrorMessage(error));
    const row = Array.isArray(data) ? data[0] : data;
    return mapRoom(row as GameRoomRow);
  },

  async getBattleshipFleet(roomId: string, foyerId: string): Promise<string[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    const { data, error } = await client.rpc('get_battleship_fleet', {
      p_room_id: roomId,
      p_foyer_id: foyerId
    });
    if (error) {
      console.warn('[familyGameService] Battleship fleet unavailable:', error.message);
      return [];
    }
    return Array.isArray(data) ? data.filter((cell): cell is string => typeof cell === 'string') : [];
  },

  subscribeToRoom(roomId: string, onRoom: (room: FamilyGameRoom) => void): RealtimeChannel | null {
    const client = getSupabaseClient();
    if (!client) return null;
    return client
      .channel(`family-game-room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'family_game_rooms', filter: `id=eq.${roomId}` },
        payload => onRoom(mapRoom(payload.new as GameRoomRow))
      )
      .subscribe();
  },

  async unsubscribe(channel: RealtimeChannel | null): Promise<void> {
    if (!channel) return;
    const client = getSupabaseClient();
    await client?.removeChannel(channel);
  }
};
