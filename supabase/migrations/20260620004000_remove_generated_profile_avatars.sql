DO $$
BEGIN
  IF to_regclass('public.foyer_members') IS NOT NULL THEN
    UPDATE public.foyer_members
    SET photo_url = NULL
    WHERE photo_url ILIKE '%api.dicebear.com/%'
       OR photo_url ILIKE '%images.unsplash.com/photo-1590031905406%'
       OR photo_url ILIKE '%images.unsplash.com/photo-1500648767791%'
       OR photo_url ILIKE '%placeholder_avatar%';
  END IF;

  IF to_regclass('public.family_join_requests') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.family_join_requests
      SET applicant_avatar = NULL
      WHERE applicant_avatar ILIKE '%api.dicebear.com/%'
         OR applicant_avatar ILIKE '%images.unsplash.com/photo-1590031905406%'
         OR applicant_avatar ILIKE '%images.unsplash.com/photo-1500648767791%'
         OR applicant_avatar ILIKE '%placeholder_avatar%'
    $sql$;
  END IF;

  IF to_regclass('public.alerts') IS NOT NULL THEN
    UPDATE public.alerts
    SET sender_avatar = NULL
    WHERE sender_avatar ILIKE '%api.dicebear.com/%'
       OR sender_avatar ILIKE '%images.unsplash.com/photo-1590031905406%'
       OR sender_avatar ILIKE '%images.unsplash.com/photo-1500648767791%'
       OR sender_avatar ILIKE '%placeholder_avatar%';
  END IF;

  IF to_regclass('public.memories') IS NOT NULL THEN
    UPDATE public.memories
    SET author_photo = NULL
    WHERE author_photo ILIKE '%api.dicebear.com/%'
       OR author_photo ILIKE '%images.unsplash.com/photo-1590031905406%'
       OR author_photo ILIKE '%images.unsplash.com/photo-1500648767791%'
       OR author_photo ILIKE '%placeholder_avatar%';
  END IF;
END
$$;
