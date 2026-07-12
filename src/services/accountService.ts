import { getSupabaseClient } from '../utils/supabase';

export type AccountDeletionResult = {
  deleted: boolean;
  transferredFoyers?: number;
  deletedFoyers?: number;
};

const readFunctionError = async (error: unknown): Promise<string> => {
  const fallback = 'La suppression du compte a échoué.';
  if (!error || typeof error !== 'object') return fallback;

  const context = 'context' in error ? error.context : undefined;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { message?: string; error?: string };
      if (payload.message) return payload.message;
      if (payload.error === 'unauthorized') {
        return 'Votre session a expiré. Reconnectez-vous avant de supprimer le compte.';
      }
    } catch {
      // The response body is not JSON; use the SDK message below.
    }
  }

  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
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
      throw new Error(await readFunctionError(error));
    }
    if (!data?.deleted) {
      throw new Error("Le serveur n'a pas confirmé la suppression du compte.");
    }

    return data;
  }
};
