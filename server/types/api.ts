import type { PublicTask, PublicSettings, PartialSettings } from './db';

export interface CreateTaskBody {
  name: unknown;
  time_estimate: unknown;
}

export interface UpdateTaskBody {
  name?: unknown;
  time_estimate?: unknown;
  is_complete?: unknown;
}

export interface ReorderTasksBody {
  ordered_ids: unknown;
}

export interface TasksResponse {
  tasks: PublicTask[];
}

export interface TaskResponse {
  task: PublicTask;
}

export type SettingsResponse = { settings: PublicSettings };
export type PatchSettingsBody = PartialSettings;
