import { getSupabaseClient, logQueryVolume } from '../utils/supabase';
import type { FamilyJoinRequest, Foyer, FoyerMember, FoyerMemberProfileUpdate, MalusSettings, Member, MemberRole } from '../types';

type PremiumUpdateOptions = {
  source?: Foyer['premiumSource'];
  plan?: Foyer['premiumPlan'];
  status?: Foyer['premiumStatus'];
  expiresAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  appStoreOriginalTransactionId?: string | null;
};

type JsonRecord = Record<string, unknown>;
// Dynamic sync tables have different schemas depending on the module name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableRow = Record<string, any>;
type RealtimePayload = JsonRecord;
type CreateFoyerResponse = { foyer_id: string; invite_code: string; name: string };
type JoinFoyerResponse = { foyer_id: string; foyer_name: string; role: 'parent' | 'child' | 'guest' };

type FoyerDbRow = {
  id: string;
  name: string;
  invite_code: string;
  invite_link?: string;
  created_by: string;
  created_at: string;
  is_premium: boolean;
  max_members: number;
  premium_source?: Foyer['premiumSource'];
  premium_plan?: Foyer['premiumPlan'];
  premium_status?: Foyer['premiumStatus'];
  premium_expires_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  app_store_original_transaction_id?: string | null;
  parent_pin?: string;
  malus_settings?: MalusSettings;
};

type FoyerMemberDbRow = {
  id: string;
  foyer_id: string;
  user_id: string;
  display_name: string;
  role: FoyerMember['role'];
  photo_url?: string;
  age?: string;
  birth_date?: string;
  blood_group?: string;
  allergies?: string[];
  treatments?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  school_or_employer?: string;
  joined_at: string;
  latitude?: number;
  longitude?: number;
  location_status?: string;
  last_located_at?: string;
  has_exemption?: boolean;
  approved?: boolean;
  notification_prefs?: Record<string, boolean>;
  foyers?: FoyerDbRow | null;
};

type PremiumDbUpdate = {
  is_premium: boolean;
  max_members: number;
  premium_source: Foyer['premiumSource'] | null;
  premium_plan: Foyer['premiumPlan'] | null;
  premium_status: Foyer['premiumStatus'];
  premium_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  app_store_original_transaction_id: string | null;
};

type UpdateMemberRpcParams = {
  p_member_id: string;
  p_display_name?: string;
  p_photo_url?: string;
  p_age?: string;
  p_birth_date?: string;
  p_blood_group?: string;
  p_allergies?: string[];
  p_treatments?: string[];
  p_emergency_contact_name?: string;
  p_emergency_contact_phone?: string;
  p_emergency_contact_relation?: string;
  p_school_or_employer?: string;
  p_has_exemption?: boolean;
  p_role?: FoyerMember['role'];
  p_latitude?: number;
  p_longitude?: number;
  p_location_status?: string;
  p_last_located_at?: string;
};

type FoyerMemberDbUpdate = Partial<Omit<FoyerMemberDbRow, 'id' | 'foyer_id' | 'joined_at' | 'foyers'>>;
type NewFoyerMemberInput = Pick<Member, 'name' | 'role'> & Partial<Member>;
type ApprovalUpdate = { approved: boolean; role?: 'admin' | 'parent' | 'child' | 'guest' };
type JoinRequestDbRow = {
  id: string;
  family_id: string;
  applicant_user_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_avatar?: string;
  created_at: string;
  status: FamilyJoinRequest['status'];
  requested_by_code?: boolean;
  requested_by_qr?: boolean;
  foyers?: Pick<FoyerDbRow, 'name' | 'invite_code'> | null;
};

/**
 * Service pour la gestion du Foyer, des membres, des invitations
 * et de la synchronisation granulaire en temps réel.
 */
export const foyerService = {
  /**
   * Créer un nouveau foyer
   */
  async createFoyer(name: string, displayName: string, isPremium: boolean = false): Promise<CreateFoyerResponse> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data, error } = await supabase.rpc('create_foyer', {
      p_name: name,
      p_display_name: displayName,
      p_is_premium: isPremium
    });

    if (error) throw error;
    return data as CreateFoyerResponse; // Contient { foyer_id, invite_code, name }
  },

  /**
   * Rejoindre un foyer existant via code d'invitation
   */
  async joinFoyer(inviteCode: string, displayName: string, role: 'parent' | 'child' | 'guest' = 'child'): Promise<JoinFoyerResponse> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data, error } = await supabase.rpc('join_foyer', {
      p_invite_code: inviteCode,
      p_display_name: displayName,
      p_role: role
    });

    if (error) throw error;
    return data as JoinFoyerResponse; // Contient { foyer_id, foyer_name, role }
  },

  /**
   * Récupérer tous les foyers auxquels appartient l'utilisateur connecté
   */
  async getMyFoyers(): Promise<Array<{ foyer: Foyer; member: FoyerMember }>> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data: membersData, error: membersError } = await supabase
      .from('foyer_members')
      .select('*, foyers(*)')
      .eq('user_id', user.id);

    if (membersError || !membersData) {
      console.error("Erreur lors de la récupération des foyers :", membersError);
      return [];
    }

    return membersData
      .map((memberData: FoyerMemberDbRow) => {
        const foyerData = memberData.foyers;
        if (!foyerData) return null;

        const foyer: Foyer = {
          id: foyerData.id,
          name: foyerData.name,
          inviteCode: foyerData.invite_code,
          inviteLink: foyerData.invite_link,
          createdBy: foyerData.created_by,
          createdAt: foyerData.created_at,
          isPremium: foyerData.is_premium,
          maxMembers: foyerData.max_members,
          premiumSource: foyerData.premium_source || null,
          premiumPlan: foyerData.premium_plan || null,
          premiumStatus: foyerData.premium_status || null,
          premiumExpiresAt: foyerData.premium_expires_at || null,
          stripeCustomerId: foyerData.stripe_customer_id || null,
          stripeSubscriptionId: foyerData.stripe_subscription_id || null,
          appStoreOriginalTransactionId: foyerData.app_store_original_transaction_id || null,
          parentPin: foyerData.parent_pin,
          malusSettings: foyerData.malus_settings
        };

        const member: FoyerMember = {
          id: memberData.id,
          foyerId: memberData.foyer_id,
          userId: memberData.user_id,
          displayName: memberData.display_name,
          role: memberData.role,
          photoUrl: memberData.photo_url,
          age: memberData.age,
          birthDate: memberData.birth_date,
          bloodGroup: memberData.blood_group,
          allergies: memberData.allergies,
          treatments: memberData.treatments,
          emergencyContactName: memberData.emergency_contact_name,
          emergencyContactPhone: memberData.emergency_contact_phone,
          emergencyContactRelation: memberData.emergency_contact_relation,
          schoolOrEmployer: memberData.school_or_employer,
          hasExemption: !!memberData.has_exemption,
          joinedAt: memberData.joined_at,
          latitude: memberData.latitude,
          longitude: memberData.longitude,
          locationStatus: memberData.location_status,
          lastLocatedAt: memberData.last_located_at,
          approved: memberData.approved !== false,
          notificationPrefs: memberData.notification_prefs || undefined
        };

        return { foyer, member };
      })
      .filter((item): item is { foyer: Foyer; member: FoyerMember } => item !== null);
  },

  /**
   * Récupérer le foyer auquel appartient l'utilisateur connecté (ou le foyer actif sélectionné)
   */
  async getMyFoyer(): Promise<{ foyer: Foyer | null; member: FoyerMember | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { foyer: null, member: null };

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { foyer: null, member: null };

    const activeFoyerId = localStorage.getItem('mf_active_foyer_id') || localStorage.getItem('mf_cloud_foyer_id');

    let query = supabase
      .from('foyer_members')
      .select('*, foyers(*)');

    if (activeFoyerId) {
      query = query.eq('user_id', user.id).eq('foyer_id', activeFoyerId);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (activeFoyerId) {
        // Fallback au premier foyer si le foyer actif n'est pas trouvé
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('foyer_members')
          .select('*, foyers(*)')
          .eq('user_id', user.id);
        if (fallbackError || !fallbackData || fallbackData.length === 0) {
          return { foyer: null, member: null };
        }
        return this.mapSingleMembership(fallbackData[0]);
      }
      return { foyer: null, member: null };
    }

    return this.mapSingleMembership(data[0]);
  },

  mapSingleMembership(memberData: FoyerMemberDbRow): { foyer: Foyer | null; member: FoyerMember | null } {
    const foyerData = memberData.foyers;
    if (!foyerData) {
      return { foyer: null, member: null };
    }

    const foyer: Foyer = {
      id: foyerData.id,
      name: foyerData.name,
      inviteCode: foyerData.invite_code,
      inviteLink: foyerData.invite_link,
      createdBy: foyerData.created_by,
      createdAt: foyerData.created_at,
      isPremium: foyerData.is_premium,
      maxMembers: foyerData.max_members,
      premiumSource: foyerData.premium_source || null,
      premiumPlan: foyerData.premium_plan || null,
      premiumStatus: foyerData.premium_status || null,
      premiumExpiresAt: foyerData.premium_expires_at || null,
      stripeCustomerId: foyerData.stripe_customer_id || null,
      stripeSubscriptionId: foyerData.stripe_subscription_id || null,
      appStoreOriginalTransactionId: foyerData.app_store_original_transaction_id || null,
      parentPin: foyerData.parent_pin,
      malusSettings: foyerData.malus_settings
    };

    const member: FoyerMember = {
      id: memberData.id,
      foyerId: memberData.foyer_id,
      userId: memberData.user_id,
      displayName: memberData.display_name,
      role: memberData.role,
      photoUrl: memberData.photo_url,
      age: memberData.age,
      birthDate: memberData.birth_date,
      bloodGroup: memberData.blood_group,
      allergies: memberData.allergies,
      treatments: memberData.treatments,
      emergencyContactName: memberData.emergency_contact_name,
      emergencyContactPhone: memberData.emergency_contact_phone,
      emergencyContactRelation: memberData.emergency_contact_relation,
      schoolOrEmployer: memberData.school_or_employer,
      hasExemption: !!memberData.has_exemption,
      joinedAt: memberData.joined_at,
      latitude: memberData.latitude,
      longitude: memberData.longitude,
      locationStatus: memberData.location_status,
      lastLocatedAt: memberData.last_located_at,
      approved: memberData.approved !== false,
      notificationPrefs: memberData.notification_prefs || undefined
    };

    return { foyer, member };
  },

  /**
   * Récupérer tous les membres d'un foyer
   */
  async getFoyerMembers(foyerId: string): Promise<FoyerMember[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('foyer_members')
      .select('*')
      .eq('foyer_id', foyerId);

    if (error) {
      console.error("Erreur lors de la récupération des membres :", error);
      return [];
    }

    return (data || []).map(m => ({
      id: m.id,
      foyerId: m.foyer_id,
      userId: m.user_id,
      displayName: m.display_name,
      role: m.role,
      photoUrl: m.photo_url,
      age: m.age,
      birthDate: m.birth_date,
      bloodGroup: m.blood_group,
      allergies: m.allergies,
      treatments: m.treatments,
      emergencyContactName: m.emergency_contact_name,
      emergencyContactPhone: m.emergency_contact_phone,
      emergencyContactRelation: m.emergency_contact_relation,
      schoolOrEmployer: m.school_or_employer,
      hasExemption: !!m.has_exemption,
      joinedAt: m.joined_at,
      latitude: m.latitude,
      longitude: m.longitude,
      locationStatus: m.location_status,
      lastLocatedAt: m.last_located_at,
      approved: m.approved !== false,
      notificationPrefs: m.notification_prefs || undefined
    }));
  },

  /**
   * Inviter un membre par email
   */
  async inviteByEmail(foyerId: string, email: string, role: MemberRole = 'child'): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase.rpc('invite_by_email', {
      p_foyer_id: foyerId,
      p_email: email,
      p_role: role
    });

    if (error) throw error;
  },

  /**
   * Régénérer le code d'invitation
   */
  async regenerateInviteCode(foyerId: string): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data, error } = await supabase.rpc('regenerate_invite_code', {
      p_foyer_id: foyerId
    });

    if (error) throw error;
    return data; // Le nouveau code
  },

  /**
   * Quitter un foyer
   */
  async leaveFoyer(foyerId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { error } = await supabase
      .from('foyer_members')
      .delete()
      .eq('foyer_id', foyerId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Supprimer un foyer (admin uniquement)
   */
  async deleteFoyer(foyerId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase
      .from('foyers')
      .delete()
      .eq('id', foyerId);

    if (error) throw error;
  },

  /**
   * Mettre à jour le code PIN parent du foyer
   */
  async updateFoyerParentPin(foyerId: string, pinCode: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase
      .from('foyers')
      .update({ parent_pin: pinCode })
      .eq('id', foyerId);

    if (error) throw error;
  },

  /**
   * Mettre à jour les paramètres de malus du foyer
   */
  async updateFoyerMalusSettings(foyerId: string, settings: MalusSettings): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase
      .from('foyers')
      .update({ malus_settings: settings })
      .eq('id', foyerId);

    if (error) throw error;
  },

  /**
   * Mettre à jour le statut Premium du foyer
   */
  async updateFoyerPremium(foyerId: string, isPremium: boolean, options: PremiumUpdateOptions = {}): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const premiumStatus = options.status || (isPremium ? 'active' : 'inactive');
    const payload: PremiumDbUpdate = {
      is_premium: isPremium,
      max_members: isPremium ? 999 : 3,
      premium_source: isPremium ? (options.source || 'test') : null,
      premium_plan: isPremium ? (options.plan || 'yearly') : null,
      premium_status: premiumStatus,
      premium_expires_at: isPremium ? (options.expiresAt || null) : null,
      stripe_customer_id: options.stripeCustomerId || null,
      stripe_subscription_id: options.stripeSubscriptionId || null,
      app_store_original_transaction_id: options.appStoreOriginalTransactionId || null
    };

    const { error } = await supabase
      .from('foyers')
      .update(payload)
      .eq('id', foyerId);

    if (error) throw error;
  },

  /**
   * Mettre à jour les informations d'un membre (ex: profil santé, allergies...)
   */
  async updateMemberProfile(memberId: string, updates: FoyerMemberProfileUpdate): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    if (updates.userId !== undefined) {
      await supabase
        .from('foyer_members')
        .update({ user_id: updates.userId })
        .eq('id', memberId);
    }

    const runRpc = async (includeExemption: boolean) => {
      const rpcParams: UpdateMemberRpcParams = { p_member_id: memberId };
      if (updates.displayName !== undefined) rpcParams.p_display_name = updates.displayName;
      if (updates.photoUrl !== undefined) rpcParams.p_photo_url = updates.photoUrl;
      if (updates.age !== undefined) rpcParams.p_age = updates.age;
      if (updates.birthDate !== undefined) rpcParams.p_birth_date = updates.birthDate;
      if (updates.bloodGroup !== undefined) rpcParams.p_blood_group = updates.bloodGroup;
      if (updates.allergies !== undefined) rpcParams.p_allergies = updates.allergies;
      if (updates.treatments !== undefined) rpcParams.p_treatments = updates.treatments;
      if (updates.emergencyContactName !== undefined) rpcParams.p_emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone !== undefined) rpcParams.p_emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactRelation !== undefined) rpcParams.p_emergency_contact_relation = updates.emergencyContactRelation;
      if (updates.schoolOrEmployer !== undefined) rpcParams.p_school_or_employer = updates.schoolOrEmployer;
      if (includeExemption && updates.hasExemption !== undefined) rpcParams.p_has_exemption = updates.hasExemption;
      if (updates.role !== undefined) rpcParams.p_role = updates.role;
      if (updates.latitude !== undefined) rpcParams.p_latitude = updates.latitude;
      if (updates.longitude !== undefined) rpcParams.p_longitude = updates.longitude;
      if (updates.locationStatus !== undefined) rpcParams.p_location_status = updates.locationStatus;
      if (updates.lastLocatedAt !== undefined) rpcParams.p_last_located_at = updates.lastLocatedAt;

      return await supabase.rpc('update_member_profile', rpcParams);
    };

    const runDirectUpdate = async (includeExemption: boolean) => {
      const dbUpdates: FoyerMemberDbUpdate = {};
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
      if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
      if (updates.allergies !== undefined) dbUpdates.allergies = updates.allergies;
      if (updates.treatments !== undefined) dbUpdates.treatments = updates.treatments;
      if (updates.emergencyContactName !== undefined) dbUpdates.emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone !== undefined) dbUpdates.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactRelation !== undefined) dbUpdates.emergency_contact_relation = updates.emergencyContactRelation;
      if (updates.schoolOrEmployer !== undefined) dbUpdates.school_or_employer = updates.schoolOrEmployer;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (includeExemption && updates.hasExemption !== undefined) dbUpdates.has_exemption = updates.hasExemption;
      if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
      if (updates.locationStatus !== undefined) dbUpdates.location_status = updates.locationStatus;
      if (updates.lastLocatedAt !== undefined) dbUpdates.last_located_at = updates.lastLocatedAt;

      return await supabase
        .from('foyer_members')
        .update(dbUpdates)
        .eq('id', memberId)
        .select();
    };

    try {
      console.log('[MaFamille+ DB] updateMemberProfile executing RPC → memberId:', memberId);
      const { data: rpcData, error: rpcError } = await runRpc(true);

      if (!rpcError) {
        console.log('[MaFamille+ DB] RPC update_member_profile success:', rpcData);
        return;
      }

      // Si erreur de schéma liée à has_exemption, réessayer sans has_exemption
      const errorMsg = rpcError.message || '';
      if ((errorMsg.includes('has_exemption') || errorMsg.includes('hasExemption') || errorMsg.includes('column') || errorMsg.includes('parameter'))
          && !errorMsg.includes('latitude')
          && !errorMsg.includes('longitude')
          && !errorMsg.includes('location_status')
          && !errorMsg.includes('last_located_at')) {
        console.warn('[MaFamille+ DB] Schema cache error detected on RPC, retrying without has_exemption:', errorMsg);
        const { error: retryError } = await runRpc(false);
        if (retryError) throw retryError;
        return;
      }


      // Fallback direct si RPC n'existe pas
      console.warn('[MaFamille+ DB] RPC failed with non-schema error, falling back to direct update:', errorMsg);
      const { data: directData, error: directError } = await runDirectUpdate(true);

      if (directError) {
        const directErrorMsg = directError.message || '';
        if (directErrorMsg.includes('has_exemption') || directErrorMsg.includes('hasExemption') || directErrorMsg.includes('column')) {
          console.warn('[MaFamille+ DB] Schema cache error detected on Direct, retrying without has_exemption:', directErrorMsg);
          const { error: directRetryError } = await runDirectUpdate(false);
          if (directRetryError) throw directRetryError;
          return;
        }
        throw directError;
      }

      if (!directData || directData.length === 0) {
        console.warn('[MaFamille+ DB] Direct UPDATE returned 0 rows — RLS blocked the update for memberId:', memberId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[MaFamille+ DB] updateMemberProfile failed permanently:', message);
      // Ne pas planter l'application pour l'utilisateur, le localStorage a déjà été mis à jour
    }
  },

  // ============================================
  // SYNCHRONISATION DES MODULES
  // ============================================

  /**
   * Récupérer toutes les lignes d'une table pour un foyer donné (exclut le Base64 volumineux par défaut pour transactions/documents)
   */
  async fetchTableData(tableName: string, foyerId: string): Promise<TableRow[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let selectQuery = '*';
    if (tableName === 'transactions') {
      selectQuery = 'id, foyer_id, amount, type, category, date, title, member_id, member_name, sub_category, account_id, comment, modification_history, is_archived, recurrence, subscription_id, created_at';
    } else if (tableName === 'documents') {
      selectQuery = 'id, foyer_id, name, category, sub_category, member_id, member_name, tags, upload_date, expiry_date, file_size, is_expired, description, is_secure, created_at';
    }

    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .eq('foyer_id', foyerId);

    if (error) {
      console.error(`Erreur fetchTableData sur ${tableName} :`, error);
      return [];
    }

    // Mesurer et logger le volume transféré
    logQueryVolume(tableName, 'fetchTableData', data);

    return (data || []) as TableRow[];
  },

  /**
   * Sauvegarder ou mettre à jour (upsert) un élément dans une table
   */
  async upsertItem(tableName: string, foyerId: string, item: TableRow): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const dbItem = {
      ...item,
      foyer_id: foyerId
    };

    const { error } = await supabase
      .from(tableName)
      .upsert(dbItem);

    if (error) {
      console.error(`Erreur upsertItem sur ${tableName} :`, error);
      throw error;
    }
  },

  /**
   * Supprimer un élément d'une table
   */
  async deleteItem(tableName: string, foyerId: string, itemId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('foyer_id', foyerId)
      .eq('id', itemId);

    if (error) {
      console.error(`Erreur deleteItem sur ${tableName} :`, error);
      throw error;
    }
  },

  /**
   * Créer et ajouter une fiche de membre directement dans le foyer Cloud
   */
  async addMemberToFoyer(foyerId: string, member: NewFoyerMemberInput): Promise<FoyerMember> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    // Mapping du rôle de l'interface amicale vers la BDD
    let dbRole = 'child';
    const cleanRole = (member.role || '').toLowerCase();
    if (cleanRole.includes('admin') || cleanRole.includes('chef')) {
      dbRole = 'admin';
    } else if (cleanRole.includes('parent') || cleanRole.includes('gestionnaire')) {
      dbRole = 'parent';
    } else if (cleanRole.includes('invit')) {
      dbRole = 'guest';
    }

    const dbMember = {
      foyer_id: foyerId,
      display_name: member.name || 'Nouveau Membre',
      role: dbRole,
      photo_url: member.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.name}`,
      age: member.age || 'Nouveau',
      birth_date: member.birthDate || 'Inconnue',
      blood_group: member.bloodGroup || 'A+',
      allergies: member.allergies || ['Aucune'],
      treatments: member.treatments || ['Aucun'],
      emergency_contact_name: member.emergencyContact?.name || 'Contact parent',
      emergency_contact_phone: member.emergencyContact?.phone || '',
      emergency_contact_relation: member.emergencyContact?.relation || 'Mère',
      school_or_employer: member.schoolOrEmployer || 'Non renseigné',
      has_exemption: member.hasExemption || false
    };

    console.log('[MaFamille+ DB] addMemberToFoyer -> payload:', JSON.stringify(dbMember));
    const { data, error } = await supabase
      .from('foyer_members')
      .insert(dbMember)
      .select()
      .single();

    if (error) {
      console.error("[MaFamille+ DB] Erreur insertion membre foyer :", error);
      throw error;
    }

    return {
      id: data.id,
      foyerId: data.foyer_id,
      userId: data.user_id,
      displayName: data.display_name,
      role: data.role,
      photoUrl: data.photo_url,
      age: data.age,
      birthDate: data.birth_date,
      bloodGroup: data.blood_group,
      allergies: data.allergies || [],
      treatments: data.treatments || [],
      emergencyContactName: data.emergency_contact_name,
      emergencyContactPhone: data.emergency_contact_phone,
      emergencyContactRelation: data.emergency_contact_relation,
      schoolOrEmployer: data.school_or_employer,
      hasExemption: !!data.has_exemption,
      joinedAt: data.joined_at,
      latitude: data.latitude,
      longitude: data.longitude,
      locationStatus: data.location_status,
      lastLocatedAt: data.last_located_at,
      notificationPrefs: data.notification_prefs || undefined
    };
  },

  /**
   * Retirer / Supprimer définitivement un membre du foyer de la base de données
   */
  async removeMember(memberId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    console.log('[MaFamille+ DB] removeMember -> memberId:', memberId);
    const { error } = await supabase
      .from('foyer_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error("[MaFamille+ DB] Erreur suppression membre foyer :", error);
      throw error;
    }
  },

  /**
   * Approuver la demande d'adhésion d'un membre
   */
  async approveMember(memberId: string, role?: 'admin' | 'parent' | 'child' | 'guest'): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    console.log('[MaFamille+ DB] approveMember -> memberId:', memberId, 'role:', role);
    const updates: ApprovalUpdate = { approved: true };
    if (role) {
      updates.role = role;
    }

    const { error } = await supabase
      .from('foyer_members')
      .update(updates)
      .eq('id', memberId);

    if (error) {
      console.error("[MaFamille+ DB] Erreur approbation membre foyer :", error);
      throw error;
    }
  },

  /**
   * Refuser la demande d'adhésion d'un membre (passe le statut à rejected et supprime l'alerte)
   */
  async rejectMember(memberId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    console.log('[MaFamille+ DB] rejectMember -> memberId:', memberId);
    const { error: memberError } = await supabase
      .from('foyer_members')
      .update({ blood_group: 'STATUS:rejected', approved: false })
      .eq('id', memberId);

    if (memberError) {
      console.error("[MaFamille+ DB] Erreur rejet membre foyer :", memberError);
      throw memberError;
    }

    const { error: alertError } = await supabase
      .from('alerts')
      .delete()
      .eq('id', memberId);

    if (alertError) {
      console.warn("[MaFamille+ DB] Erreur suppression alerte rejet :", alertError);
    }
  },

  /**
   * Envoyer une demande d'adhésion pour rejoindre un foyer via code d'invitation
   */
  async sendJoinRequest(inviteCode: string, applicantName: string, applicantEmail: string, applicantAvatar?: string, byQr: boolean = false): Promise<{ requestId: string; familyId: string; familyName: string; status: FamilyJoinRequest['status'] }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const normalizedInput = inviteCode.replace(/[\s-]/g, '').toUpperCase();
    const variations = [normalizedInput];

    // 1. If it has 8 chars and starts with 'FAM', split as 'FAM-' + 5 chars
    if (normalizedInput.startsWith('FAM') && normalizedInput.length === 8) {
      variations.push(`FAM-${normalizedInput.substring(3)}`);
    }

    // 2. If the original input had a hyphen or space, find where it was and split there
    const originalMatch = inviteCode.match(/^([A-Za-z]+)[\s-]([A-Za-z0-9]+)$/);
    if (originalMatch) {
      const prefix = originalMatch[1].toUpperCase();
      const suffix = originalMatch[2].toUpperCase();
      variations.push(`${prefix}-${suffix}`);
    }

    // 3. General split of letters followed by digits (like YATTA4832 -> YATTA-4832)
    const lettersDigitsMatch = normalizedInput.match(/^([A-Z]+)([0-9]+)$/);
    if (lettersDigitsMatch) {
      variations.push(`${lettersDigitsMatch[1]}-${lettersDigitsMatch[2]}`);
    }

    const uniqueVariations = Array.from(new Set(variations));

    // Developer temporary logs
    console.log("Code saisi :", inviteCode);
    console.log("Code normalisé :", uniqueVariations);

    const { data: foyerList, error: foyerError } = await supabase
      .rpc('get_foyer_by_invite_code', {
        p_variations: uniqueVariations
      });

    const foyerData = foyerList && foyerList.length > 0 ? foyerList[0] : null;

    console.log("Résultat recherche famille :", foyerError ? "Erreur" : (foyerData ? "Succès" : "Non trouvé"));
    console.log("Famille trouvée :", foyerData);
    console.log("Erreur exacte :", foyerError);

    if (foyerError || !foyerData) {
      throw new Error("Code d'invitation invalide. Vérifiez le code et réessayez.");
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Non authentifié");

    // Supprimer d'anciennes demandes éventuelles annulées ou rejetées pour cette famille pour éviter les conflits d'unicité
    await supabase
      .from('family_join_requests')
      .delete()
      .eq('family_id', foyerData.id)
      .eq('applicant_user_id', user.id);

    const { data: requestData, error: requestError } = await supabase
      .from('family_join_requests')
      .insert({
        family_id: foyerData.id,
        applicant_user_id: user.id,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_avatar: applicantAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${applicantName}`,
        status: 'pending',
        requested_by_code: !byQr,
        requested_by_qr: byQr
      })
      .select()
      .single();

    if (requestError) {
      throw requestError;
    }

    return {
      requestId: requestData.id,
      familyId: foyerData.id,
      familyName: foyerData.name,
      status: requestData.status
    };
  },

  /**
   * Récupérer les demandes d'adhésion émises par l'utilisateur connecté
   */
  async getMyJoinRequests(): Promise<FamilyJoinRequest[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from('family_join_requests')
      .select('*, foyers(*)')
      .eq('applicant_user_id', user.id);

    if (error) {
      console.error("Erreur lors de la récupération des demandes d'adhésion :", error);
      return [];
    }

    return ((data || []) as JoinRequestDbRow[]).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      familyName: row.foyers?.name || 'Famille inconnue',
      inviteCode: row.foyers?.invite_code || '',
      applicantUserId: row.applicant_user_id,
      applicantName: row.applicant_name,
      applicantEmail: row.applicant_email,
      applicantAvatar: row.applicant_avatar,
      createdAt: row.created_at,
      status: row.status,
      requestedByCode: row.requested_by_code,
      requestedByQr: row.requested_by_qr
    }));
  },

  /**
   * Récupérer toutes les demandes d'adhésion en attente (pending) pour une famille donnée
   */
  async getPendingJoinRequests(familyId: string): Promise<FamilyJoinRequest[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('family_join_requests')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'pending');

    if (error) {
      console.error("Erreur lors de la récupération des demandes en attente :", error);
      return [];
    }

    return ((data || []) as JoinRequestDbRow[]).map((row) => ({
      id: row.id,
      familyId: row.family_id,
      applicantUserId: row.applicant_user_id,
      applicantName: row.applicant_name,
      applicantEmail: row.applicant_email,
      applicantAvatar: row.applicant_avatar,
      createdAt: row.created_at,
      status: row.status,
      requestedByCode: row.requested_by_code,
      requestedByQr: row.requested_by_qr
    }));
  },

  /**
   * Annuler / supprimer une demande d'adhésion
   */
  async cancelJoinRequest(requestId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase
      .from('family_join_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Refuser une demande d'adhésion (status -> 'rejected')
   */
  async rejectJoinRequest(requestId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { error } = await supabase
      .from('family_join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Finaliser l'intégration d'un membre accepté (insère dans foyer_members et met à jour status -> 'accepted')
   */
  async finalizeJoinRequest(requestId: string, role: string, hasExemption: boolean): Promise<FoyerMemberDbRow> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    // 1. Récupérer les informations de la demande
    const { data: requestData, error: requestError } = await supabase
      .from('family_join_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      throw new Error("Demande d'adhésion introuvable.");
    }

    // 2. Ajouter le membre dans le foyer
    let dbRole = 'child';
    const cleanRole = role.toLowerCase();
    if (cleanRole.includes('admin') || cleanRole.includes('chef')) {
      dbRole = 'admin';
    } else if (cleanRole.includes('parent') || cleanRole.includes('gestionnaire')) {
      dbRole = 'parent';
    } else if (cleanRole.includes('invit')) {
      dbRole = 'guest';
    }

    const bloodGroupWithRole = `ROLE:${role}|O+`;

    const dbMember = {
      foyer_id: requestData.family_id,
      user_id: requestData.applicant_user_id,
      display_name: requestData.applicant_name,
      role: dbRole,
      photo_url: requestData.applicant_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${requestData.applicant_name}`,
      blood_group: bloodGroupWithRole,
      approved: true,
      has_exemption: hasExemption,
      allergies: ['Aucune'],
      treatments: ['Aucun'],
      emergency_contact_name: 'Contact parent',
      emergency_contact_phone: '',
      emergency_contact_relation: 'Mère',
      school_or_employer: 'Non renseigné'
    };

    const { data: insertedMember, error: insertError } = await supabase
      .from('foyer_members')
      .insert(dbMember)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 3. Mettre à jour le statut de la demande d'adhésion
    const { error: updateError } = await supabase
      .from('family_join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.warn("Erreur lors de la mise à jour du statut de la demande d'adhésion :", updateError);
    }

    return insertedMember;
  },

  /**
   * S'abonner aux changements temps réel sur une table pour un foyer
   */
  subscribeToChanges(tableName: string, foyerId: string, onEvent: (payload: RealtimePayload) => void) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const channel = supabase
      .channel(`realtime:${tableName}:${foyerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `foyer_id=eq.${foyerId}`
        },
        (payload) => {
          onEvent(payload);
        }
      )
      .subscribe();

    return channel;
  }
};
