import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type AppLanguage = 'ar' | 'en';
export type AppDirection = 'rtl' | 'ltr';

const DEFAULT_LANGUAGE: AppLanguage = 'ar';
const LANGUAGE_STORAGE_KEY = 'queue-language';
const BOOTSTRAP_STYLESHEET_ID = 'bootstrap-direction-stylesheet';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly currentLanguageSignal = signal<AppLanguage>(DEFAULT_LANGUAGE);

  readonly currentLanguage = this.currentLanguageSignal.asReadonly();
  readonly direction = computed<AppDirection>(() =>
    this.currentLanguageSignal() === 'ar' ? 'rtl' : 'ltr',
  );

  async initialize(): Promise<void> {
    await this.applyLanguage(this.getSavedLanguage());
  }

  async setLanguage(language: AppLanguage): Promise<void> {
    await this.applyLanguage(language);
  }

  toggleLanguage(): void {
    const nextLanguage: AppLanguage = this.currentLanguageSignal() === 'ar' ? 'en' : 'ar';
    void this.setLanguage(nextLanguage);
  }

  private async applyLanguage(language: AppLanguage): Promise<void> {
    const direction: AppDirection = language === 'ar' ? 'rtl' : 'ltr';

    this.currentLanguageSignal.set(language);
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = direction;
    this.updateBootstrapDirection(language);

    await firstValueFrom(this.translate.use(language));

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }

  private getSavedLanguage(): AppLanguage {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LANGUAGE;
    }

    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage === 'en' || savedLanguage === 'ar' ? savedLanguage : DEFAULT_LANGUAGE;
  }

  private updateBootstrapDirection(language: AppLanguage): void {
    const stylesheet = this.document.getElementById(
      BOOTSTRAP_STYLESHEET_ID,
    ) as HTMLLinkElement | null;

    if (!stylesheet) {
      return;
    }

    const bootstrapFile = language === 'ar' ? 'bootstrap.rtl.min.css' : 'bootstrap.min.css';

    stylesheet.href = `assets/bootstrap/${bootstrapFile}`;
  }
}
