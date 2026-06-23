import type { DocumentFile, JustificatifPack } from '../types';
import { getSupabaseClient } from '../utils/supabase';

type JsonRecord = Record<string, unknown>;

export type SharedPackPayload = {
  pack?: JustificatifPack;
  documents?: DocumentFile[];
  expired?: boolean;
  accessCodeRequired?: boolean;
  codeInvalid?: boolean;
  message?: string;
};

type SharedPackLinkResponse = {
  token?: string;
  expiresAt?: string;
  recipientLabel?: string;
  openedCount?: number;
  lastOpenedAt?: string | null;
  accessCodeRequired?: boolean;
};

const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown) => typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback;
const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asRecord = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};

const mapDocument = (row: JsonRecord): DocumentFile => ({
  id: String(row.id || ''),
  name: asString(row.name, 'Document'),
  category: asString(row.category, 'other') as DocumentFile['category'],
  subCategory: asString(row.subCategory || row.sub_category) || undefined,
  memberId: asString(row.memberId || row.member_id) || undefined,
  memberName: asString(row.memberName || row.member_name) || undefined,
  tags: asStringArray(row.tags),
  uploadDate: asString(row.uploadDate || row.upload_date),
  expiryDate: asString(row.expiryDate || row.expiry_date) || undefined,
  fileSize: asString(row.fileSize || row.file_size),
  isExpired: !!(row.isExpired || row.is_expired),
  description: asString(row.description) || undefined,
  fileUrl: asString(row.fileUrl || row.file_url) || undefined,
  thumbnailUrl: asString(row.thumbnailUrl || row.thumbnail_url) || undefined,
  isSecure: !!(row.isSecure || row.is_secure)
});

const mapPack = (row: JsonRecord): JustificatifPack => ({
  id: String(row.id || ''),
  name: asString(row.name, 'Dossier partagé'),
  templateType: asString(row.templateType || row.template_type, 'custom') as JustificatifPack['templateType'],
  documentIds: asStringArray(row.documentIds).length > 0 ? asStringArray(row.documentIds) : asStringArray(row.document_ids),
  createdAt: asString(row.createdAt || row.created_at_text),
  shareExpiresAt: asString(row.shareExpiresAt || row.share_expires_at) || undefined,
  shareDurationDays: asNumber(row.shareDurationDays || row.share_duration_days),
  allowDirectDownloads: asBoolean(row.allowDirectDownloads ?? row.allow_direct_downloads, true),
  shareRecipientLabel: asString(row.shareRecipientLabel || row.recipient_label) || undefined,
  shareOpenedCount: asNumber(row.shareOpenedCount ?? row.opened_count) || 0,
  shareLastOpenedAt: asString(row.shareLastOpenedAt ?? row.last_opened_at) || null,
  shareAccessCodeRequired: !!(row.shareAccessCodeRequired || row.access_code_required)
});

export const createSharedPackLink = async (params: {
  foyerId: string;
  pack: JustificatifPack;
  recipientLabel?: string;
  accessCode?: string;
  expiresAt: string;
  allowDirectDownloads: boolean;
}): Promise<SharedPackLinkResponse> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase n'est pas configuré");

  const { data, error } = await supabase.rpc('create_shared_pack_link', {
    p_foyer_id: params.foyerId,
    p_pack_id: params.pack.id,
    p_recipient_label: params.recipientLabel || null,
    p_access_code: params.accessCode || null,
    p_expires_at: params.expiresAt,
    p_allow_direct_downloads: params.allowDirectDownloads
  });

  if (error) {
    const details = [error.message, 'details' in error ? error.details : '', 'hint' in error ? error.hint : '']
      .filter(Boolean)
      .join(' ');
    if (/function .*create_shared_pack_link|pgrst202|schema cache/i.test(details)) {
      throw new Error('Le service de liens sécurisés doit être activé sur Supabase. Appliquez la dernière migration puis réessayez.');
    }
    if (/permission|accès refusé|row-level/i.test(details)) {
      throw new Error('Ce compte n’a pas le droit de créer un lien pour ce foyer.');
    }
    if (/dossier introuvable|pack/i.test(details)) {
      throw new Error('Ce dossier n’est pas encore synchronisé. Patientez quelques secondes puis réessayez.');
    }
    throw new Error(error.message || 'Impossible de créer le lien sécurisé.');
  }
  return (data || {}) as SharedPackLinkResponse;
};

export const fetchSharedPackByToken = async (token: string, accessCode?: string): Promise<SharedPackPayload> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { message: "Supabase n'est pas configuré" };

  const { data, error } = await supabase.rpc('get_shared_pack_by_token', {
    p_token: token,
    p_access_code: accessCode || null
  });

  if (error) {
    return { message: error.message || 'Lien de partage indisponible' };
  }

  const payload = asRecord(data);
  if (payload.expired || payload.accessCodeRequired) {
    return {
      expired: !!payload.expired,
      accessCodeRequired: !!payload.accessCodeRequired,
      codeInvalid: !!payload.codeInvalid,
      message: asString(payload.message) || undefined
    };
  }

  return {
    pack: payload.pack ? mapPack(asRecord(payload.pack)) : undefined,
    documents: Array.isArray(payload.documents) ? payload.documents.map(item => mapDocument(asRecord(item))) : []
  };
};
