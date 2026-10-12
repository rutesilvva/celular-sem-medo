import { readFile } from 'node:fs/promises';

const failures = [];
const [appConfig, easConfigText, packageText] = await Promise.all([
  readFile(new URL('../app.config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../eas.json', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
]);
const eas = JSON.parse(easConfigText);
const pkg = JSON.parse(packageText);

for (const expected of ["scheme: 'celularsemmedo'", "bundleIdentifier: 'br.com.celularsemmedo.app'", "package: 'br.com.celularsemmedo.app'"]) {
  if (!appConfig.includes(expected)) failures.push(`Identidade nativa ausente: ${expected}`);
}
for (const profile of ['development', 'preview', 'presentation', 'production']) {
  if (!eas.build?.[profile]) failures.push(`Perfil EAS ausente: ${profile}`);
}
for (const [profile, channel] of [['development', 'development'], ['preview', 'preview'], ['production', 'production']]) {
  if (eas.build?.[profile]?.channel !== channel) failures.push(`Canal OTA inválido no perfil ${profile}.`);
}
if (eas.build?.presentation?.channel !== 'presentation') failures.push('Canal OTA inválido no perfil presentation.');
const presentationEnv = eas.build?.presentation?.env ?? {};
if (presentationEnv.EXPO_PUBLIC_APP_ENV !== 'staging') failures.push('Build presentation deve usar staging.');
if (presentationEnv.EXPO_PUBLIC_DEMO_MODE !== 'true') failures.push('Build presentation deve habilitar demonstração explicitamente.');
if (presentationEnv.EXPO_PUBLIC_ENABLE_DEVELOPMENT_MOCKS !== 'false') failures.push('Build presentation não pode habilitar mocks globais.');
if (eas.cli?.requireCommit !== true) failures.push('EAS deve exigir árvore Git commitada.');
if (!eas.build?.production?.autoIncrement) failures.push('Build production deve incrementar a versão nativa.');
for (const script of ['test:ci', 'build:preview:android', 'build:preview:ios', 'build:presentation:android', 'build:production', 'submit:production']) {
  if (!pkg.scripts?.[script]) failures.push(`Script obrigatório ausente: ${script}`);
}

const target = process.env.RELEASE_ENV;
if (target) {
  const required = ['EXPO_PUBLIC_APP_ENV', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID'];
  for (const name of required) if (!process.env[name]) failures.push(`Variável ausente para ${target}: ${name}`);
  if (process.env.EXPO_PUBLIC_APP_ENV !== target) failures.push(`EXPO_PUBLIC_APP_ENV deve ser ${target}.`);
  if (target === 'production' && process.env.EXPO_PUBLIC_DEMO_MODE === 'true') failures.push('Modo demonstração deve permanecer desativado em production.');
  if (target === 'production' && process.env.EXPO_PUBLIC_ENABLE_DEVELOPMENT_MOCKS === 'true') failures.push('Mocks de desenvolvimento devem permanecer desativados em production.');
  for (const name of Object.keys(process.env)) {
    if (name.startsWith('EXPO_PUBLIC_') && /SECRET|PASSWORD|SERVICE_ROLE|PRIVATE_KEY|ACCESS_TOKEN/i.test(name)) failures.push(`Segredo não pode ser público: ${name}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Configuração de release válida${target ? ` para ${target}` : ''}.`);
}
