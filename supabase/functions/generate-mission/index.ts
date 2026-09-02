// @ts-nocheck -- Executado pelo runtime Deno das Supabase Edge Functions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set(['http://127.0.0.1:8081', 'http://localhost:8081']);
const unsafeRequest = /\b(cpf|senha|password|token|cart[aã]o|cvv|pix|transfer|dep[oó]sito|aposta|cr[eé]dito)\b/i;
const unsafeOutput = /\b(digite|informe|envie|compartilhe)\b.{0,40}\b(cpf|senha|password|token|cart[aã]o|cvv|c[oó]digo real)\b/i;

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? '';
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : '',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  };
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);

  const authorization = request.headers.get('authorization');
  if (!authorization) return json({ error: 'authentication_required' }, 401, headers);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { authorization } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'authentication_required' }, 401, headers);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'invalid_request' }, 400, headers); }
  const query = typeof body === 'object' && body && 'query' in body ? String(body.query).trim() : '';
  if (query.length < 3 || query.length > 160) return json({ error: 'invalid_query' }, 400, headers);
  if (unsafeRequest.test(query)) return json({ error: 'unsafe_topic' }, 422, headers);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'provider_unavailable' }, 503, headers);
  const prompt = `Crie uma simulação de letramento digital em português para pessoa idosa sobre: ${JSON.stringify(query)}.
Nunca solicite dados reais, CPF, senha, token, pagamento, foto, localização ou permissão do aparelho. Toda interação deve ser fictícia e reversível.
Responda apenas JSON: {"title":string,"summary":string,"difficulty":"easy"|"medium"|"hard","estimatedMinutes":number,"steps":[{"type":"instruction"|"multiple_choice"|"confirmation","title":string,"instruction":string,"audioText":string,"safetyNote":string,"expectedAction":{"action":"continue"|"choose","option_id"?:string},"options":[{"id":string,"label":string}],"hints":[string]}]}. Use de 2 a 6 passos.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } }),
    });
    if (!response.ok) return json({ error: 'provider_unavailable' }, 502, headers);
    const provider = await response.json();
    const text = provider?.candidates?.[0]?.content?.parts?.[0]?.text;
    const generated = typeof text === 'string' ? JSON.parse(text) : null;
    if (!isValidMission(generated) || unsafeOutput.test(JSON.stringify(generated))) return json({ error: 'unsafe_generation' }, 422, headers);
    return json(generated, 200, headers);
  } catch {
    return json({ error: 'generation_failed' }, 502, headers);
  }
});

function isValidMission(value: any) {
  const text = (input: unknown, max: number) => typeof input === 'string' && input.trim().length > 0 && input.length <= max;
  return value && text(value.title, 80) && text(value.summary, 240)
    && ['easy', 'medium', 'hard'].includes(value.difficulty)
    && Number.isInteger(value.estimatedMinutes) && value.estimatedMinutes >= 1 && value.estimatedMinutes <= 20
    && Array.isArray(value.steps) && value.steps.length >= 2 && value.steps.length <= 6
    && value.steps.every((step: any) => text(step.title, 100) && text(step.instruction, 400)
      && text(step.audioText, 500) && text(step.safetyNote, 300)
      && ['instruction', 'multiple_choice', 'confirmation'].includes(step.type)
      && step.expectedAction && ['continue', 'choose'].includes(step.expectedAction.action)
      && Array.isArray(step.options) && step.options.length <= 6
      && step.options.every((option: any) => text(option.id, 60) && text(option.label, 160))
      && Array.isArray(step.hints) && step.hints.length <= 4 && step.hints.every((hint: unknown) => text(hint, 240)));
}

function json(value: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(value), { status, headers });
}
