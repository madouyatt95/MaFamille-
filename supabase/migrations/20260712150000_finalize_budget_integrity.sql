-- Keep account balances and internal transfers consistent under concurrent use.

CREATE OR REPLACE FUNCTION public.adjust_budget_account_balance(
  p_account_id TEXT,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_foyer_id UUID;
  v_balance NUMERIC;
BEGIN
  SELECT foyer_id INTO v_foyer_id
  FROM public.accounts
  WHERE id::TEXT = p_account_id
  FOR UPDATE;

  IF v_foyer_id IS NULL OR NOT public.is_foyer_admin_or_parent(v_foyer_id) THEN
    RAISE EXCEPTION 'Accès refusé au compte';
  END IF;

  UPDATE public.accounts
  SET balance = ROUND((COALESCE(balance, 0) + COALESCE(p_delta, 0))::NUMERIC, 2)
  WHERE id::TEXT = p_account_id
  RETURNING balance INTO v_balance;

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_budget_funds(
  p_foyer_id UUID,
  p_source_account_id TEXT,
  p_target_account_id TEXT,
  p_amount NUMERIC,
  p_title TEXT,
  p_source_transaction_id TEXT,
  p_target_transaction_id TEXT,
  p_transaction_date DATE,
  p_entry_time TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_name TEXT;
  v_target_name TEXT;
BEGIN
  IF NOT public.is_foyer_admin_or_parent(p_foyer_id) THEN
    RAISE EXCEPTION 'Accès refusé au foyer';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_source_account_id = p_target_account_id THEN
    RAISE EXCEPTION 'Virement invalide';
  END IF;

  SELECT name INTO v_source_name FROM public.accounts
  WHERE id::TEXT = p_source_account_id AND foyer_id = p_foyer_id
  FOR UPDATE;
  SELECT name INTO v_target_name FROM public.accounts
  WHERE id::TEXT = p_target_account_id AND foyer_id = p_foyer_id
  FOR UPDATE;

  IF v_source_name IS NULL OR v_target_name IS NULL THEN
    RAISE EXCEPTION 'Compte introuvable';
  END IF;

  UPDATE public.accounts SET balance = ROUND((COALESCE(balance, 0) - p_amount)::NUMERIC, 2)
  WHERE id::TEXT = p_source_account_id;
  UPDATE public.accounts SET balance = ROUND((COALESCE(balance, 0) + p_amount)::NUMERIC, 2)
  WHERE id::TEXT = p_target_account_id;

  INSERT INTO public.transactions (
    id, foyer_id, amount, type, category, sub_category, date, title, account_id, comment, recurrence
  ) VALUES
  (
    p_source_transaction_id, p_foyer_id, p_amount, 'expense', 'Autres', 'Virement', p_transaction_date,
    'Virement sortant : ' || COALESCE(NULLIF(TRIM(p_title), ''), v_target_name), p_source_account_id,
    'Vers ' || v_target_name || E'\n[MF_META]{"moduleSource":"budget","entryTime":"' || COALESCE(p_entry_time, '') || '"}', 'none'
  ),
  (
    p_target_transaction_id, p_foyer_id, p_amount, 'income', 'Autres', 'Virement', p_transaction_date,
    'Virement entrant : ' || COALESCE(NULLIF(TRIM(p_title), ''), v_source_name), p_target_account_id,
    'Depuis ' || v_source_name || E'\n[MF_META]{"moduleSource":"budget","entryTime":"' || COALESCE(p_entry_time, '') || '"}', 'none'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_budget_transaction(p_transaction JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT := p_transaction->>'id';
  v_foyer_id UUID := (p_transaction->>'foyer_id')::UUID;
  v_amount NUMERIC := ROUND(COALESCE((p_transaction->>'amount')::NUMERIC, 0), 2);
  v_type TEXT := COALESCE(p_transaction->>'type', 'expense');
  v_account_id TEXT := NULLIF(p_transaction->>'account_id', '');
  v_old_account_id TEXT;
  v_old_amount NUMERIC;
  v_old_type TEXT;
BEGIN
  IF v_id IS NULL OR v_amount <= 0 OR NOT public.is_foyer_admin_or_parent(v_foyer_id) THEN
    RAISE EXCEPTION 'Transaction budgétaire invalide ou non autorisée';
  END IF;

  SELECT account_id::TEXT, amount, type
  INTO v_old_account_id, v_old_amount, v_old_type
  FROM public.transactions
  WHERE id::TEXT = v_id
  FOR UPDATE;

  INSERT INTO public.transactions (
    id, foyer_id, amount, type, category, date, title, member_id, member_name,
    sub_category, account_id, comment, recurrence, subscription_id
  ) VALUES (
    v_id,
    v_foyer_id,
    v_amount,
    v_type,
    COALESCE(p_transaction->>'category', 'Divers'),
    COALESCE((p_transaction->>'date')::DATE, CURRENT_DATE),
    COALESCE(NULLIF(p_transaction->>'title', ''), 'Opération'),
    NULLIF(p_transaction->>'member_id', ''),
    NULLIF(p_transaction->>'member_name', ''),
    NULLIF(p_transaction->>'sub_category', ''),
    v_account_id,
    NULLIF(p_transaction->>'comment', ''),
    COALESCE(NULLIF(p_transaction->>'recurrence', ''), 'none'),
    NULLIF(p_transaction->>'subscription_id', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    date = EXCLUDED.date,
    title = EXCLUDED.title,
    member_id = EXCLUDED.member_id,
    member_name = EXCLUDED.member_name,
    sub_category = EXCLUDED.sub_category,
    account_id = EXCLUDED.account_id,
    comment = EXCLUDED.comment,
    recurrence = EXCLUDED.recurrence,
    subscription_id = EXCLUDED.subscription_id;

  IF v_old_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = ROUND((COALESCE(balance, 0) + CASE WHEN v_old_type = 'income' THEN -v_old_amount ELSE v_old_amount END)::NUMERIC, 2)
    WHERE id::TEXT = v_old_account_id AND foyer_id = v_foyer_id;
  END IF;
  IF v_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = ROUND((COALESCE(balance, 0) + CASE WHEN v_type = 'income' THEN v_amount ELSE -v_amount END)::NUMERIC, 2)
    WHERE id::TEXT = v_account_id AND foyer_id = v_foyer_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_budget_transaction(p_transaction_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_foyer_id UUID;
  v_account_id TEXT;
  v_amount NUMERIC;
  v_type TEXT;
BEGIN
  SELECT foyer_id, account_id::TEXT, amount, type
  INTO v_foyer_id, v_account_id, v_amount, v_type
  FROM public.transactions
  WHERE id::TEXT = p_transaction_id
  FOR UPDATE;

  IF v_foyer_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.is_foyer_admin_or_parent(v_foyer_id) THEN
    RAISE EXCEPTION 'Suppression non autorisée';
  END IF;

  DELETE FROM public.transactions WHERE id::TEXT = p_transaction_id;
  IF v_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = ROUND((COALESCE(balance, 0) + CASE WHEN v_type = 'income' THEN -v_amount ELSE v_amount END)::NUMERIC, 2)
    WHERE id::TEXT = v_account_id AND foyer_id = v_foyer_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_budget_account_balance(TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_budget_funds(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_budget_transaction(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_budget_transaction(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_budget_account_balance(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_budget_funds(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_budget_transaction(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_budget_transaction(TEXT) TO authenticated;
