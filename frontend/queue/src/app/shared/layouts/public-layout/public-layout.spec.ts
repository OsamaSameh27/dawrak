import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicLayout } from './public-layout';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthStore } from '../../../features/auth/state/auth-store';

describe('PublicLayout', () => {
  let component: PublicLayout;
  let fixture: ComponentFixture<PublicLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: AuthStore,
          useValue: { isAuthenticated: signal(false), role: signal(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
