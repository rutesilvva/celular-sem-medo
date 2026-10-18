begin;

update public.mission_steps
set options = '[{"id":"safe","label":"Dou minha senha se a pessoa souber meu nome"},{"id":"unsafe","label":"Não informo minha senha por telefone"}]'::jsonb
where id = '30000000-0000-4000-8000-000000000026';

update public.mission_steps
set options = '[{"id":"install","label":"Instalo o aplicativo enquanto a pessoa me orienta"},{"id":"refuse","label":"Não instalo e encerro a ligação"}]'::jsonb
where id = '30000000-0000-4000-8000-000000000027';

update public.mission_steps
set options = '[{"id":"callback","label":"Ligo de volta para o número que apareceu na chamada"},{"id":"official","label":"Procuro o banco no aplicativo oficial ou no verso do cartão"}]'::jsonb
where id = '30000000-0000-4000-8000-000000000028';

commit;
