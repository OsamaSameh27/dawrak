import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { AuthStore } from '../../../features/auth/state/auth-store';
import { NotificationMenu } from '../notification-menu/notification-menu';

@Component({
  imports: [LanguageSwitcher, NotificationMenu, RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-public-header',
  styleUrl: './public-header.scss',
  templateUrl: './public-header.html',
})
export class PublicHeader {
  protected readonly authStore = inject(AuthStore);
  protected readonly isMenuOpen = signal(false);
  protected readonly showCustomerNavigation = computed(
    () => !this.authStore.isAuthenticated() || this.authStore.role() === 'CUSTOMER',
  );

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
