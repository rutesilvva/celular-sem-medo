// @ts-nocheck -- Esta função roda no Deno do Supabase, fora do runtime TypeScript do Expo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('HELP_PUSH_DISPATCH_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: events, error } = await supabase.from('push_outbox').select('*').is('processed_at', null).order('created_at').limit(50);
  if (error) return Response.json({ error: 'outbox_unavailable' }, { status: 500 });
  let delivered = 0;
  for (const event of events ?? []) {
    const { data: devices } = await supabase.from('push_devices').select('id,expo_push_token').eq('user_id', event.recipient_id).eq('enabled', true);
    let failed = false;
    for (const device of devices ?? []) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            to: device.expo_push_token, title: event.title, body: event.body,
            sound: null, channelId: 'help-requests', data: { route: event.route },
          }),
        });
        const ticket = await response.json();
        if (ticket?.data?.details?.error === 'DeviceNotRegistered') {
          await supabase.from('push_devices').delete().eq('id', device.id);
        } else if (!response.ok || ticket?.data?.status === 'error') failed = true;
      } catch { failed = true; }
    }
    await supabase.from('push_outbox').update(failed
      ? { attempts: event.attempts + 1, last_error: 'delivery_failed' }
      : { processed_at: new Date().toISOString(), attempts: event.attempts + 1, last_error: null }
    ).eq('id', event.id);
    if (!failed) delivered += 1;
  }
  return Response.json({ processed: events?.length ?? 0, delivered });
});
