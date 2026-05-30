// Types mirror the DB schema exactly. Update on every migration.

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: Date;
  last_login_at: Date | null;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'display_name' | 'avatar_url'>;

export interface Task {
  id: string;
  user_id: string;
  name: string;
  time_estimate: number;
  is_complete: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export type PublicTask = Pick<Task, 'id' | 'name' | 'time_estimate' | 'is_complete' | 'sort_order'>;

export interface Settings {
  id: string;
  user_id: string;
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
  show_avatar: boolean;
  freestyle_target_minutes: number;
  updated_at: Date;
}

export type PublicSettings = Omit<Settings, 'id' | 'user_id' | 'updated_at'>;
export type PartialSettings = Partial<PublicSettings>;

export type TimerSessionMode = 'timer' | 'pomodoro' | 'freestyle';

export interface TimerSession {
  id: string;
  user_id: string;
  mode: TimerSessionMode;
  started_at: Date;
  ended_at: Date | null;
  ended_early: boolean;
  total_work_mins: number | null;
  periods_completed: number;
  is_interrupted: boolean;
  interrupted_at: Date | null;
}

export type PublicSession = Pick<
  TimerSession,
  'id' | 'mode' | 'started_at' | 'ended_at' | 'ended_early' | 'total_work_mins' | 'periods_completed'
>;
