import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../../features/auth/state/auth-store';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-public-footer',
  styleUrl: './public-footer.scss',
  templateUrl: './public-footer.html',
})
export class PublicFooter {
  private readonly authStore = inject(AuthStore);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly showCustomerNavigation = computed(
    () => !this.authStore.isAuthenticated() || this.authStore.role() === 'CUSTOMER',
  );
}
