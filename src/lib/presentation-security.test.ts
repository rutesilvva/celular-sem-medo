import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('presentation mode isolation', () => {
  const demo = readFileSync(resolve(process.cwd(), 'app/demo.tsx'), 'utf8');
  const dynamicRoute = readFileSync(resolve(process.cwd(), 'app/dynamic-mission.tsx'), 'utf8');
  const dynamicFeature = ['loader.ts', 'renderer.tsx', 'runtime.ts'].map((file) => readFileSync(resolve(process.cwd(), 'src/features/dynamic-missions', file), 'utf8')).join('\n');
  it('does not create authenticated accounts or assign roles', () => {
    expect(`${demo}\n${dynamicRoute}`).not.toMatch(/acceptAuthenticatedAccount|selectSessionRole|sessionRole|role\s*:/);
  });
  it('does not write demonstration data to Supabase', () => {
    expect(dynamicFeature).not.toMatch(/getSupabase|from ['"]@supabase|supabase\.from\(|\.rpc\(|functions\.invoke/);
  });
  it('keeps the public route on local fixture identifiers only', () => {
    expect(dynamicRoute).toContain('loadLocalMission');
    expect(dynamicRoute).not.toMatch(/JSON\.parse|fetch\(|https?:\/\//);
  });
});
