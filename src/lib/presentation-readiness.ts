import { loadLocalMission } from '@/features/dynamic-missions/loader';

export type ReadinessStatus = 'ready' | 'warning';
export type PresentationCheck = { id: string; label: string; detail: string; status: ReadinessStatus };

export function getPresentationReadiness(input: {
  appEnvironment?: string;
  demoMode?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  googleWebClientId?: string;
} = {}): PresentationCheck[] {
  const appEnvironment = input.appEnvironment ?? process.env.EXPO_PUBLIC_APP_ENV;
  const demoMode = input.demoMode ?? process.env.EXPO_PUBLIC_DEMO_MODE;
  const supabaseUrl = input.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = input.supabaseKey ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const googleWebClientId = input.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID;
  const video = loadLocalMission('video');
  const fallback = loadLocalMission('fallback');
  return [
    { id: 'environment', label: 'Build de apresentação', detail: `${appEnvironment ?? 'não definido'} · demonstração ${demoMode === 'true' ? 'habilitada' : 'desabilitada'}`, status: appEnvironment !== 'production' && demoMode === 'true' ? 'ready' : 'warning' },
    { id: 'local-content', label: 'Conteúdo offline', detail: 'Missão dinâmica e fallback validados localmente', status: !video.usedFallback && !fallback.usedFallback ? 'ready' : 'warning' },
    { id: 'supabase', label: 'Supabase de staging', detail: supabaseUrl && supabaseKey ? 'Configuração pública presente; conexão real é opcional na demo' : 'Configuração incompleta; a demo continua offline', status: supabaseUrl && supabaseKey ? 'ready' : 'warning' },
    { id: 'google', label: 'Google OAuth', detail: googleWebClientId ? 'Client ID público presente; valide o provedor separadamente' : 'Ainda não configurado; use a demonstração offline', status: googleWebClientId ? 'ready' : 'warning' },
    { id: 'isolation', label: 'Isolamento de segurança', detail: 'A demonstração não cria sessão nem concede papel administrativo', status: 'ready' },
  ];
}
