import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, interval, timeout } from 'rxjs';

import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { NotificationsRealtimeService } from '../../../notifications/services/notifications-realtime.service';
import { CounterShiftHistory, QueueCounter } from '../../models/queue-management.model';
import { QueueManagementServices } from '../../services/queue-management.services';

@Component({
  selector: 'app-queue-monitoring-page',
  imports: [DatePipe, LocalizedTextPipe, TranslatePipe],
  templateUrl: './queue-monitoring-page.html',
  styleUrl: './queue-monitoring-page.scss',
})
export class QueueMonitoringPage {
  private readonly queues = inject(QueueManagementServices);
  private readonly realtime = inject(NotificationsRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly counters = signal<QueueCounter[]>([]);
  protected readonly selectedCounterId = signal<string | null>(null);
  protected readonly shifts = signal<CounterShiftHistory[]>([]);
  protected readonly loading = signal(true);
  protected readonly historyLoading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly historyError = signal(false);
  protected readonly now = signal(Date.now());
  protected readonly expandedShiftId = signal<string | null>(null);

  protected readonly selectedCounter = computed(() =>
    this.counters().find((counter) => counter.id === this.selectedCounterId()) ?? null,
  );
  protected readonly openCount = computed(() =>
    this.counters().filter((counter) => counter.status === 'OPEN').length,
  );
  protected readonly occupiedCount = computed(() =>
    this.counters().filter((counter) => counter.session !== null).length,
  );

  ngOnInit(): void {
    this.loadCounters();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
    this.realtime.countersUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCounters(false));
  }

  protected loadCounters(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
      this.loadError.set(false);
    }
    this.queues.getCounters()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => showLoading && this.loading.set(false)),
      )
      .subscribe({
        next: (counters) => {
          this.counters.set(counters);
          const selectedId = this.selectedCounterId();
          if (selectedId && !counters.some((counter) => counter.id === selectedId)) {
            this.selectedCounterId.set(null);
            this.shifts.set([]);
          }
        },
        error: () => showLoading && this.loadError.set(true),
      });
  }

  protected selectCounter(counter: QueueCounter): void {
    this.selectedCounterId.set(counter.id);
    this.historyLoading.set(true);
    this.historyError.set(false);
    this.queues.getCounterShifts(counter.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.historyLoading.set(false)),
      )
      .subscribe({
        next: (shifts) => this.shifts.set(shifts),
        error: () => this.historyError.set(true),
      });
  }

  protected duration(from: string | null, to?: string | null): string {
    if (!from) return '—';
    const seconds = Math.max(0, Math.floor(((to ? new Date(to).getTime() : this.now()) - new Date(from).getTime()) / 1000));
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${rest}`;
  }

  protected secondsDuration(seconds: number | null): string {
    if (seconds === null) return '—';
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${rest}`;
  }

  protected toggleShift(shiftId: string): void {
    this.expandedShiftId.update((current) => current === shiftId ? null : shiftId);
  }
}
