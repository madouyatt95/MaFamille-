SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    prosrc AS function_source
FROM pg_trigger
JOIN pg_class ON pg_class.oid = tgrelid
JOIN pg_proc ON pg_proc.oid = tgfoid
WHERE relname = 'foyer_members';
