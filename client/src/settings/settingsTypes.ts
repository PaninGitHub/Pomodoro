// Shared settings shape — mirrors server PublicSettings (Batch D §12.4).

export interface Settings {
  work_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  long_break_frequency: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  freestyle_ratio: number;
  freestyle_accumulate: boolean;
  alarm_sound: string;
  alarm_volume: number;
  alarm_repeats: number;
  alarm_custom_url: string | null;
  browser_notifications: boolean;
  reflection_enabled: boolean;
  music_autoplay: boolean;
  music_volume: number;
  last_sound_selected: string;
  break_activity_limit: number;
  theme: string;
  font: string;
  hour_format: string;
  timer_adjust_step_minutes: number;
  freestyle_breaks_enabled: boolean;
}

export type PartialSettings = Partial<Settings>;

// TODO(phase-2): keep in sync with migration 007 defaults.
export const DEFAULT_SETTINGS: Settings = {
  work_duration: 25,
  short_break_duration: 5,
  long_break_duration: 20,
  long_break_frequency: 4,
  auto_start_breaks: false,
  auto_start_pomodoros: false,
  freestyle_ratio: 5,
  freestyle_accumulate: true,
  alarm_sound: 'bell',
  alarm_volume: 80,
  alarm_repeats: 1,
  alarm_custom_url: null,
  browser_notifications: false,
  reflection_enabled: true,
  music_autoplay: false,
  music_volume: 50,
  last_sound_selected: 'S1',
  break_activity_limit: 10,
  theme: 'bw-dark',
  font: 'Inter',
  hour_format: '12h',
  timer_adjust_step_minutes: 5,
  freestyle_breaks_enabled: true,
};
