import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../utils/supabase';

export type FamilyGameType = 'memory' | 'connect4' | 'family-challenge' | 'mime-challenge';

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
  | 'resolve_faceoff'
  | 'accept_answer'
  | 'reject_answer'
  | 'finish_round'
  | 'next_round'
  | 'leave'
  | 'cancel';

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
  hostName: row.host_name,
  guestName: row.guest_name || undefined,
  status: row.status,
  state: row.state || {},
  createdAt: row.created_at,
  expiresAt: row.expires_at
});

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
  async fetchActiveRoom(foyerId: string): Promise<FamilyGameRoom | null> {
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') return null;
    const { data, error } = await client
      .from('family_game_rooms')
      .select('id, room_code, game_type, host_foyer_id, guest_foyer_id, host_name, guest_name, status, state, created_at, expires_at')
      .or(`host_foyer_id.eq.${foyerId},guest_foyer_id.eq.${foyerId}`)
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

  async fetchResults(foyerId: string): Promise<FamilyGameResult[]> {
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') return [];
    const { data, error } = await client
      .from('family_game_results')
      .select('id, game_type, winner_name, player_names, scores, duration_seconds, metadata, played_at')
      .eq('foyer_id', foyerId)
      .order('played_at', { ascending: false })
      .limit(30);
    if (error) {
      console.warn('[familyGameService] Results unavailable:', error.message);
      return [];
    }
    return (data || []).map(row => mapResult(row as GameResultRow));
  },

  async saveResult(foyerId: string, result: Omit<FamilyGameResult, 'id' | 'playedAt'>): Promise<FamilyGameResult | null> {
    const client = getSupabaseClient();
    if (!client || !foyerId || foyerId === 'local') return null;
    const id = crypto.randomUUID();
    const playedAt = new Date().toISOString();
    const { data, error } = await client
      .from('family_game_results')
      .insert({
        id,
        foyer_id: foyerId,
        game_type: result.gameType,
        winner_name: result.winnerName || null,
        player_names: result.playerNames,
        scores: result.scores,
        duration_seconds: result.durationSeconds ?? null,
        metadata: result.metadata || {},
        played_at: playedAt
      })
      .select('id, game_type, winner_name, player_names, scores, duration_seconds, metadata, played_at')
      .single();
    if (error) {
      console.warn('[familyGameService] Result kept locally:', error.message);
      return null;
    }
    return mapResult(data as GameResultRow);
  },

  async createRoom(foyerId: string, gameType: FamilyGameType, hostName: string): Promise<FamilyGameRoom> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Connexion Supabase indisponible.');
    if (!foyerId || foyerId === 'local') throw new Error('Sélectionnez une famille synchronisée pour créer une partie privée.');

    const existingRoom = await this.fetchActiveRoom(foyerId);
    if (existingRoom) return existingRoom;

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
