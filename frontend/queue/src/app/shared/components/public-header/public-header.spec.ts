import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthStore } from '../../../features/auth/state/auth-store';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PublicHeader } from './public-header';

@Component({ selector: 'app-language-switcher', template: '' })
class LanguageSwitcherStub {}

describe('PublicHeader', () => {
  let component: PublicHeader;
  let fixture: ComponentFixture<PublicHeader>;
  const isAuthenticated = signal(false);

  beforeEach(async () => {
    isAuthenticated.set(false);
    await TestBed.configureTestingModule({
      imports: [PublicHeader],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AuthStore, useValue: { isAuthenticated } },
      ],
    })
      .overrideComponent(PublicHeader, {
        remove: { imports: [LanguageSwitcher] },
        add: { imports: [LanguageSwitcherStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PublicHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows only the login action for a guest', () => {
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/dashboard"]')).toBeNull();
  });

  it('updates the action when the session is restored and cleared', () => {
    isAuthenticated.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/dashboard"]')).not.toBeNull();

    isAuthenticated.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/login"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/dashboard"]')).toBeNull();
  });

  it('closes the mobile menu when the dashboard action is clicked', () => {
    isAuthenticated.set(true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.navbar-toggler').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#publicNavigation').classList.contains('show')).toBe(true);

    const action = fixture.debugElement.query(
      (element) => element.nativeElement.matches?.('a[href="/dashboard"]'),
    );
    action.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#publicNavigation').classList.contains('show')).toBe(false);
  });
});
