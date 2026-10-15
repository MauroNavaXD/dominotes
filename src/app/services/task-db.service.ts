import { Injectable, signal } from '@angular/core';
import { Task } from '../models/task';

const DB_NAME = 'dominotes';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

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
    };

    const store = await this.tx('readwrite');
    await this.request(store.add(task));

    this.tasks.update((list) => this.sort([task, ...list]));
    return task;
  }

  /** Update one or more editable fields of a task. */
  async update(id: string, changes: Partial<Pick<Task, 'title' | 'status' | 'endDate'>>): Promise<void> {
    const current = this.tasks().find((task) => task.id === id);
    if (!current) {
      return;
    }

    const updated: Task = { ...current, ...changes };
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

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private sort(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
