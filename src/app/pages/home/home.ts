import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Task, TaskLogEntry, TaskStatus, TASK_STATUSES, TASK_STATUS_LABELS } from '../../models/task';
import { TaskDbService } from '../../services/task-db.service';
import { localDateString } from '../../utils/date';

/** How often the live "today" signal checks whether the local date changed. */
const TODAY_REFRESH_MS = 60_000;

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  private readonly db = inject(TaskDbService);

  protected readonly tasks = this.db.tasks;
  protected readonly statuses = TASK_STATUSES;
  protected readonly statusLabels = TASK_STATUS_LABELS;

  /** Title typed in the creation row. */
  protected readonly newTitle = signal('');

  /** Id of the task whose change history is open, or null. */
  protected readonly openLogTaskId = signal<string | null>(null);

  /**
   * Local date of today as `YYYY-MM-DD`. Refreshed live so time-dependent
   * computations (e.g. overdue detection) re-evaluate without a reload.
   */
  protected readonly today = signal(localDateString());

  /** Handle for the interval that keeps `today` fresh; cleared on destroy. */
  private todayIntervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.db.load();

    this.todayIntervalId = setInterval(() => {
      const current = localDateString();
      if (current !== this.today()) {
        this.today.set(current);
      }
    }, TODAY_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.todayIntervalId !== null) {
      clearInterval(this.todayIntervalId);
      this.todayIntervalId = null;
    }
  }

  protected createTask(): void {
    const title = this.newTitle().trim();
    if (!title) {
      return;
    }

    void this.db.create(title);
    this.newTitle.set('');
  }

  protected updateTitle(task: Task, title: string): void {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      return;
    }

    void this.db.update(task.id, { title: trimmed });
  }

  protected updateStatus(task: Task, status: TaskStatus): void {
    if (status === task.status) {
      return;
    }

    void this.db.update(task.id, { status });
  }

  protected removeTask(task: Task): void {
    void this.db.remove(task.id);
  }

  protected toggleLog(task: Task): void {
    this.openLogTaskId.update((current) => (current === task.id ? null : task.id));
  }

  protected closeLog(): void {
    this.openLogTaskId.set(null);
  }

  protected logEntriesNewestFirst(task: Task): TaskLogEntry[] {
    return [...(task.log ?? [])].reverse();
  }

  protected formatLogTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected formatCreatedAt(iso: string): string {
    return new Date(iso).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  /** Format a date-only (YYYY-MM-DD) end date as local date, avoiding UTC shift. */
  protected formatEndDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  protected statusClass(status: TaskStatus): string {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }
}
