import { Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../features/auth/state/auth-store';

import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { NotificationMenu } from '../notification-menu/notification-menu';

@Component({
  imports: [LanguageSwitcher, NotificationMenu, RouterLink, TranslatePipe],
  selector: 'app-dashboard-header',
  styleUrl: './dashboard-header.scss',
  templateUrl: './dashboard-header.html',
})
export class DashboardHeader {
  readonly menuToggle = output<void>();

  private readonly authStore = inject(AuthStore);
  protected readonly user = this.authStore.user;
  protected readonly roleKey = computed(() => {
    const role = this.authStore.role();
    return role ? `dashboard.header.roles.${role.toLowerCase()}` : '';
  });

}
