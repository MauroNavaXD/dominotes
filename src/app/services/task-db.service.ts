import { Injectable, signal } from '@angular/core';
import { Task, TaskLogEntry, TaskStatus, TASK_STATUS_LABELS } from '../models/task';
import { localDateString } from '../utils/date';

const DB_NAME = 'dominotes';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

/** Prioridad de presentación por estado: menor = primero. */
const STATUS_RANK: Record<TaskStatus, number> = {
  'in-progress': 0,
  'pending': 1,
  'done': 2,
};

/**
 * Local-first task storage backed by IndexedDB.
 * Keeps an in-memory signal mirror so the UI stays reactive.
 */
@Injectable({ providedIn: 'root' })
export class TaskDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /** Reactive list of tasks, newest first. */
  readonly tasks = signal<Task[]>([]);

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDb();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  /** Load all tasks from IndexedDB into the signal. */
  async load(): Promise<void> {
    const store = await this.tx('readonly');
    const tasks = await new Promise<Task[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as Task[]);
      request.onerror = () => reject(request.error);
    });

    this.tasks.set(this.sort(tasks));
  }

  /** Create a new task. Creation date is set automatically. */
  async create(title: string): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      endDate: null,
      dueDate: null,
      log: [this.logEntry('Tarea creada')],
    };

    const store = await this.tx('readwrite');
    await this.request(store.add(task));

    this.tasks.update((list) => this.sort([task, ...list]));
    return task;
  }

  /** Update one or more editable fields of a task. */
  async update(
    id: string,
    changes: Partial<Pick<Task, 'title' | 'status' | 'endDate' | 'dueDate'>>,
  ): Promise<void> {
    const current = this.tasks().find((task) => task.id === id);
    if (!current) {
      return;
    }

    const entries: TaskLogEntry[] = [];
    const effective: Partial<Pick<Task, 'title' | 'status' | 'endDate' | 'dueDate'>> = { ...changes };

    // Title change.
    if (changes.title !== undefined && changes.title !== current.title) {
      entries.push(this.logEntry(`Título cambiado a "${changes.title}"`));
    }

    // Status change.
    if (changes.status !== undefined && changes.status !== current.status) {
      entries.push(this.logEntry(`Estado cambiado a ${TASK_STATUS_LABELS[changes.status]}`));
    }

    if (changes.status !== undefined) {
      // Automatic endDate side effect driven by the status.
      if (changes.status === 'done' && !('endDate' in changes)) {
        effective.endDate = localDateString(new Date());
        entries.push(this.logEntry(`Fecha fin establecida automáticamente a ${effective.endDate}`));
      } else if (changes.status !== 'done' && current.endDate !== null) {
        effective.endDate = null;
        entries.push(this.logEntry('Fecha fin limpiada automáticamente'));
      }
    } else if ('endDate' in changes && changes.endDate !== current.endDate) {
      // Manual endDate change (no status change drove it).
      entries.push(
        this.logEntry(
          changes.endDate ? `Fecha fin cambiada a ${changes.endDate}` : 'Fecha fin eliminada',
        ),
      );
    }

    // dueDate change, independent of the status/endDate logic above:
    // changing dueDate never triggers nor cancels the status-driven endDate effects.
    if (changes.dueDate !== undefined && changes.dueDate !== current.dueDate) {
      entries.push(
        this.logEntry(
          changes.dueDate
            ? `Fecha de vencimiento establecida a ${changes.dueDate}`
            : 'Fecha de vencimiento eliminada',
        ),
      );
    }

    const updated: Task = {
      ...current,
      ...effective,
      log: [...(current.log ?? []), ...entries],
    };
    const store = await this.tx('readwrite');
    await this.request(store.put(updated));

    this.tasks.update((list) => this.sort(list.map((task) => (task.id === id ? updated : task))));
  }

  /** Delete a task. */
  async remove(id: string): Promise<void> {
    const store = await this.tx('readwrite');
    await this.request(store.delete(id));

    this.tasks.update((list) => list.filter((task) => task.id !== id));
  }

  /** Build a log entry stamped with the current time. */
  private logEntry(message: string): TaskLogEntry {
    return { timestamp: new Date().toISOString(), message };
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Presentation-only ordering: primary by status priority
   * (in-progress → pending → done), secondary by createdAt descending for a
   * stable order within each group. Returns a new array and never mutates or
   * re-persists the Task objects.
   */
  private sort(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }
}
