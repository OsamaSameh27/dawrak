import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcher } from './language-switcher';
import { provideTranslateService } from '@ngx-translate/core';

describe('LanguageSwitcher', () => {
  let component: LanguageSwitcher;
  let fixture: ComponentFixture<LanguageSwitcher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcher);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
