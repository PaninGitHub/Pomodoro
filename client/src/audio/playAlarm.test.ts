import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playAlarm, resolveAudioUrl } from './playAlarm';

describe('resolveAudioUrl', () => {
  it('returns dev-audio path when env base is not set', () => {
    expect(resolveAudioUrl('bell.mp3', undefined)).toBe('/dev-audio/bell.mp3');
  });

  it('returns prefixed URL when env base is set', () => {
    expect(resolveAudioUrl('bell.mp3', 'https://r2.example.com')).toBe('https://r2.example.com/bell.mp3');
  });

  it('strips trailing slash on env base', () => {
    expect(resolveAudioUrl('bell.mp3', 'https://r2.example.com/')).toBe('https://r2.example.com/bell.mp3');
  });
});

describe('playAlarm', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an Audio element with the resolved URL and plays it', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      src = '';
      volume = 1;
      play = playMock;
      addEventListener = vi.fn((evt: string, cb: () => void) => { if (evt === 'ended') setTimeout(cb, 0); });
      pause = vi.fn();
      load = vi.fn();
      constructor(src?: string) { if (src) this.src = src; }
    }
    vi.stubGlobal('Audio', MockAudio);

    await playAlarm({ volume: 50, repeats: 1, baseUrl: undefined });
    expect(playMock).toHaveBeenCalled();
  });

  it('respects volume (0-100 mapped to 0-1)', async () => {
    let capturedVol = -1;
    class MockAudio {
      src = '';
      _volume = 1;
      get volume() { return this._volume; }
      set volume(v: number) { this._volume = v; capturedVol = v; }
      play = vi.fn().mockResolvedValue(undefined);
      addEventListener = vi.fn((evt: string, cb: () => void) => { if (evt === 'ended') setTimeout(cb, 0); });
      pause = vi.fn();
      load = vi.fn();
    }
    vi.stubGlobal('Audio', MockAudio);

    await playAlarm({ volume: 80, repeats: 1, baseUrl: undefined });
    expect(capturedVol).toBeCloseTo(0.8);
  });

  it('repeats the configured number of times', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    class MockAudio {
      src = '';
      volume = 1;
      play = playMock;
      addEventListener = vi.fn((evt: string, cb: () => void) => { if (evt === 'ended') setTimeout(cb, 0); });
      pause = vi.fn();
      load = vi.fn();
    }
    vi.stubGlobal('Audio', MockAudio);

    await playAlarm({ volume: 50, repeats: 3, baseUrl: undefined });
    expect(playMock).toHaveBeenCalledTimes(3);
  });
});
