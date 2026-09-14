import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { RegisterRequest } from '../../models/auth.models';
import { AuthServices } from '../../services/auth.services';

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly submitted = signal(false);

  protected readonly isSubmitting = signal(false);
  protected readonly registerErrorKey = signal<string | null>(null);

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
      phone: ['', [Validators.pattern(/^\+?[0-9]{8,15}$/)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(72),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  private readonly authServices = inject(AuthServices);
  private readonly router = inject(Router);

  protected isInvalid(
    controlName: 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword',
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected confirmPasswordInvalid(): boolean {
    const control = this.registerForm.controls.confirmPassword;
    return (
      (control.invalid || this.registerForm.hasError('passwordMismatch')) &&
      (control.touched || this.submitted())
    );
  }

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.submitted.set(true);
    this.registerErrorKey.set(null);

    const controls = this.registerForm.controls;

    this.registerForm.patchValue({
      fullName: controls.fullName.value.trim(),
      email: controls.email.value.trim(),
      phone: controls.phone.value.trim(),
    });

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formValue = this.registerForm.getRawValue();

    const request: RegisterRequest = {
      fullName: formValue.fullName,
      email: formValue.email,
      password: formValue.password,
    };

    if (formValue.phone) {
      request.phone = formValue.phone;
    }

    this.isSubmitting.set(true);

    this.authServices
      .register(request)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (session) => {
          void this.router.navigateByUrl('/login', {
            replaceUrl: true,
          });
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            this.registerErrorKey.set('auth.errors.accountExists');
          } else if (error.status === 429) {
            this.registerErrorKey.set('auth.errors.tooManyAttempts');
          } else {
            this.registerErrorKey.set('auth.errors.registerFailed');
          }
        },
      });
  }
}
