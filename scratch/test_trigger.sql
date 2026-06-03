DO $$
DECLARE
    v_foyer_id UUID;
    v_member_id UUID;
BEGIN
    SELECT id INTO v_foyer_id FROM public.foyers LIMIT 1;
    IF v_foyer_id IS NOT NULL THEN
        v_member_id := gen_random_uuid();
        
        -- Insert dummy member to trigger notify_member_join()
        INSERT INTO public.foyer_members (id, foyer_id, display_name, role, approved)
        VALUES (v_member_id, v_foyer_id, 'Test Trigger Member', 'child', FALSE);
        
        -- Clean up
        DELETE FROM public.foyer_members WHERE id = v_member_id;
        
        RAISE NOTICE 'Trigger ran successfully without errors!';
    ELSE
        RAISE NOTICE 'No foyer found to test the trigger.';
    END IF;
END $$;
