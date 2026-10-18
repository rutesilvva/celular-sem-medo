begin;

update public.mission_steps
set options = '[{"id":"urgency-link","label":"A mensagem exige pressa e manda abrir um link desconhecido"},{"id":"logo","label":"A mensagem possui uma imagem ou logotipo"}]'::jsonb
where id = '30000000-0000-4000-8000-000000000020';

update public.mission_steps
set title = 'Abra a área Pix',
    instruction = 'Localize a opção Pix, informe uma chave fictícia, digite o valor combinado e revise os dados antes de avançar.',
    audio_text = 'Primeiro abra a opção Pix. Depois use a chave fictícia do treino, digite vinte reais e revise o nome e o valor antes de continuar.'
where id = '30000000-0000-4000-8000-000000000004';

commit;
