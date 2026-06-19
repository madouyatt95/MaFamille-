import { getSupabaseClient } from '../utils/supabase';

export type AccountDeletionResult = {
  deleted: boolean;
  transferredFoyers?: number;
  deletedFoyers?: number;
};

export const accountService = {
  async deleteCurrentAccount(): Promise<AccountDeletionResult> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Le service de compte n'est pas disponible.");
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Votre session a expiré. Reconnectez-vous avant de supprimer le compte.');
    }

    const { data, error } = await supabase.functions.invoke<AccountDeletionResult>('delete-account', {
      body: { confirmation: 'DELETE_MY_ACCOUNT' }
    });

    if (error) {
      throw new Error(error.message || 'La suppression du compte a échoué.');
    }
    if (!data?.deleted) {
      throw new Error("Le serveur n'a pas confirmé la suppression du compte.");
    }

    return data;
  }
};
