import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearPublicDemoProgress, readPublicDemoProgress, recordPublicDemoCompletion } from './progress';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('progresso local da demonstração pública', () => {
  beforeEach(async () => AsyncStorage.clear());

  it('registra cada missão uma única vez sem servidor', async () => {
    await recordPublicDemoCompletion('shopping');
    await recordPublicDemoCompletion('shopping');
    await recordPublicDemoCompletion('pix');
    expect((await readPublicDemoProgress()).completedMissionKeys).toEqual(['shopping', 'pix']);
  });

  it('permite limpar apenas o progresso deste aparelho', async () => {
    await recordPublicDemoCompletion('photo');
    await clearPublicDemoProgress();
    expect(await readPublicDemoProgress()).toEqual({ completedMissionKeys: [], updatedAt: null });
  });
});
