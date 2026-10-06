-- CARLA: additive isolated schema. No changes to existing institutional tables.
create schema if not exists carla_private;
revoke all on schema carla_private from public;
grant usage on schema carla_private to authenticated;
create table carla_private.admins (user_id uuid primary key references auth.users(id));
alter table carla_private.admins enable row level security;
revoke all on carla_private.admins from anon, authenticated;

create function carla_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from carla_private.admins where user_id = auth.uid())
$$;
revoke all on function carla_private.is_admin() from public;
grant execute on function carla_private.is_admin() to authenticated;
create function public.carla_is_admin() returns boolean language sql stable security invoker set search_path = '' as $$ select carla_private.is_admin() $$;
revoke all on function public.carla_is_admin() from public;
grant execute on function public.carla_is_admin() to authenticated;

create function carla_private.valid_cpf(value text) returns boolean language plpgsql immutable set search_path = '' as $$
declare s integer; d integer; i integer; n integer;
begin
 if value !~ '^[0-9]{11}$' or value ~ '^([0-9])\1{10}$' then return false; end if;
 for n in 9..10 loop
  s := 0;
  for i in 1..n loop s := s + substring(value,i,1)::integer * (n+2-i); end loop;
  d := (s*10)%11; if d=10 then d:=0; end if;
  if d <> substring(value,n+1,1)::integer then return false; end if;
 end loop;
 return true;
end $$;

create table public.carla_profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 name text not null check (length(trim(name)) >= 5),
 registration text not null unique check(length(trim(registration)) >= 2),
 document text not null unique check(carla_private.valid_cpf(document)),
 address text not null check(length(trim(address)) >= 15),
 phone text not null check(phone ~ '^\+?[0-9]{10,15}$'),
 status text not null default 'pending' check(status in ('pending','active','suspended','ended')),
 photo_path text check(photo_path is null or photo_path like id::text || '/%'),
 card_token uuid not null unique default gen_random_uuid(),
 created_at timestamptz not null default now()
);
alter table public.carla_profiles enable row level security;
create function carla_private.is_active() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.carla_profiles where id=auth.uid() and status='active')
$$;
revoke all on function carla_private.is_active() from public;
grant execute on function carla_private.is_active() to authenticated;
create policy profile_read on public.carla_profiles for select to authenticated using(id=(select auth.uid()) or (select carla_private.is_admin()));
create policy profile_admin_update on public.carla_profiles for update to authenticated using((select carla_private.is_admin())) with check((select carla_private.is_admin()));
-- Only photo can be changed directly by the applicant, never status or identity.
create policy profile_photo_update on public.carla_profiles for update to authenticated using(id=(select auth.uid()) and status='pending') with check(id=(select auth.uid()) and status='pending');
grant select on public.carla_profiles to authenticated;
grant update(photo_path) on public.carla_profiles to authenticated;

create function carla_private.signup_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.raw_user_meta_data->>'carla_signup' = 'true' then
  insert into public.carla_profiles(id,name,registration,document,address,phone)
  values(new.id,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'registration',new.raw_user_meta_data->>'document',new.raw_user_meta_data->>'address',new.raw_user_meta_data->>'phone');
 end if;
 return new;
end $$;
revoke all on function carla_private.signup_profile() from public;
create trigger carla_signup after insert on auth.users for each row execute function carla_private.signup_profile();

create table public.carla_opportunities (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 representative_id uuid not null references public.carla_profiles(id),
 company text not null check(length(trim(company))>=2), contact text not null check(length(trim(contact))>=3),
 channel text not null check(length(trim(channel))>0), evidence text not null check(length(trim(evidence))>=10),
 status text not null default 'pending' check(status in ('pending','protected','rejected','closed')),
 protected_until timestamptz, decision_reason text,
 created_at timestamptz not null default now()
);
create index carla_opportunities_owner on public.carla_opportunities(representative_id,created_at);
create table public.carla_opportunity_interactions (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.carla_opportunities(id),
 representative_id uuid not null references public.carla_profiles(id), occurred_at timestamptz not null,
 channel text not null check(length(trim(channel))>0), evidence text not null check(length(trim(evidence))>=10),
 confirmed boolean not null default false
);
create table public.carla_clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>=2),
 representative_id uuid not null references public.carla_profiles(id), acquisition_representative_id uuid not null references public.carla_profiles(id),
 opportunity_id uuid not null unique references public.carla_opportunities(id), contract_ref text not null check(length(trim(contract_ref))>=3),
 status text not null default 'active' check(status in ('active','cancelled')),
 accepted_at timestamptz not null default now(),
 activated_at timestamptz not null, tier smallint check(tier in (1,2)), first_credit_at timestamptz,
 created_at timestamptz not null default now()
);
create index carla_clients_owner on public.carla_clients(representative_id);
create table public.carla_retention_cycles (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.carla_clients(id),
 representative_id uuid not null references public.carla_profiles(id), starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'open' check(status in ('open','submitted','fulfilled','exception','rejected','transferred','cancelled')),
 decision_reason text, decided_by uuid references auth.users(id), check(ends_at>starts_at), unique(client_id,starts_at)
);
create index carla_cycles_owner on public.carla_retention_cycles(representative_id,ends_at);
create table public.carla_retention_contacts (
 id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.carla_retention_cycles(id),
 representative_id uuid not null references public.carla_profiles(id), occurred_at timestamptz not null,
 channel text not null check(length(trim(channel))>0), interlocutor text not null check(length(trim(interlocutor))>0),
 subject text not null check(length(trim(subject))>=3), result text not null check(length(trim(result))>=3),
 satisfaction text not null, risk text not null, referral text not null, recipient text not null, next_step text not null,
 evidence text not null check(length(trim(evidence))>=10), responded boolean not null,
 created_at timestamptz not null default now()
);
create index carla_contacts_cycle on public.carla_retention_contacts(cycle_id,occurred_at);
create table public.carla_invoices (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.carla_clients(id),
 representative_id uuid not null references public.carla_profiles(id),
 competence integer not null check(competence>0), kind text not null check(kind in ('setup','monthly')),
 due_at timestamptz not null, original_cents bigint not null check(original_cents>0), expansion_cents bigint not null default 0 check(expansion_cents>=0),
 expansion_event text, expansion_index integer check(expansion_index>0), expansion_evidence text,
 renewal_event text, renewal_evidence text, retention_cycle_id uuid references public.carla_retention_cycles(id),
 retention_eligible boolean not null default false,
 received_cents bigint not null default 0 check(received_cents>=0 and received_cents<=original_cents+expansion_cents),
 unique(client_id,kind,competence),
 check(expansion_cents=0 or (kind='monthly' and expansion_event is not null and expansion_index is not null and expansion_evidence is not null and length(trim(expansion_evidence))>=10)),
 check(renewal_event is null or (kind='monthly' and renewal_evidence is not null and length(trim(renewal_evidence))>=10))
);
create index carla_invoices_owner on public.carla_invoices(representative_id,due_at);
create unique index carla_renewal_event_unique on public.carla_invoices(client_id,renewal_event) where renewal_event is not null;
create unique index carla_expansion_period_unique on public.carla_invoices(client_id,expansion_event,expansion_index) where expansion_event is not null;
create table public.carla_receipts (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.carla_invoices(id),
 representative_id uuid not null references public.carla_profiles(id), external_ref text not null unique check(length(trim(external_ref))>=3),
 amount_cents bigint not null check(amount_cents>0), settled_at timestamptz not null, evidence text not null check(length(trim(evidence))>=10),
 recorded_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.carla_commissions (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.carla_invoices(id), receipt_id uuid not null references public.carla_receipts(id),
 representative_id uuid not null references public.carla_profiles(id),
 kind text not null check(kind in ('setup','acquisition','retention','expansion','renewal')),
 base_cents bigint not null, rate integer not null, amount_cents bigint not null check(amount_cents>=0),
 status text not null default 'accrued' check(status in ('accrued','paid','disputed')),
 due_date date not null, paid_at timestamptz, payment_ref text, created_at timestamptz not null default now(), unique(receipt_id,kind)
);
create index carla_commissions_owner on public.carla_commissions(representative_id,created_at);
create table public.carla_disputes (
 id uuid primary key default gen_random_uuid(), commission_id uuid not null references public.carla_commissions(id),
 representative_id uuid not null references public.carla_profiles(id), reason text not null check(length(trim(reason))>=10),
 response text, status text not null default 'open' check(status in ('open','answered')), created_at timestamptz not null default now()
);
create table public.carla_audit (
 id bigint generated always as identity primary key, actor uuid, entity text not null, record_id uuid not null,
 action text not null, occurred_at timestamptz not null default now()
);
alter table public.carla_audit enable row level security;
create policy audit_admin on public.carla_audit for select to authenticated using((select carla_private.is_admin()));
grant select on public.carla_audit to authenticated;
create function carla_private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.carla_audit(actor,entity,record_id,action) values(auth.uid(),tg_table_name,new.id,tg_op);
 return new;
end $$;
revoke all on function carla_private.audit_change() from public;

do $$ declare t text; begin
 foreach t in array array['carla_opportunities','carla_opportunity_interactions','carla_clients','carla_retention_cycles','carla_retention_contacts','carla_invoices','carla_receipts','carla_commissions','carla_disputes'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_read on public.%I for select to authenticated using ((representative_id=(select auth.uid()) and (select carla_private.is_active())) or (select carla_private.is_admin()))',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create trigger audit_change after insert or update on public.%I for each row execute function carla_private.audit_change()',t);
end loop;
end $$;

create policy opportunity_submit on public.carla_opportunities for insert to authenticated with check(representative_id=(select auth.uid()) and (select carla_private.is_active()) and status='pending' and protected_until is null and decision_reason is null);
grant insert(representative_id,company,contact,channel,evidence) on public.carla_opportunities to authenticated;
create policy interaction_submit on public.carla_opportunity_interactions for insert to authenticated with check(representative_id=(select auth.uid()) and (select carla_private.is_active()) and not confirmed and occurred_at<=now() and exists(select 1 from public.carla_opportunities o where o.id=opportunity_id and o.representative_id=auth.uid()));
grant insert(opportunity_id,representative_id,occurred_at,channel,evidence) on public.carla_opportunity_interactions to authenticated;
create policy contact_submit on public.carla_retention_contacts for insert to authenticated with check(representative_id=(select auth.uid()) and (select carla_private.is_active()) and occurred_at<=now() and exists(select 1 from public.carla_retention_cycles c where c.id=cycle_id and c.representative_id=auth.uid() and c.status in ('open','submitted','rejected') and occurred_at>=c.starts_at and occurred_at<=c.ends_at));
grant insert(cycle_id,representative_id,occurred_at,channel,interlocutor,subject,result,satisfaction,risk,referral,recipient,next_step,evidence,responded) on public.carla_retention_contacts to authenticated;
create policy dispute_submit on public.carla_disputes for insert to authenticated with check(representative_id=(select auth.uid()) and (select carla_private.is_active()) and status='open' and response is null and exists(select 1 from public.carla_commissions c where c.id=commission_id and c.representative_id=auth.uid()));
grant insert(commission_id,representative_id,reason) on public.carla_disputes to authenticated;

-- Private photos; UUID owner folder. No public URLs, no service key in browser.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('carla-photos','carla-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy carla_photo_read on storage.objects for select to authenticated using(bucket_id='carla-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select carla_private.is_admin())));
create policy carla_photo_insert on storage.objects for insert to authenticated with check(bucket_id='carla-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.carla_profiles p where p.id=auth.uid() and p.status='pending'));
create policy carla_photo_delete on storage.objects for delete to authenticated using(bucket_id='carla-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.carla_profiles p where p.id=auth.uid() and p.status='pending'));

create function public.carla_review_profile(profile_id uuid, new_status text, reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if new_status not in ('active','suspended','ended') or coalesce(length(trim(reason)),0)<10 then raise exception 'Informe status e justificativa'; end if;
 if new_status='active' and not exists(select 1 from public.carla_profiles p join storage.objects o on o.name=p.photo_path and o.bucket_id='carla-photos' where p.id=profile_id) then raise exception 'Foto obrigatória antes da aprovação'; end if;
 update public.carla_profiles set status=new_status where id=profile_id;
 insert into public.carla_decisions(entity,record_id,reason,actor) values('profile',profile_id,reason,auth.uid());
end $$;
create table public.carla_decisions(id uuid primary key default gen_random_uuid(),entity text not null,record_id uuid not null,reason text not null,actor uuid not null,created_at timestamptz not null default now());
alter table public.carla_decisions enable row level security;
create policy decision_admin on public.carla_decisions for select to authenticated using((select carla_private.is_admin()));
grant select on public.carla_decisions to authenticated;

create function public.carla_review_opportunity(opportunity uuid, approved boolean, reason text, interaction uuid default null) returns void language plpgsql security definer set search_path = '' as $$
declare at_time timestamptz; o public.carla_opportunities;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if coalesce(length(trim(reason)),0)<10 then raise exception 'Justificativa obrigatória'; end if;
 select * into strict o from public.carla_opportunities where id=opportunity for update;
 if o.status='closed' then raise exception 'Oportunidade convertida possui histórico preservado'; end if;
 at_time:=o.created_at;
 if interaction is not null then
  select occurred_at into strict at_time from public.carla_opportunity_interactions where id=interaction and opportunity_id=opportunity and representative_id=o.representative_id;
  update public.carla_opportunity_interactions set confirmed=approved where id=interaction;
 end if;
 update public.carla_opportunities set status=case when approved then 'protected' else 'rejected' end,protected_until=case when approved then greatest(coalesce(protected_until,at_time),at_time+interval '90 days') else protected_until end,decision_reason=reason where id=opportunity;
end $$;

create function public.carla_create_client(opportunity uuid, client_name text, contract text, activation timestamptz, acceptance timestamptz) returns uuid language plpgsql security definer set search_path = '' as $$
declare o public.carla_opportunities; cid uuid;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 select * into strict o from public.carla_opportunities where id=opportunity and status='protected' for update;
 if o.protected_until<now() or not exists(select 1 from public.carla_profiles where id=o.representative_id and status='active') then raise exception 'Revise a atribuição e o vínculo antes da conversão'; end if;
 if acceptance>activation or acceptance>now() or activation>now() then raise exception 'Aceite e ativação devem ser datas reais'; end if;
 insert into public.carla_clients(name,representative_id,acquisition_representative_id,opportunity_id,contract_ref,activated_at,accepted_at) values(client_name,o.representative_id,o.representative_id,o.id,contract,activation,acceptance) returning id into cid;
 insert into public.carla_retention_cycles(client_id,representative_id,starts_at,ends_at) values(cid,o.representative_id,activation,activation+interval '30 days');
 update public.carla_opportunities set status='closed' where id=opportunity;
 return cid;
end $$;

create function public.carla_review_cycle(cycle uuid, decision text, reason text) returns void language plpgsql security definer set search_path = '' as $$
declare c public.carla_retention_cycles; last_contact timestamptz; distinct_days integer;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if decision not in ('fulfilled','exception','rejected') or coalesce(length(trim(reason)),0)<10 then raise exception 'Justificativa e decisão obrigatórias'; end if;
 select * into strict c from public.carla_retention_cycles where id=cycle and status in ('open','submitted','rejected') for update;
 if decision='fulfilled' then
  select max(occurred_at) into last_contact from public.carla_retention_contacts where cycle_id=cycle and responded;
  select count(distinct (occurred_at at time zone 'America/Sao_Paulo')::date) into distinct_days from public.carla_retention_contacts where cycle_id=cycle and not responded;
  if last_contact is null and distinct_days<2 then raise exception 'Exige contato com resposta ou duas tentativas em dias distintos'; end if;
 end if;
 update public.carla_retention_cycles set status=decision,decision_reason=reason,decided_by=auth.uid() where id=cycle;
 if decision in ('fulfilled','exception') then
  -- A reply resets cadence from the valid contact. No reply closes its original 30-day cycle.
  last_contact:=coalesce(last_contact,c.ends_at);
  insert into public.carla_retention_cycles(client_id,representative_id,starts_at,ends_at) values(c.client_id,c.representative_id,last_contact,last_contact+interval '30 days') on conflict do nothing;
 end if;
end $$;

create function public.carla_create_invoice(payload jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.carla_clients; iid uuid; owner uuid; cycle uuid; eligible boolean := false; cycle_status text;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 select * into strict c from public.carla_clients where id=(payload->>'client_id')::uuid;
 owner:=case when payload->>'kind'='setup' or (payload->>'competence')::integer<=3 then c.acquisition_representative_id else c.representative_id end;
 cycle:=nullif(payload->>'retention_cycle_id','')::uuid;
 if cycle is not null and not exists(select 1 from public.carla_retention_cycles where id=cycle and client_id=c.id and representative_id=owner) then raise exception 'Ciclo incompatível com cliente e responsável'; end if;
 if payload->>'kind'='monthly' and ((payload->>'competence')::integer>=4 or nullif(payload->>'renewal_event','') is not null or coalesce(nullif(payload->>'expansion_index','')::integer,0)>1) then
  select status into cycle_status from public.carla_retention_cycles where id=cycle;
  if cycle_status is null or cycle_status not in ('fulfilled','exception','rejected') then raise exception 'Conclua a análise do protocolo antes da apuração'; end if;
  if c.status<>'active' or not exists(select 1 from public.carla_profiles where id=owner and status='active') then raise exception 'Direito de período anterior exige registro de ajuste fundamentado'; end if;
  eligible:=cycle_status in ('fulfilled','exception');
 end if;
 insert into public.carla_invoices(client_id,representative_id,competence,kind,due_at,original_cents,expansion_cents,expansion_event,expansion_index,expansion_evidence,renewal_event,renewal_evidence,retention_cycle_id,retention_eligible)
 values(c.id,owner,(payload->>'competence')::integer,payload->>'kind',(payload->>'due_at')::timestamptz,(payload->>'original_cents')::bigint,coalesce((payload->>'expansion_cents')::bigint,0),nullif(payload->>'expansion_event',''),nullif(payload->>'expansion_index','')::integer,nullif(payload->>'expansion_evidence',''),nullif(payload->>'renewal_event',''),nullif(payload->>'renewal_evidence',''),cycle,eligible) returning id into iid;
 return iid;
end $$;

create function public.carla_record_receipt(invoice uuid, cents bigint, reference text, settlement timestamptz, proof text) returns uuid language plpgsql security definer set search_path = '' as $$
declare i public.carla_invoices; c public.carla_clients; rid uuid; cumulative bigint; original_base bigint; expansion_base bigint; eligible boolean; kind_name text; rate_value integer; base_value bigint; previous bigint; accrued bigint; tier_value integer; due date;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 -- Serialize credit ordering across all clients, and freeze the assigned tier.
 perform pg_advisory_xact_lock(671009);
 select * into strict i from public.carla_invoices where id=invoice for update;
 select * into strict c from public.carla_clients where id=i.client_id for update;
 if cents is null or settlement is null or cents<=0 or cents+i.received_cents>i.original_cents+i.expansion_cents or settlement>now() or settlement<c.accepted_at then raise exception 'Recebimento inválido ou excedente'; end if;
 if c.first_credit_at is null then
  select case when count(*)=0 then 1 else 2 end into tier_value from public.carla_clients where acquisition_representative_id=c.acquisition_representative_id and date_trunc('month',first_credit_at at time zone 'America/Sao_Paulo')=date_trunc('month',settlement at time zone 'America/Sao_Paulo');
  if exists(select 1 from public.carla_clients where acquisition_representative_id=c.acquisition_representative_id and first_credit_at>settlement) then raise exception 'Créditos devem ser conciliados em ordem; crédito anterior exige revisão documentada'; end if;
  if exists(select 1 from public.carla_clients cc join public.carla_opportunities oo on oo.id=cc.opportunity_id where cc.acquisition_representative_id=c.acquisition_representative_id and cc.first_credit_at=settlement and (cc.accepted_at>c.accepted_at or (cc.accepted_at=c.accepted_at and oo.sequence>(select sequence from public.carla_opportunities where id=c.opportunity_id)))) then raise exception 'Empate de crédito: respeite ordem do aceite e sequência da oportunidade'; end if;
  update public.carla_clients set tier=tier_value,first_credit_at=settlement where id=c.id;
  c.tier:=tier_value;
 end if;
 insert into public.carla_receipts(invoice_id,representative_id,external_ref,amount_cents,settled_at,evidence,recorded_by) values(i.id,i.representative_id,reference,cents,settlement,proof,auth.uid()) returning id into rid;
 cumulative:=i.received_cents+cents;
 original_base:=round(cumulative::numeric*i.original_cents/(i.original_cents+i.expansion_cents)); expansion_base:=cumulative-original_base;
 eligible:=i.retention_eligible;
 -- Eligibility reviewed at the contractual period, not at delayed payment time. Immutable historical rights are retained.
 due:=((date_trunc('month',settlement at time zone 'America/Sao_Paulo')+interval '1 month')::date+14);
 foreach kind_name in array array['setup','acquisition','retention','expansion','renewal'] loop
  rate_value:=0; base_value:=0;
  if kind_name='setup' and i.kind='setup' then rate_value:=case when c.tier=1 then 30 else 35 end; base_value:=original_base; end if;
  if kind_name='acquisition' and i.kind='monthly' and i.competence<=3 then rate_value:=case when c.tier=1 then 10 else 15 end; base_value:=original_base; end if;
  if kind_name='retention' and i.kind='monthly' and i.competence>=4 and eligible then rate_value:=5; base_value:=original_base; end if;
  if kind_name='expansion' and i.expansion_cents>0 and (i.expansion_index=1 or eligible) then rate_value:=case when i.expansion_index=1 then 20 else 5 end; base_value:=expansion_base; end if;
  if kind_name='renewal' and i.renewal_event is not null and eligible then rate_value:=20; base_value:=cumulative; end if;
  if rate_value>0 then
   select coalesce(sum(amount_cents),0) into previous from public.carla_commissions where invoice_id=i.id and kind=kind_name;
   accrued:=round(base_value::numeric*rate_value/100)-previous;
   if accrued>0 then insert into public.carla_commissions(invoice_id,receipt_id,representative_id,kind,base_cents,rate,amount_cents,due_date) values(i.id,rid,i.representative_id,kind_name,base_value,rate_value,accrued,due); end if;
  end if;
 end loop;
 update public.carla_invoices set received_cents=cumulative where id=i.id;
 return rid;
end $$;

create function public.carla_pay_commission(commission uuid, payment text, paid timestamptz) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if coalesce(length(trim(payment)),0)<3 or paid>now() then raise exception 'Comprovante e data válidos obrigatórios'; end if;
 update public.carla_commissions set status='paid',paid_at=paid,payment_ref=payment where id=commission and status='accrued';
 if not found then raise exception 'Comissão indisponível para pagamento'; end if;
end $$;
create function public.carla_verify_card(token uuid) returns table(name text,registration text) language sql stable security definer set search_path = '' as $$
 select p.name,p.registration from public.carla_profiles p where p.card_token=token and p.status='active'
$$;
-- Narrow public verification: no CPF, email, address, photo or list endpoint.
revoke all on function public.carla_verify_card(uuid) from public;
grant execute on function public.carla_verify_card(uuid) to anon,authenticated;
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('carla_review_profile','carla_review_opportunity','carla_create_client','carla_review_cycle','carla_create_invoice','carla_record_receipt','carla_pay_commission') loop
  execute format('revoke all on function %s from public',f);
  execute format('grant execute on function %s to authenticated',f);
 end loop;
end $$;

-- Administrative transitions are explicit; acquired ledger entries are never deleted.
create table public.carla_transfers (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.carla_clients(id),
 from_representative uuid not null references public.carla_profiles(id), to_representative uuid not null references public.carla_profiles(id),
 effective_at timestamptz not null, reason text not null, transition_proof text not null, actor uuid not null, created_at timestamptz not null default now()
);
alter table public.carla_transfers enable row level security;
create policy transfers_read on public.carla_transfers for select to authenticated using((select carla_private.is_admin()) or ((select carla_private.is_active()) and auth.uid() in (from_representative,to_representative)));
create table public.carla_adjustments (
 id uuid primary key default gen_random_uuid(), representative_id uuid not null references public.carla_profiles(id),
 commission_id uuid references public.carla_commissions(id), amount_cents bigint not null check(amount_cents<>0),
 reason text not null check(length(trim(reason))>=10), evidence text not null check(length(trim(evidence))>=10), actor uuid not null,
 status text not null default 'reviewed' check(status in ('reviewed','paid')), payment_ref text, created_at timestamptz not null default now()
);
alter table public.carla_adjustments enable row level security;
create policy adjustment_read on public.carla_adjustments for select to authenticated using((select carla_private.is_admin()) or (representative_id=(select auth.uid()) and (select carla_private.is_active())));
create trigger audit_adjustment after insert or update on public.carla_adjustments for each row execute function carla_private.audit_change();

create function public.carla_transfer_client(client uuid, new_owner uuid, reason text, proof text) returns void language plpgsql security definer set search_path = '' as $$
declare c public.carla_clients; cut timestamptz := now();
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if coalesce(length(trim(reason)),0)<10 or coalesce(length(trim(proof)),0)<10 then raise exception 'Motivo e termo de transição obrigatórios'; end if;
 select * into strict c from public.carla_clients where id=client and status='active' for update;
 if new_owner=c.representative_id or not exists(select 1 from public.carla_profiles where id=new_owner and status='active') then raise exception 'Novo representante ativo necessário'; end if;
 -- Future registered periods cannot be silently transferred; review them explicitly first.
 if exists(select 1 from public.carla_invoices where client_id=c.id and kind='monthly' and competence>=4 and due_at>=cut) then raise exception 'Há competências futuras registradas: revise a transição antes de transferir'; end if;
 insert into public.carla_transfers(client_id,from_representative,to_representative,effective_at,reason,transition_proof,actor) values(c.id,c.representative_id,new_owner,cut,reason,proof,auth.uid());
 update public.carla_clients set representative_id=new_owner where id=c.id;
 update public.carla_retention_cycles set status='transferred',decision_reason=reason,decided_by=auth.uid() where client_id=c.id and representative_id=c.representative_id and status in ('open','submitted','rejected');
 insert into public.carla_retention_cycles(client_id,representative_id,starts_at,ends_at) values(c.id,new_owner,cut,cut+interval '30 days');
end $$;

create function public.carla_client_status(client uuid, new_status text, reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if new_status not in ('active','cancelled') or coalesce(length(trim(reason)),0)<10 then raise exception 'Status e motivo obrigatórios'; end if;
 update public.carla_clients set status=new_status where id=client;
 if new_status='cancelled' then update public.carla_retention_cycles set status='cancelled',decision_reason=reason,decided_by=auth.uid() where client_id=client and status in ('open','submitted','rejected'); end if;
 insert into public.carla_decisions(entity,record_id,reason,actor) values('client',client,reason,auth.uid());
end $$;

create function public.carla_answer_dispute(dispute uuid, answer text) returns void language plpgsql security definer set search_path = '' as $$
declare d public.carla_disputes;
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if coalesce(length(trim(answer)),0)<10 then raise exception 'Resposta fundamentada obrigatória'; end if;
 select * into strict d from public.carla_disputes where id=dispute for update;
 update public.carla_disputes set response=answer,status='answered' where id=d.id;
 insert into public.carla_decisions(entity,record_id,reason,actor) values('dispute',d.id,answer,auth.uid());
end $$;

create function public.carla_record_adjustment(owner uuid, commission uuid, cents bigint, reason text, proof text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not carla_private.is_admin() then raise exception 'Acesso administrativo necessário'; end if;
 if cents is null or cents=0 or coalesce(length(trim(reason)),0)<10 or coalesce(length(trim(proof)),0)<10 then raise exception 'Valor, fundamento e prova obrigatórios'; end if;
 if commission is not null and not exists(select 1 from public.carla_commissions where id=commission and representative_id=owner) then raise exception 'Comissão incompatível com representante'; end if;
 insert into public.carla_adjustments(representative_id,commission_id,amount_cents,reason,evidence,actor) values(owner,commission,cents,reason,proof,auth.uid());
end $$;

-- Supabase default privileges may grant ALL on new tables. Reset them explicitly.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'carla_%' loop
  execute format('revoke all on table public.%I from public,anon,authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
 end loop;
end $$;
grant update(photo_path) on public.carla_profiles to authenticated;
grant insert(representative_id,company,contact,channel,evidence) on public.carla_opportunities to authenticated;
grant insert(opportunity_id,representative_id,occurred_at,channel,evidence) on public.carla_opportunity_interactions to authenticated;
grant insert(cycle_id,representative_id,occurred_at,channel,interlocutor,subject,result,satisfaction,risk,referral,recipient,next_step,evidence,responded) on public.carla_retention_contacts to authenticated;
grant insert(commission_id,representative_id,reason) on public.carla_disputes to authenticated;
revoke all on function carla_private.valid_cpf(text) from public;
grant execute on function carla_private.valid_cpf(text) to authenticated;
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('carla_transfer_client','carla_client_status','carla_answer_dispute','carla_record_adjustment') loop
  execute format('revoke all on function %s from public',f);
  execute format('grant execute on function %s to authenticated',f);
 end loop;
end $$;
create trigger audit_profile after insert or update on public.carla_profiles for each row execute function carla_private.audit_change();
