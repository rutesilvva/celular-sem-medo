import { spawnSync } from 'node:child_process';

const status = spawnSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
if (status.status !== 0) throw new Error('Supabase local precisa estar iniciado.');

const local = JSON.parse(status.stdout);
const url = local.API_URL;
const publishableKey = local.PUBLISHABLE_KEY ?? local.ANON_KEY;
if (!url || !publishableKey) throw new Error('Configuração pública local indisponível.');

const email = `auth-session-${crypto.randomUUID()}@test.invalid`;
const password = `Local-${crypto.randomUUID()}-Aa1!`;
const publicHeaders = { apikey: publishableKey, 'Content-Type': 'application/json' };

const signUpResponse = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST', headers: publicHeaders, body: JSON.stringify({ email, password }),
});
const signedIn = await signUpResponse.json();
if (!signUpResponse.ok || !signedIn.refresh_token) throw new Error('Falha ao criar sessão sintética local.');

const refreshResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: publicHeaders, body: JSON.stringify({ refresh_token: signedIn.refresh_token }),
});
const rotated = await refreshResponse.json();
if (!refreshResponse.ok || !rotated.refresh_token) throw new Error('Refresh rotativo válido foi rejeitado.');
if (rotated.refresh_token === signedIn.refresh_token) throw new Error('Refresh token não foi rotacionado.');

const revokedToken = rotated.refresh_token;
const logoutResponse = await fetch(`${url}/auth/v1/logout?scope=local`, {
  method: 'POST', headers: { ...publicHeaders, Authorization: `Bearer ${rotated.access_token}` },
});
if (!logoutResponse.ok) throw new Error('Logout local não revogou a sessão.');

const replayResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST', headers: publicHeaders, body: JSON.stringify({ refresh_token: revokedToken }),
});
if (replayResponse.ok) throw new Error('Refresh revogado criou uma nova sessão.');

process.stdout.write('Auth session integration: PASS\n');
