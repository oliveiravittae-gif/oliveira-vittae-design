begin;
create temporary table crm_fixture as select gen_random_uuid() as id,(select p.id from public.carla_profiles p where p.name ilike '%fict%demo%' and p.status='active' limit 1) as owner;
insert into public.carla_opportunities(id,representative_id,company,contact,channel,evidence) select id,owner,'TESTE CRM ROLLBACK','Contato sintético','Teste técnico','Evidência fictícia apenas para teste transacional' from crm_fixture;
select set_config('request.jwt.claim.sub',(select owner::text from crm_fixture),true);
grant select on crm_fixture to authenticated;
set local role authenticated;
select * from public.carla_save_pipeline((select id from crm_fixture),'contacted','Retornar contato fictício',now()+interval '1 day',null,'Somente teste com rollback',0);
select * from public.carla_save_pipeline((select id from crm_fixture),'won',null,null,null,'Teste não formaliza cliente nem comissão',1);
do $$ begin
 if not exists(select 1 from public.carla_opportunity_pipeline where opportunity_id=(select id from crm_fixture) and stage='won' and version=2 and next_action_at is null) then raise exception 'CRM readback failed'; end if;
 if (select count(*) from public.carla_crm_history where opportunity_id=(select id from crm_fixture))<>2 then raise exception 'CRM history failed'; end if;
 if not exists(select 1 from public.carla_opportunities where id=(select id from crm_fixture) and status='pending' and protected_until is null) then raise exception 'Protection changed unexpectedly'; end if;
end $$;
reset role;
rollback;
select 'PASS: owner write, version, immutable history, protection unchanged; all fixtures rolled back' as result;
