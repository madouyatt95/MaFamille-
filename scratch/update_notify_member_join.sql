CREATE OR REPLACE FUNCTION public.notify_member_join()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.approved = FALSE) THEN
        INSERT INTO public.alerts (
            id, foyer_id, title, description, time, type, read, module,
            sender_user_id, sender_member_id, sender_name, sender_avatar
        )
        VALUES (
            NEW.id::text,
            NEW.foyer_id,
            'Demande d''adhésion',
            NEW.display_name || ' souhaite rejoindre votre foyer.',
            'À l''instant',
            'warning',
            FALSE,
            'members',
            NEW.user_id,
            NEW.id,
            NEW.display_name,
            NEW.photo_url
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.approved = FALSE AND NEW.approved = TRUE) THEN
        DELETE FROM public.alerts WHERE id = NEW.id::text;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.alerts WHERE id = OLD.id::text;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
