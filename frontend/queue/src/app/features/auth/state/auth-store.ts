import { computed, Service, signal } from '@angular/core';

import { AuthSession, AuthUser } from '../models/auth.models';

@Service()
export class AuthStore {
  private readonly accessTokenState = signal<string | null>(null);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly initializedState = signal(false);

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.accessTokenState() !== null && this.userState() !== null,
  );

  readonly role = computed(() => this.userState()?.role ?? null);

  setSession(session: AuthSession): void {
    this.accessTokenState.set(session.accessToken);
    this.userState.set(session.user);
    this.initializedState.set(true);
  }

  clearSession(): void {
    this.accessTokenState.set(null);
    this.userState.set(null);
    this.initializedState.set(true);
  }
}
