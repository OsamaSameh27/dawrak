import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter, merge, startWith } from 'rxjs';

const SITE_URL = 'https://daw-rak.vercel.app';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    merge(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
      this.translate.onLangChange,
    )
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateMetadata());
  }

  private updateMetadata(): void {
    const routeMetadata = this.readRouteMetadata(this.router.routerState.snapshot.root);
    const seoKey = routeMetadata.seoKey ?? 'home';
    const title = this.translate.instant(`seo.pages.${seoKey}.title`);
    const description = this.translate.instant(`seo.pages.${seoKey}.description`);
    const language = this.translate.currentLang() === 'en' ? 'en' : 'ar';
    const canonicalUrl = this.canonicalUrl();

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: routeMetadata.noIndex ? 'noindex, nofollow' : 'index, follow',
    });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:locale', content: language === 'ar' ? 'ar_EG' : 'en_US' });
    this.meta.updateTag({ property: 'og:site_name', content: this.translate.instant('app.name') });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    this.updateCanonical(canonicalUrl);
    this.updateStructuredData(language);
  }

  private readRouteMetadata(root: ActivatedRouteSnapshot): {
    seoKey?: string;
    noIndex: boolean;
  } {
    let current: ActivatedRouteSnapshot | null = root;
    let seoKey: string | undefined;
    let noIndex = false;

    while (current) {
      if (typeof current.data['seoKey'] === 'string') seoKey = current.data['seoKey'];
      if (current.data['noIndex'] === true) noIndex = true;
      current = current.firstChild;
    }

    return { seoKey, noIndex };
  }

  private canonicalUrl(): string {
    const path = this.router.url.split(/[?#]/, 1)[0] || '/';
    return new URL(path, `${SITE_URL}/`).toString();
  }

  private updateCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private updateStructuredData(language: 'ar' | 'en'): void {
    const script = this.document.getElementById('website-structured-data');
    if (!script) return;

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: this.translate.instant('app.name'),
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: language,
      description: this.translate.instant('seo.pages.home.description'),
    });
  }
}
