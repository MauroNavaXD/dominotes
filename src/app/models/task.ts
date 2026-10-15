export type TaskStatus = 'pending' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** Creation date, set automatically on creation. ISO string. */
  createdAt: string;
  /** End date, editable by the user. ISO string (date only) or null. */
  endDate: string | null;
}

export const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in-progress', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'pending': 'Pendiente',
  'in-progress': 'En progreso',
  'done': 'Completada',
};
