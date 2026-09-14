import { Component, computed, inject, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthServices } from '../../../features/auth/services/auth.services';
import { AuthStore } from '../../../features/auth/state/auth-store';
import { UserRole } from '../../../features/auth/models/auth.models';
import { finalize, timeout } from 'rxjs';

interface DashboardNavigationItem {
  readonly icon: string;
  readonly labelKey: string;
  readonly route: string;
  readonly exact?: boolean;
  readonly roles?: readonly UserRole[];
}

@Component({
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-dashboard-sidebar',
  styleUrl: './dashboard-sidebar.scss',
  templateUrl: './dashboard-sidebar.html',
})
export class DashboardSidebar {
  readonly navigationSelected = output<void>();

  private readonly authServices = inject(AuthServices);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly isLoggingOut = signal(false);
  protected readonly logoutFailed = signal(false);

  protected logout(): void {
    if (this.isLoggingOut()) {
      return;
    }

    this.logoutFailed.set(false);
    this.isLoggingOut.set(true);

    this.authServices
      .logout()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isLoggingOut.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.authStore.clearSession();

          void this.router.navigateByUrl('/login', {
            replaceUrl: true,
          });
        },
        error: () => {
          this.logoutFailed.set(true);
        },
      });
  }

  protected readonly primaryItems: readonly DashboardNavigationItem[] = [

    {
      icon: 'bi-grid-1x2',
      labelKey: 'dashboard.navigation.overview',
      route: '/dashboard',
      exact: true,
    },
    {
      icon: 'bi-people',
      labelKey: 'dashboard.navigation.queue',
      route: '/dashboard/queue',
      roles: ['STAFF', 'MANAGER', 'ADMIN'],
    },
    {
      icon: 'bi-ticket-perforated',
      labelKey: 'dashboard.navigation.myTickets',
      route: '/dashboard/my-tickets',
      roles: ['CUSTOMER'],
    },
    {
      icon: 'bi-bell',
      labelKey: 'dashboard.navigation.notifications',
      route: '/dashboard/notifications',
    },
  ];

  protected readonly managementItems: readonly DashboardNavigationItem[] = [
    {
      icon: 'bi-building',
      labelKey: 'dashboard.navigation.branches',
      route: '/dashboard/branches',
      roles: ['MANAGER', 'ADMIN'],
    },
    {
      icon: 'bi-ui-checks-grid',
      labelKey: 'dashboard.navigation.services',
      route: '/dashboard/services',
      roles: ['MANAGER', 'ADMIN'],
    },
    {
      icon: 'bi-window-stack',
      labelKey: 'dashboard.navigation.counters',
      route: '/dashboard/counters',
      roles: ['STAFF', 'MANAGER', 'ADMIN'],
    },
    {
      icon: 'bi-person-badge',
      labelKey: 'dashboard.navigation.staff',
      route: '/dashboard/staff',
      roles: ['MANAGER', 'ADMIN'],
    },
    {
      icon: 'bi-bar-chart',
      labelKey: 'dashboard.navigation.reports',
      route: '/dashboard/reports',
      roles: ['MANAGER', 'ADMIN'],
    },
  ];

  private filterItems(
    items: readonly DashboardNavigationItem[],
  ): readonly DashboardNavigationItem[] {
    const role = this.authStore.role();

    if (!this.authStore.isAuthenticated() || role === null) {
      return [];
    }

    return items.filter(
      (item) => item.roles === undefined || item.roles.includes(role),
    );
  }

  protected readonly visiblePrimaryItems = computed(() =>
    this.filterItems(this.primaryItems),
  );

  protected readonly visibleManagementItems = computed(() =>
    this.filterItems(this.managementItems),
  );
}
