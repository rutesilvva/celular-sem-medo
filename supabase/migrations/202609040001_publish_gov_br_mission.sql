begin;

insert into public.missions(id,slug,title,summary,category,difficulty,estimated_minutes,status)
values (
  '10000000-0000-4000-8000-00000000000a','criar-conta-gov-br','Criar conta no Gov.br',
  'Pratique a criação de uma conta Gov.br em nove etapas, sem informar dados pessoais nem acessar o portal real.',
  'Serviços Públicos','medium',6,'active'
)
on conflict(id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,
  category=excluded.category,difficulty=excluded.difficulty,estimated_minutes=excluded.estimated_minutes,status=excluded.status;

insert into public.mission_versions(id,mission_id,version,status,title,description,learning_objective,content_language,changelog,published_at)
values (
  '20000000-0000-4000-8000-00000000000a','10000000-0000-4000-8000-00000000000a',1,'published',
  'Criar conta no Gov.br','Simulação educativa do fluxo de cadastro, inteiramente isolada de sistemas governamentais.',
  'Reconhecer as etapas de identificação, validação, contato e criação de senha de uma conta Gov.br.',
  'pt-BR','Primeira versão publicada da jornada Gov.br.',now()
)
on conflict(id) do update set status=excluded.status,title=excluded.title,description=excluded.description,
  learning_objective=excluded.learning_objective,changelog=excluded.changelog,
  published_at=coalesce(public.mission_versions.published_at,excluded.published_at);

insert into public.mission_steps(id,mission_version_id,position,step_type,title,instruction,audio_text,safety_note,expected_action,options,hints)
values
('30000000-0000-4000-8000-000000000030','20000000-0000-4000-8000-00000000000a',1,'instruction','Identifique-se com um CPF simulado','Observe o campo de CPF da simulação e toque em Continuar.','Esta é a primeira tela do Gov.br. Use somente os dados fictícios exibidos no treino e toque em Continuar.','Nunca informe seu CPF real nesta atividade. Nada será enviado ao Gov.br.','{"action":"continue"}','[]','["Procure o botão azul Continuar abaixo do campo fictício."]'),
('30000000-0000-4000-8000-000000000031','20000000-0000-4000-8000-00000000000a',2,'instruction','Confira os termos e a validação','Marque os termos simulados, observe a validação Sou humano e toque em Continuar.','Confira os termos de privacidade simulados, marque a validação e toque em Continuar.','Os termos e a validação existem somente dentro do treino.','{"action":"continue"}','[]','["Marque os dois controles antes de continuar."]'),
('30000000-0000-4000-8000-000000000032','20000000-0000-4000-8000-00000000000a',3,'instruction','Escolha outra forma de identificação','Observe as opções bancárias fictícias e escolha Tentar de outra forma.','Nesta simulação, escolha tentar de outra forma para seguir sem conectar um banco.','Nenhum banco ou aplicativo financeiro será aberto.','{"action":"continue"}','[]','["O botão Tentar de outra forma fica abaixo das opções de bancos."]'),
('30000000-0000-4000-8000-000000000033','20000000-0000-4000-8000-00000000000a',4,'instruction','Confirme dados fictícios','Selecione o nome, o mês e o ano indicados na própria tela de treino.','Escolha as três informações fictícias apresentadas e toque em Continuar.','Não use nome, data de nascimento ou informações reais.','{"action":"continue"}','[]','["Selecione uma opção em cada grupo."]'),
('30000000-0000-4000-8000-000000000034','20000000-0000-4000-8000-00000000000a',5,'instruction','Revise o resumo','Confira o resumo mascarado e toque em Continuar.','Revise os dados fictícios apresentados no resumo antes de continuar.','Nenhuma informação será salva ou consultada em sistemas do governo.','{"action":"continue"}','[]','["Confira cada linha do resumo com calma."]'),
('30000000-0000-4000-8000-000000000035','20000000-0000-4000-8000-00000000000a',6,'instruction','Escolha o contato simulado','Escolha um canal fictício para receber o código e feche o aviso de atenção.','Escolha telefone ou e-mail de treino, leia o aviso e continue.','Nenhum SMS ou e-mail real será enviado.','{"action":"continue"}','[]','["Escolha um canal, feche o aviso e toque em Continuar."]'),
('30000000-0000-4000-8000-000000000036','20000000-0000-4000-8000-00000000000a',7,'instruction','Valide o código fictício','Observe o código preenchido na simulação e toque em Continuar.','O código desta tela é apenas ilustrativo. Toque em Continuar.','Nunca compartilhe códigos reais recebidos por SMS ou e-mail.','{"action":"continue"}','[]','["O código já está preenchido no treino."]'),
('30000000-0000-4000-8000-000000000037','20000000-0000-4000-8000-00000000000a',8,'instruction','Cadastre uma senha de treino','Confira os requisitos da senha fictícia e toque em Continuar.','Observe os requisitos de segurança e use somente a senha fictícia mostrada no treino.','Nunca digite sua senha real, bancária ou do Gov.br nesta atividade.','{"action":"continue"}','[]','["Confira os cinco requisitos antes de continuar."]'),
('30000000-0000-4000-8000-000000000038','20000000-0000-4000-8000-00000000000a',9,'confirmation','Conta Bronze simulada','A criação fictícia foi concluída. Toque em Concluir para encerrar o treinamento.','Parabéns. Na simulação, você criou uma conta Gov.br de nível Bronze. Toque em Concluir.','Nenhuma conta Gov.br real foi criada.','{"action":"choose","option_id":"finish"}','[{"id":"finish","label":"Concluir"}]','["Toque no botão Concluir."]')
on conflict(id) do update set position=excluded.position,step_type=excluded.step_type,title=excluded.title,
  instruction=excluded.instruction,audio_text=excluded.audio_text,safety_note=excluded.safety_note,
  expected_action=excluded.expected_action,options=excluded.options,hints=excluded.hints;

insert into public.class_mission_assignments(class_id,mission_version_id,assigned_by,assigned_by_role,status,is_required)
select class.id,'20000000-0000-4000-8000-00000000000a',administrator.user_id,'admin','active',false
from public.classes class
cross join lateral(select user_id from public.administrators where status='active' order by granted_at limit 1) administrator
where class.status='active'
on conflict(class_id,mission_version_id) do update set status='active',available_from=least(public.class_mission_assignments.available_from,now());

commit;
