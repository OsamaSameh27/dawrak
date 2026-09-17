import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { AuthStore } from '../../../auth/state/auth-store';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { ManagedBranch } from '../../models/branch.model';
import { BranchesServices } from '../../services/branches.services';

const coordinatePairValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const latitude = control.get('latitude')?.value;
  const longitude = control.get('longitude')?.value;
  const hasLatitude = latitude !== '' && latitude !== null && latitude !== undefined;
  const hasLongitude = longitude !== '' && longitude !== null && longitude !== undefined;
  return hasLatitude === hasLongitude ? null : { coordinatePair: true };
};

@Component({
  imports: [LocalizedTextPipe, ReactiveFormsModule, TranslatePipe],
  selector: 'app-branches-page',
  styleUrl: './branches-page.scss',
  templateUrl: './branches-page.html',
})
export class BranchesPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly branchesServices = inject(BranchesServices);
  private readonly authStore = inject(AuthStore);

  protected readonly branches = signal<ManagedBranch[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal(false);
  protected readonly formErrorKey = signal<string | null>(null);
  protected readonly successKey = signal<string | null>(null);
  protected readonly dialogMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingBranch = signal<ManagedBranch | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  protected readonly submitted = signal(false);

  protected readonly isAdmin = computed(() => this.authStore.role() === 'ADMIN');
  protected readonly activeCount = computed(
    () => this.branches().filter((branch) => branch.isActive).length,
  );
  protected readonly servicesCount = computed(() =>
    this.branches().reduce((total, branch) => total + branch._count.services, 0),
  );
  protected readonly filteredBranches = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    return this.branches().filter((branch) => {
      const matchesStatus =
        status === 'ALL' ||
        (status === 'ACTIVE' ? branch.isActive : !branch.isActive);
      const matchesSearch =
        !search ||
        branch.nameAr.toLocaleLowerCase().includes(search) ||
        branch.nameEn.toLocaleLowerCase().includes(search) ||
        branch.code.toLocaleLowerCase().includes(search) ||
        (branch.addressAr?.toLocaleLowerCase().includes(search) ?? false) ||
        (branch.addressEn?.toLocaleLowerCase().includes(search) ?? false);
      return matchesStatus && matchesSearch;
    });
  });

  protected readonly createForm = this.formBuilder.nonNullable.group(
    {
      nameAr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      nameEn: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_-]{2,12}$/)]],
      addressAr: ['', Validators.maxLength(250)],
      addressEn: ['', Validators.maxLength(250)],
      latitude: ['', [Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.min(-180), Validators.max(180)]],
      timezone: ['Africa/Cairo', Validators.required],
    },
    { validators: coordinatePairValidator },
  );

  protected readonly editForm = this.formBuilder.nonNullable.group(
    {
      nameAr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      nameEn: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      addressAr: ['', Validators.maxLength(250)],
      addressEn: ['', Validators.maxLength(250)],
      latitude: ['', [Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.min(-180), Validators.max(180)]],
      timezone: ['Africa/Cairo', Validators.required],
      isActive: [true],
    },
    { validators: coordinatePairValidator },
  );

  ngOnInit(): void {
    this.loadBranches();
  }

  protected loadBranches(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.branchesServices
      .getManagedBranches()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (branches) => this.branches.set(branches),
        error: () => this.loadError.set(true),
      });
  }

  protected openCreate(): void {
    this.createForm.reset({
      nameAr: '', nameEn: '', code: '', addressAr: '', addressEn: '',
      latitude: '', longitude: '', timezone: 'Africa/Cairo',
    });
    this.resetDialog();
    this.dialogMode.set('create');
  }

  protected openEdit(branch: ManagedBranch): void {
    this.editingBranch.set(branch);
    this.editForm.reset({
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      addressAr: branch.addressAr ?? '',
      addressEn: branch.addressEn ?? '',
      latitude: branch.latitude === null ? '' : String(branch.latitude),
      longitude: branch.longitude === null ? '' : String(branch.longitude),
      timezone: branch.timezone,
      isActive: branch.isActive,
    });
    this.resetDialog();
    this.dialogMode.set('edit');
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialogMode.set(null);
    this.editingBranch.set(null);
    this.formErrorKey.set(null);
  }

  protected submitCreate(): void {
    if (this.saving()) return;
    this.submitted.set(true);
    this.formErrorKey.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    const latitude = this.optionalCoordinate(value.latitude);
    const longitude = this.optionalCoordinate(value.longitude);
    this.saving.set(true);
    this.branchesServices
      .createBranch({
        nameAr: value.nameAr.trim(), nameEn: value.nameEn.trim(),
        code: value.code.trim().toUpperCase(),
        addressAr: value.addressAr.trim() || undefined,
        addressEn: value.addressEn.trim() || undefined,
        latitude: latitude ?? undefined, longitude: longitude ?? undefined,
        timezone: value.timezone.trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.successKey.set('branchManagement.messages.created');
          this.loadBranches();
        },
        error: (error: unknown) => this.handleFormError(error),
      });
  }

  protected submitEdit(): void {
    const branch = this.editingBranch();
    if (!branch || this.saving()) return;
    this.submitted.set(true);
    this.formErrorKey.set(null);
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.saving.set(true);
    this.branchesServices
      .updateBranch(branch.id, {
        nameAr: value.nameAr.trim(), nameEn: value.nameEn.trim(),
        addressAr: value.addressAr.trim(), addressEn: value.addressEn.trim(),
        latitude: this.optionalCoordinate(value.latitude),
        longitude: this.optionalCoordinate(value.longitude),
        timezone: value.timezone.trim(), isActive: value.isActive,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.dialogMode.set(null);
          this.editingBranch.set(null);
          this.successKey.set('branchManagement.messages.updated');
          this.loadBranches();
        },
        error: (error: unknown) => this.handleFormError(error),
      });
  }

  protected setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'ALL' | 'ACTIVE' | 'INACTIVE');
  }

  protected normalizeCode(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.createForm.controls.code.setValue(value);
  }

  protected controlInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected coordinatesInvalid(form: AbstractControl): boolean {
    return form.hasError('coordinatePair') && this.submitted();
  }

  protected mapUrl(branch: ManagedBranch): string {
    return `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`;
  }

  private optionalCoordinate(value: string): number | null {
    return value === '' ? null : Number(value);
  }

  private resetDialog(): void {
    this.submitted.set(false);
    this.formErrorKey.set(null);
    this.successKey.set(null);
  }

  private handleFormError(error: unknown): void {
    this.formErrorKey.set(
      error instanceof HttpErrorResponse && error.status === 409
        ? 'branchManagement.errors.duplicate'
        : error instanceof HttpErrorResponse && error.status === 403
          ? 'branchManagement.errors.permission'
          : 'branchManagement.errors.save',
    );
  }
}
