export type TaskStatus = 'pending' | 'in-progress' | 'done';

/** A single change-history entry for a task. */
export interface TaskLogEntry {
  /** Moment the change was recorded. ISO string. */
  timestamp: string;
  /** Human-readable description of the change (Spanish). */
  message: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** Creation date, set automatically on creation. ISO string. */
  createdAt: string;
  /** End date, editable by the user. ISO string (date only) or null. */
  endDate: string | null;
  /** Fecha de vencimiento ingresada manualmente. ISO date-only (YYYY-MM-DD) o null. */
  dueDate: string | null;
  /** Chronological change history (oldest first). */
  log: TaskLogEntry[];
}

export const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in-progress', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'pending': 'Pendiente',
  'in-progress': 'En progreso',
  'done': 'Completada',
};
