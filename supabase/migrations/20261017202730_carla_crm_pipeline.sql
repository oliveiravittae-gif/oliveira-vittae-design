-- Additive CRM only. Protection, client formalization and commission rules are unchanged.
create table public.carla_opportunity_pipeline (
 opportunity_id uuid primary key references public.carla_opportunities(id) on delete restrict,
 stage text not null check(stage in ('prospecting','contacted','diagnosis','demo','proposal','negotiation','won','lost')),
 next_action text check(length(next_action) between 1 and 1000),
 next_action_at timestamptz,
 loss_reason text check(length(loss_reason) between 10 and 2000),
 notes text not null default '' check(length(notes)<=4000),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id),
 check((stage in ('won','lost') and next_action is null and next_action_at is null)
   or (stage not in ('won','lost') and next_action is not null and next_action_at is not null)),
 check((stage='lost' and loss_reason is not null) or (stage<>'lost' and loss_reason is null))
);
create index carla_crm_next_action on public.carla_opportunity_pipeline(next_action_at) where stage not in ('won','lost');
create table public.carla_crm_history (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.carla_opportunities(id) on delete restrict,
 before_data jsonb, after_data jsonb not null,
 actor uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index carla_crm_history_opportunity on public.carla_crm_history(opportunity_id,created_at);
alter table public.carla_opportunity_pipeline enable row level security;
alter table public.carla_crm_history enable row level security;
revoke all on public.carla_opportunity_pipeline,public.carla_crm_history from public,anon,authenticated;
grant select on public.carla_opportunity_pipeline,public.carla_crm_history to authenticated;
grant insert(opportunity_id,stage,next_action,next_action_at,loss_reason,notes) on public.carla_opportunity_pipeline to authenticated;
grant update(stage,next_action,next_action_at,loss_reason,notes) on public.carla_opportunity_pipeline to authenticated;
create policy crm_read on public.carla_opportunity_pipeline for select to authenticated using (
 (select carla_private.is_admin()) or exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=(select auth.uid()) and (select carla_private.is_active()))
);
create policy crm_insert on public.carla_opportunity_pipeline for insert to authenticated with check (
 (select carla_private.is_admin()) or exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=(select auth.uid()) and (select carla_private.is_active()))
);
create policy crm_update on public.carla_opportunity_pipeline for update to authenticated using (
 (select carla_private.is_admin()) or exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=(select auth.uid()) and (select carla_private.is_active()))
) with check (
 (select carla_private.is_admin()) or exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=(select auth.uid()) and (select carla_private.is_active()))
);
create policy crm_history_read on public.carla_crm_history for select to authenticated using (
 (select carla_private.is_admin()) or exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=(select auth.uid()) and (select carla_private.is_active()))
);
-- The private trigger alone writes immutable history. It explicitly rechecks the caller;
-- direct client writes cannot forge the actor, timestamps, version or audit trail.
create function carla_private.crm_stamp() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (carla_private.is_admin() or (carla_private.is_active() and exists(select 1 from public.carla_opportunities o where o.id=new.opportunity_id and o.representative_id=auth.uid()))) then
  raise exception 'Acesso ao CRM não autorizado';
 end if;
 if tg_op='UPDATE' and new.opportunity_id<>old.opportunity_id then raise exception 'Oportunidade não pode ser alterada'; end if;
 new.updated_by:=auth.uid(); new.updated_at:=now();
 if tg_op='UPDATE' then new.version:=old.version+1; else new.version:=1; end if;
 insert into public.carla_crm_history(opportunity_id,before_data,after_data,actor)
 values(new.opportunity_id,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),auth.uid());
 return new;
end $$;
revoke all on function carla_private.crm_stamp() from public,anon,authenticated;
create trigger carla_crm_stamp before insert or update on public.carla_opportunity_pipeline for each row execute function carla_private.crm_stamp();
create function public.carla_save_pipeline(p_opportunity uuid,p_stage text,p_next_action text,p_next_at timestamptz,p_loss_reason text,p_notes text,p_version integer)
returns setof public.carla_opportunity_pipeline language plpgsql security invoker set search_path='' as $$
declare current_version integer;
begin
 if auth.uid() is null or not (carla_private.is_admin() or (carla_private.is_active() and exists(select 1 from public.carla_opportunities o where o.id=p_opportunity and o.representative_id=auth.uid()))) then raise exception 'Acesso ao CRM não autorizado'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carla-crm:'||p_opportunity::text,0));
 select version into current_version from public.carla_opportunity_pipeline where opportunity_id=p_opportunity;
 if coalesce(current_version,0) is distinct from p_version then raise exception 'Este acompanhamento foi atualizado por outra pessoa. Atualize o CRM antes de salvar.'; end if;
 if p_stage not in ('won','lost') and (coalesce(length(trim(p_next_action)),0)=0 or p_next_at is null) then raise exception 'Informe a próxima ação e a data de acompanhamento'; end if;
 if p_stage='lost' and coalesce(length(trim(p_loss_reason)),0)<10 then raise exception 'Informe o motivo da perda com pelo menos 10 caracteres'; end if;
 if current_version is null then
  return query insert into public.carla_opportunity_pipeline(opportunity_id,stage,next_action,next_action_at,loss_reason,notes)
   values(p_opportunity,p_stage,case when p_stage in ('won','lost') then null else trim(p_next_action) end,case when p_stage in ('won','lost') then null else p_next_at end,case when p_stage='lost' then trim(p_loss_reason) else null end,coalesce(p_notes,'')) returning *;
 else
  return query update public.carla_opportunity_pipeline set stage=p_stage,next_action=case when p_stage in ('won','lost') then null else trim(p_next_action) end,next_action_at=case when p_stage in ('won','lost') then null else p_next_at end,loss_reason=case when p_stage='lost' then trim(p_loss_reason) else null end,notes=coalesce(p_notes,'') where opportunity_id=p_opportunity returning *;
 end if;
end $$;
revoke all on function public.carla_save_pipeline(uuid,text,text,timestamptz,text,text,integer) from public,anon;
grant execute on function public.carla_save_pipeline(uuid,text,text,timestamptz,text,text,integer) to authenticated;
