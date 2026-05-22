import { getSupabaseClient } from '../utils/supabase';
import type { Foyer, FoyerMember } from '../types';

/**
 * Service pour la gestion du Foyer, des membres, des invitations
 * et de la synchronisation granulaire en temps réel.
 */
export const foyerService = {
  /**
   * Créer un nouveau foyer
   */
  async createFoyer(name: string, displayName: string, isPremium: boolean = false): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data, error } = await supabase.rpc('create_foyer', {
      p_name: name,
      p_display_name: displayName,
      p_is_premium: isPremium
    });

    if (error) throw error;
    return data; // Contient { foyer_id, invite_code, name }
  },

  /**
   * Rejoindre un foyer existant via code d'invitation
   */
  async joinFoyer(inviteCode: string, displayName: string, role: 'parent' | 'child' | 'guest' = 'child'): Promise<any> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    const { data, error } = await supabase.rpc('join_foyer', {
      p_invite_code: inviteCode,
      p_display_name: displayName,
      p_role: role
    });

    if (error) throw error;
    return data; // Contient { foyer_id, foyer_name, role }
  },

  /**
   * Récupérer le foyer auquel appartient l'utilisateur connecté
   */
  async getMyFoyer(): Promise<{ foyer: Foyer | null; member: FoyerMember | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { foyer: null, member: null };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { foyer: null, member: null };

    // 1. Trouver le lien membre
    const { data: memberData, error: memberError } = await supabase
      .from('foyer_members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !memberData) {
      return { foyer: null, member: null };
    }

    // 2. Trouver le foyer
    const { data: foyerData, error: foyerError } = await supabase
      .from('foyers')
      .select('*')
      .eq('id', memberData.foyer_id)
      .maybeSingle();

    if (foyerError || !foyerData) {
      return { foyer: null, member: memberData as any };
    }

    const foyer: Foyer = {
      id: foyerData.id,
      name: foyerData.name,
      inviteCode: foyerData.invite_code,
      inviteLink: foyerData.invite_link,
      createdBy: foyerData.created_by,
      createdAt: foyerData.created_at,
      isPremium: foyerData.is_premium,
      maxMembers: foyerData.max_members
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
      hasExemption: memberData.has_exemption !== undefined 
        ? (!!memberData.has_exemption || localStorage.getItem('exemption_' + memberData.id) === 'true') 
        : localStorage.getItem('exemption_' + memberData.id) === 'true',
      joinedAt: memberData.joined_at,
      latitude: memberData.latitude,
      longitude: memberData.longitude,
      locationStatus: memberData.location_status,
      lastLocatedAt: memberData.last_located_at
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
      hasExemption: m.has_exemption !== undefined 
        ? (!!m.has_exemption || localStorage.getItem('exemption_' + m.id) === 'true') 
        : localStorage.getItem('exemption_' + m.id) === 'true',
      joinedAt: m.joined_at,
      latitude: m.latitude,
      longitude: m.longitude,
      locationStatus: m.location_status,
      lastLocatedAt: m.last_located_at
    }));
  },

  /**
   * Inviter un membre par email
   */
  async inviteByEmail(foyerId: string, email: string, role: 'parent' | 'child' | 'guest' = 'child'): Promise<void> {
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
   * Mettre à jour les informations d'un membre (ex: profil santé, allergies...)
   */
  async updateMemberProfile(memberId: string, updates: Partial<FoyerMember>): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase n'est pas configuré");

    // 1. Sauvegarde en localStorage local en guise de fallback instantané
    if (updates.hasExemption !== undefined) {
      localStorage.setItem('exemption_' + memberId, updates.hasExemption ? 'true' : 'false');
    }

    const runRpc = async (includeExemption: boolean) => {
      const rpcParams: any = { p_member_id: memberId };
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
      const dbUpdates: any = {};
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
      if (errorMsg.includes('has_exemption') || errorMsg.includes('hasExemption') || errorMsg.includes('column') || errorMsg.includes('parameter')) {
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
    } catch (err: any) {
      console.error('[MaFamille+ DB] updateMemberProfile failed permanently:', err.message);
      // Ne pas planter l'application pour l'utilisateur, le localStorage a déjà été mis à jour
    }
  },

  // ============================================
  // SYNCHRONISATION DES MODULES
  // ============================================

  /**
   * Récupérer toutes les lignes d'une table pour un foyer donné
   */
  async fetchTableData(tableName: string, foyerId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('foyer_id', foyerId);

    if (error) {
      console.error(`Erreur fetchTableData sur ${tableName} :`, error);
      return [];
    }

    return data || [];
  },

  /**
   * Sauvegarder ou mettre à jour (upsert) un élément dans une table
   */
  async upsertItem(tableName: string, foyerId: string, item: any): Promise<void> {
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
  async addMemberToFoyer(foyerId: string, member: any): Promise<FoyerMember> {
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
      emergency_contact_name: member.emergencyContact?.name || 'Maman',
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
      hasExemption: data.has_exemption !== undefined 
        ? (!!data.has_exemption || localStorage.getItem('exemption_' + data.id) === 'true') 
        : localStorage.getItem('exemption_' + data.id) === 'true',
      joinedAt: data.joined_at,
      latitude: data.latitude,
      longitude: data.longitude,
      locationStatus: data.location_status,
      lastLocatedAt: data.last_located_at
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
   * S'abonner aux changements temps réel sur une table pour un foyer
   */
  subscribeToChanges(tableName: string, foyerId: string, onEvent: (payload: any) => void) {
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
