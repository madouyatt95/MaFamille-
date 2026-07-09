-- La suppression a ete retiree avant publication : Racines familiales est de nouveau actif.
-- Cette migration reste sans effet pour conserver une chaine de migrations saine
-- sur les environnements ou l'ancienne tentative de suppression a ete interrompue.
DO $$ BEGIN
  RAISE NOTICE 'Racines familiales conservees.';
END $$;
