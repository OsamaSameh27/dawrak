import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  imports: [TranslatePipe],
  selector: 'app-language-switcher',
  styleUrl: './language-switcher.scss',
  templateUrl: './language-switcher.html',
})
export class LanguageSwitcher {
  protected readonly currentLanguage;

  constructor(private readonly languageService: LanguageService) {
    this.currentLanguage = this.languageService.currentLanguage;
  }

  protected toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }
}
