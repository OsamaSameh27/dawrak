import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../language-switcher/language-switcher';

@Component({
  imports: [LanguageSwitcher, RouterLink, RouterLinkActive, TranslatePipe],
  selector: 'app-public-header',
  styleUrl: './public-header.scss',
  templateUrl: './public-header.html',
})
export class PublicHeader {
  protected readonly isMenuOpen = signal(false);

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
