UPDATE public.foyer_members
SET blood_group = CASE
  WHEN blood_group LIKE 'ROLE:%|%|%' THEN
    'ROLE:chef_famille|' || split_part(blood_group, '|', 2) || '|' || split_part(blood_group, '|', 3)
  WHEN blood_group LIKE 'ROLE:%|%' THEN
    'ROLE:chef_famille|' || split_part(blood_group, '|', 2)
  ELSE
    'ROLE:chef_famille|' || COALESCE(NULLIF(blood_group, ''), 'O+')
END
WHERE role = 'admin'
  AND (blood_group IS NULL OR blood_group NOT LIKE 'ROLE:chef_famille|%');
