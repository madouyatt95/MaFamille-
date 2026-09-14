-- Opt-in web pilot. No policy on existing family data is relaxed.
CREATE TABLE IF NOT EXISTS public.voice_pilot_receipts (
  foyer_id uuid NOT NULL REFERENCES public.foyers(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  member_id uuid NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (foyer_id, id)
);
ALTER TABLE public.voice_pilot_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voice_pilot_receipts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.voice_pilot_available(p_foyer uuid, p_member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.foyer_members WHERE id=p_member AND foyer_id=p_foyer AND user_id=auth.uid() AND approved=true AND role IN ('admin','parent'));
$$;
REVOKE ALL ON FUNCTION public.voice_pilot_available(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.voice_pilot_available(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.commit_voice_pilot(p_foyer uuid, p_member uuid, p_id uuid, p_expires timestamptz, p_before jsonb, p_action jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '2s' AS $$
DECLARE
  actor public.foyer_members%ROWTYPE;
  current_rows jsonb; imported_rows jsonb; previous_receipt text;
  fingerprint text := md5(jsonb_build_array(p_member,p_before,p_action)::text);
  row_data jsonb; event_data jsonb; other jsonb; old_row jsonb;
  start_at timestamptz; stop_at timestamptz; other_start timestamptz; other_stop timestamptz;
  zone text; duration integer; other_duration integer; changes integer := 0;
BEGIN
  SELECT * INTO actor FROM public.foyer_members WHERE id=p_member AND foyer_id=p_foyer AND user_id=auth.uid() AND approved=true AND role IN ('admin','parent') FOR SHARE;
  IF actor.id IS NULL THEN RAISE EXCEPTION 'permission conflict'; END IF;
  IF p_id IS NULL OR p_expires IS NULL OR p_expires < now() OR p_expires > now()+interval '3 minutes' OR p_before IS NULL OR p_action IS NULL OR octet_length(p_before::text)>500000 OR octet_length(p_action::text)>100000 THEN RAISE EXCEPTION 'invalid request'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_foyer::text, 914));
  SELECT r.fingerprint INTO previous_receipt FROM public.voice_pilot_receipts r WHERE foyer_id=p_foyer AND id=p_id;
  IF previous_receipt IS NOT NULL THEN
    IF previous_receipt <> fingerprint THEN RAISE EXCEPTION 'receipt conflict'; END IF;
    RETURN true;
  END IF;
  DELETE FROM public.voice_pilot_receipts WHERE foyer_id=p_foyer AND created_at<now()-interval '1 day';
  IF (SELECT count(*) FROM public.voice_pilot_receipts WHERE foyer_id=p_foyer)>=200 THEN RAISE EXCEPTION 'daily pilot limit'; END IF;
  -- Existing writers do not share an advisory lock. A short table lock prevents
  -- inserts/updates between the snapshot comparison and the atomic write.
  IF p_action->>'kind'='groceries' THEN
    LOCK TABLE public.groceries IN SHARE ROW EXCLUSIVE MODE;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,'quantity',quantity,'checked',checked) ORDER BY id),'[]') INTO current_rows FROM public.groceries WHERE foyer_id=p_foyer;
    IF current_rows <> p_before THEN RAISE EXCEPTION 'list conflict'; END IF;
    IF jsonb_typeof(p_action->'after') IS DISTINCT FROM 'array' OR jsonb_array_length(p_action->'after')>200 THEN RAISE EXCEPTION 'invalid list'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_action->'after') x GROUP BY x->>'id' HAVING count(*)>1)
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_action->'after') x GROUP BY lower(x->>'name') HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate'; END IF;
    FOR row_data IN SELECT value FROM jsonb_array_elements(p_action->'after') LOOP
      SELECT value INTO old_row FROM jsonb_array_elements(current_rows) WHERE value->>'id'=row_data->>'id';
      IF old_row = row_data THEN CONTINUE; END IF;
      IF jsonb_typeof(row_data) IS DISTINCT FROM 'object' OR COALESCE(length(row_data->>'id'),0) NOT BETWEEN 1 AND 100 OR COALESCE(length(trim(row_data->>'name')),0) NOT BETWEEN 2 AND 70
        OR COALESCE(length(row_data->>'category'),0) NOT BETWEEN 1 AND 80 OR COALESCE(length(row_data->>'quantity'),0) NOT BETWEEN 1 AND 80 OR jsonb_typeof(row_data->'checked') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid product'; END IF;
      IF old_row IS DISTINCT FROM row_data THEN changes:=changes+1; END IF;
    END LOOP;
    changes:=changes+(SELECT count(*) FROM jsonb_array_elements(current_rows) x WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_action->'after') y WHERE y->>'id'=x->>'id'));
    IF changes<1 OR changes>40 THEN RAISE EXCEPTION 'change limit'; END IF;
    DELETE FROM public.groceries g WHERE foyer_id=p_foyer AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_action->'after') x WHERE x->>'id'=g.id);
    FOR row_data IN SELECT value FROM jsonb_array_elements(p_action->'after') LOOP
      SELECT value INTO old_row FROM jsonb_array_elements(current_rows) WHERE value->>'id'=row_data->>'id';
      IF old_row IS NULL THEN
        INSERT INTO public.groceries(id,foyer_id,name,category,quantity,checked,in_stock,added_by,sender_user_id,sender_member_id,sender_name)
          VALUES(row_data->>'id',p_foyer,row_data->>'name',row_data->>'category',row_data->>'quantity',(row_data->>'checked')::boolean,false,actor.display_name,auth.uid(),actor.id::text,actor.display_name);
      ELSIF old_row IS DISTINCT FROM row_data THEN
        UPDATE public.groceries SET name=row_data->>'name',category=row_data->>'category',quantity=row_data->>'quantity',checked=(row_data->>'checked')::boolean WHERE foyer_id=p_foyer AND id=row_data->>'id';
      END IF;
    END LOOP;
  ELSIF p_action->>'kind'='event' THEN
    LOCK TABLE public.events, public.external_calendar_events IN SHARE ROW EXCLUSIVE MODE;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'title',title,'date_time',date_time,'time',time,'member_id',member_id,'done',done) ORDER BY id),'[]') INTO current_rows FROM public.events WHERE foyer_id=p_foyer;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'start_at',e.start_at,'end_at',e.end_at,'is_all_day',e.is_all_day,'member_id',e.member_id) ORDER BY e.id),'[]') INTO imported_rows FROM public.external_calendar_events e WHERE e.foyer_id=p_foyer;
    -- Timestamp strings from PostgREST can use an equivalent UTC notation.
    IF jsonb_typeof(p_before->'events') IS DISTINCT FROM 'array' OR jsonb_typeof(p_before->'external') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid agenda'; END IF;
    IF current_rows <> p_before->'events' OR jsonb_array_length(imported_rows)<>jsonb_array_length(p_before->'external') THEN RAISE EXCEPTION 'agenda conflict'; END IF;
    FOR other IN SELECT value FROM jsonb_array_elements(imported_rows) LOOP
      SELECT value INTO old_row FROM jsonb_array_elements(p_before->'external') WHERE value->>'id'=other->>'id';
      IF old_row IS NULL OR (old_row-'start_at'-'end_at')<>(other-'start_at'-'end_at') OR (old_row->>'start_at')::timestamptz IS DISTINCT FROM (other->>'start_at')::timestamptz OR (old_row->>'end_at')::timestamptz IS DISTINCT FROM (other->>'end_at')::timestamptz THEN RAISE EXCEPTION 'calendar conflict'; END IF;
    END LOOP;
    SELECT value INTO event_data FROM jsonb_array_elements(current_rows) WHERE value->>'id'=p_action->>'eventId';
    zone:=p_action->>'timezone';
    IF event_data IS NULL OR COALESCE((event_data->>'done')::boolean,false) OR COALESCE(event_data->>'date_time','') !~ '^\d{4}-\d{2}-\d{2}$' OR COALESCE(p_action->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR zone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'invalid event'; END IF;
    duration:=(p_action->'durations'->>(event_data->>'id'))::integer;
    IF duration IS NULL OR duration NOT BETWEEN 5 AND 720 THEN RAISE EXCEPTION 'duration missing'; END IF;
    start_at:=((event_data->>'date_time') || ' ' || (p_action->>'time'))::timestamp AT TIME ZONE zone;
    stop_at:=start_at+make_interval(mins=>duration);
    -- Do not silently normalize a nonexistent or duplicated daylight-saving time.
    IF to_char(start_at AT TIME ZONE zone,'YYYY-MM-DD HH24:MI') <> (event_data->>'date_time')||' '||(p_action->>'time')
      OR EXISTS (SELECT 1 FROM unnest(ARRAY[-120,-60,-30,30,60,120]) delta WHERE (start_at+make_interval(mins=>delta)) AT TIME ZONE zone = start_at AT TIME ZONE zone) THEN RAISE EXCEPTION 'ambiguous time conflict'; END IF;
    IF start_at<=now() OR (stop_at AT TIME ZONE zone)::date <> (start_at AT TIME ZONE zone)::date OR p_action->>'time'=event_data->>'time' THEN RAISE EXCEPTION 'invalid time'; END IF;
    FOR other IN SELECT value FROM jsonb_array_elements(current_rows) LOOP
      IF other->>'id'=event_data->>'id' OR COALESCE((other->>'done')::boolean,false) THEN CONTINUE; END IF;
      IF COALESCE(other->>'date_time','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'unknown agenda conflict'; END IF;
      IF (other->>'date_time')::date NOT BETWEEN (event_data->>'date_time')::date-1 AND (event_data->>'date_time')::date THEN CONTINUE; END IF;
      IF COALESCE(other->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'unknown time conflict'; END IF;
      other_duration:=(p_action->'durations'->>(other->>'id'))::integer;
      IF other_duration IS NULL OR other_duration NOT BETWEEN 5 AND 720 THEN RAISE EXCEPTION 'duration missing'; END IF;
      other_start:=((other->>'date_time')||' '||(other->>'time'))::timestamp AT TIME ZONE zone;
      other_stop:=other_start+make_interval(mins=>other_duration);
      IF start_at<other_stop AND stop_at>other_start THEN RAISE EXCEPTION 'time conflict'; END IF;
    END LOOP;
    FOR other IN SELECT value FROM jsonb_array_elements(imported_rows) LOOP
      other_start:=(other->>'start_at')::timestamptz; other_stop:=(other->>'end_at')::timestamptz;
      IF other_start IS NULL OR other_stop IS NULL OR other_stop<=other_start THEN RAISE EXCEPTION 'unknown calendar conflict'; END IF;
      IF start_at<other_stop AND stop_at>other_start THEN RAISE EXCEPTION 'calendar time conflict'; END IF;
    END LOOP;
    UPDATE public.events SET time=p_action->>'time' WHERE foyer_id=p_foyer AND id=event_data->>'id';
  ELSE RAISE EXCEPTION 'invalid action';
  END IF;
  INSERT INTO public.voice_pilot_receipts(foyer_id,id,member_id,fingerprint) VALUES(p_foyer,p_id,p_member,fingerprint);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.commit_voice_pilot(uuid,uuid,uuid,timestamptz,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commit_voice_pilot(uuid,uuid,uuid,timestamptz,jsonb,jsonb) TO authenticated;
