-- Hosted Supabase grants EXECUTE to anon directly via default privileges.
-- Put privileged implementations in a non-exposed schema and keep narrow invoker RPCs.
do $$
declare r record; arguments text; forwarded text; result_type text; body text;
begin
 for r in
  select p.oid,p.proname,p.proargnames,p.pronargs
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'carla_%' and p.prosecdef
 loop
  arguments:=pg_get_function_arguments(r.oid);
  result_type:=pg_get_function_result(r.oid);
  select string_agg(format('%I',r.proargnames[i]),', ' order by i)
    into forwarded from generate_series(1,r.pronargs) as i;
  execute format('alter function %s set schema carla_private',r.oid::regprocedure);
  execute format('revoke all on function %s from public,anon,authenticated',r.oid::regprocedure);
  execute format('grant execute on function %s to authenticated',r.oid::regprocedure);
  if r.proname='carla_verify_card' then
   execute format('grant execute on function %s to anon',r.oid::regprocedure);
  end if;
  body:=format('select * from carla_private.%I(%s)',r.proname,forwarded);
  execute format('create function public.%I(%s) returns %s language sql security invoker set search_path = '''' as %L',r.proname,arguments,result_type,body);
 end loop;
end $$;
grant usage on schema carla_private to anon;
do $$ declare f regprocedure; n text; begin
 for f,n in select p.oid::regprocedure,p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname like 'carla_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f);
  execute format('grant execute on function %s to authenticated',f);
  if n='carla_verify_card' then execute format('grant execute on function %s to anon',f); end if;
 end loop;
end $$;

-- Administrative profile changes use guarded RPCs; the only direct update is a pending applicant's photo.
drop policy profile_admin_update on public.carla_profiles;
alter policy transfers_read on public.carla_transfers to authenticated
using((select carla_private.is_admin()) or ((select carla_private.is_active()) and (select auth.uid()) in (from_representative,to_representative)));

-- Cover missing foreign keys without duplicating existing leading-column indexes.
do $$ declare r record; columns text; begin
 for r in
  select con.conname,con.conrelid,con.conkey,n.nspname,c.relname
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where con.contype='f' and n.nspname in ('public','carla_private') and (c.relname like 'carla_%' or (n.nspname='carla_private' and c.relname='admins'))
   and not exists(select 1 from pg_index ix where ix.indrelid=con.conrelid and ix.indisvalid and (ix.indkey::smallint[])[0:cardinality(con.conkey)-1]=con.conkey)
 loop
  select string_agg(format('%I',a.attname),',' order by k.ordinality) into columns
  from unnest(r.conkey) with ordinality as k(attnum,ordinality) join pg_attribute a on a.attrelid=r.conrelid and a.attnum=k.attnum;
  execute format('create index if not exists %I on %I.%I(%s)',left(r.conname||'_idx',63),r.nspname,r.relname,columns);
 end loop;
end $$;
create index if not exists carla_clients_credit_order on public.carla_clients(acquisition_representative_id,first_credit_at);
create index if not exists carla_commissions_invoice_kind on public.carla_commissions(invoice_id,kind);
