-- Central allocation is concurrency-safe and cannot be supplied by signup metadata.
create sequence carla_private.registration_2026 start with 1005 maxvalue 9999999 no cycle;
revoke all on sequence carla_private.registration_2026 from public,anon,authenticated;
-- Preserve previously issued registrations and avoid collisions if the format already exists.
select setval('carla_private.registration_2026',greatest(1005,coalesce((
 select max(substring(registration from 10)::bigint)+1
 from public.carla_profiles where registration ~ '^CLR-2026-[0-9]{7}$'
),1005)),false);
create or replace function carla_private.signup_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.raw_user_meta_data->>'carla_signup' = 'true' then
  insert into public.carla_profiles(id,name,registration,document,address,phone)
  values(new.id,new.raw_user_meta_data->>'name',
   'CLR-2026-'||lpad(nextval('carla_private.registration_2026')::text,7,'0'),
   new.raw_user_meta_data->>'document',new.raw_user_meta_data->>'address',new.raw_user_meta_data->>'phone');
 end if;
 return new;
end $$;
revoke all on function carla_private.signup_profile() from public,anon,authenticated;
