import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, interval, timeout } from 'rxjs';

import { QueueStatusCard } from '../../components/queue-status-card/queue-status-card';
import { HomeQueueOverview, QueueStatusViewModel } from '../../models/queue-status.model';
import { AuthStore } from '../../../auth/state/auth-store';
import { TicketsServices } from '../../../tickets/services/tickets.services';

@Component({
  selector: 'app-home-page',
  imports: [QueueStatusCard, RouterLink, TranslatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly ticketsApi = inject(TicketsServices);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly queueOverview = signal<HomeQueueOverview[]>([]);
  protected readonly queuesLoading = signal(true);
  protected readonly queuesFailed = signal(false);
  protected readonly canUseCustomerFeatures = computed(
    () => !this.auth.isAuthenticated() || this.auth.role() === 'CUSTOMER',
  );
  protected readonly workforceRole = computed(() => {
    const role = this.auth.role();
    return role === 'ADMIN' ? 'admin' : role === 'MANAGER' ? 'manager' : 'staff';
  });
  protected readonly queues = computed<readonly QueueStatusViewModel[]>(() =>
    this.queueOverview().map((item) => ({
      id: item.id,
      serviceNameAr: item.nameAr,
      serviceNameEn: item.nameEn,
      branchNameAr: item.branch.nameAr,
      branchNameEn: item.branch.nameEn,
      waitingCount: item.waitingCount,
      estimatedMinutes: item.estimatedMinutes,
      status: item.openCounters === 0 ? 'closed' : item.waitingCount >= 10 ? 'busy' : 'available',
      icon: 'bi-buildings',
    })),
  );

  ngOnInit(): void {
    this.loadOverview();
    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadOverview(false);
      });
  }

  protected loadOverview(showLoading = true): void {
    if (showLoading) {
      this.queuesLoading.set(true);
      this.queuesFailed.set(false);
    }
    this.ticketsApi
      .getHomeOverview()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => showLoading && this.queuesLoading.set(false)),
      )
      .subscribe({
        next: (value) => this.queueOverview.set(value),
        error: () => showLoading && this.queuesFailed.set(true),
      });
  }
}
