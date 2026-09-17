import { inject, Pipe, PipeTransform } from '@angular/core';

import { LanguageService } from '../../core/i18n/language.service';

@Pipe({
  name: 'localizedText',
  pure: false,
})
export class LocalizedTextPipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(
    arabicValue: string | null | undefined,
    englishValue: string | null | undefined,
  ): string {
    return this.languageService.currentLanguage() === 'ar'
      ? (arabicValue ?? englishValue ?? '')
      : (englishValue ?? arabicValue ?? '');
  }
}
