// Alarm pipeline.
//
// PHASE 1 / DEV: loads /dev-audio/bell.mp3 (committed in client/public/dev-audio/).
// PHASE 7+ / PROD: VITE_AUDIO_BASE_URL points at the Cloudflare R2 public URL.
// dev-audio/ folder is deleted in Phase 7 per Batch E §14.3 dev-only exception.

import { fireNotification } from '../utils/notification';

export interface PlayAlarmOptions {
  volume: number;   // 0-100 (matches F-30 settings shape)
  repeats: number;  // 1-5
  baseUrl?: string; // override for tests; defaults to import.meta.env.VITE_AUDIO_BASE_URL
  fireNotification?: boolean; // if true, also fire a browser notification (Phase 2)
}

export function resolveAudioUrl(filename: string, baseUrl: string | undefined): string {
  if (!baseUrl) return `/dev-audio/${filename}`;
  return `${baseUrl.replace(/\/$/, '')}/${filename}`;
}

export async function playAlarm(opts: PlayAlarmOptions): Promise<void> {
  // TODO(phase-2): currently always plays bell.wav.
  // Phase 2 Settings will pass alarm_sound key; map to filename here.
  // TODO(phase-7): swap to .mp3 when Cloudflare R2 hosts real audio assets.
  const filename = 'bell.wav';
  const baseUrl = opts.baseUrl ?? (import.meta.env.VITE_AUDIO_BASE_URL as string | undefined);
  const url = resolveAudioUrl(filename, baseUrl);
  const volume = Math.max(0, Math.min(1, opts.volume / 100));

  // Browser notification (3rd channel per F-06). Fired once per alarm, not per repeat.
  if (opts.fireNotification) {
    fireNotification('Simplidoro', 'Period complete.');
  }

  for (let i = 0; i < opts.repeats; i++) {
    await new Promise<void>((resolve) => {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });
      void audio.play().catch(() => resolve());
    });
  }
}
