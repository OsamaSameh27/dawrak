import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthStore } from '../../../features/auth/state/auth-store';
import { PublicFooter } from './public-footer';

describe('PublicFooter', () => {
  let component: PublicFooter;
  let fixture: ComponentFixture<PublicFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicFooter],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: AuthStore,
          useValue: { isAuthenticated: signal(false), role: signal(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
