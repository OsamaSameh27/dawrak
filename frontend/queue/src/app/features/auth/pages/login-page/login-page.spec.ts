import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthSession, UserRole } from '../../models/auth.models';
import { AuthServices } from '../../services/auth.services';
import { AuthStore } from '../../state/auth-store';
import { LoginPage } from './login-page';

describe('Login return destination', () => {
  it.each([
    ['/my-tickets', 'CUSTOMER', '/my-tickets'],
    ['/my-tickets?publicId=old-link', 'CUSTOMER', '/my-tickets'],
    ['/my-tickets', 'ADMIN', '/dashboard'],
    ['https://example.com', 'CUSTOMER', '/dashboard'],
    [null, 'CUSTOMER', '/dashboard'],
  ])('handles returnUrl %s for %s', async (returnUrl, role, destination) => {
    const session: AuthSession = {
      accessToken: 'test-only',
      user: { id: 'user', email: 'test@example.com', fullName: 'Test', phone: null, role: role as UserRole, branchId: null, isActive: true, createdAt: '', updatedAt: '' },
    };
    const setSession = vi.fn();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]), provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } } },
        { provide: AuthServices, useValue: { login: () => of(session) } },
        { provide: AuthStore, useValue: { setSession } },
      ],
    }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    for (const [name, value] of [['email', 'test@example.com'], ['password', 'TestPassword123!']]) {
      const input = fixture.nativeElement.querySelector(`[formControlName="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(setSession).toHaveBeenCalledWith(session);
    expect(navigate).toHaveBeenCalledWith(destination);
  });
});
