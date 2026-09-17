import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { AuthStore } from '../../../auth/state/auth-store';
import { Branch } from '../../../branches/models/branch.model';
import { BranchesServices } from '../../../branches/services/branches.services';
import { ManagedStaffRole, StaffMember } from '../../models/staff.model';
import { StaffServices } from '../../services/staff.services';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';

@Component({
  imports: [LocalizedTextPipe, ReactiveFormsModule, TranslatePipe],
  selector: 'app-staff-page',
  styleUrl: './staff-page.scss',
  templateUrl: './staff-page.html',
})
export class StaffPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly staffServices = inject(StaffServices);
  private readonly branchesServices = inject(BranchesServices);
  private readonly authStore = inject(AuthStore);

  protected readonly staff = signal<StaffMember[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal(false);
  protected readonly formErrorKey = signal<string | null>(null);
  protected readonly successKey = signal<string | null>(null);
  protected readonly dialogMode = signal<'create' | 'edit' | null>(null);
  protected readonly editingStaff = signal<StaffMember | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedBranchId = signal('');
  protected readonly submitted = signal(false);

  protected readonly isAdmin = computed(() => this.authStore.role() === 'ADMIN');
  protected readonly filteredStaff = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const branchId = this.selectedBranchId();

    return this.staff().filter((member) => {
      const matchesBranch = !branchId || member.branchId === branchId;
      const matchesSearch =
        !search ||
        member.fullName.toLocaleLowerCase().includes(search) ||
        member.email.toLocaleLowerCase().includes(search) ||
        (member.phone?.includes(search) ?? false);

      return matchesBranch && matchesSearch;
    });
  });
  protected readonly visibleManagers = computed(() =>
    this.filteredStaff().filter((member) => member.role === 'MANAGER'),
  );
  protected readonly visibleStaff = computed(() =>
    this.filteredStaff().filter((member) => member.role === 'STAFF'),
  );
  protected readonly activeCount = computed(
    () => this.staff().filter((member) => member.isActive).length,
  );
  protected readonly managerCount = computed(
    () => this.staff().filter((member) => member.role === 'MANAGER').length,
  );

  protected readonly createForm = this.formBuilder.nonNullable.group({
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
    role: ['STAFF' as ManagedStaffRole, Validators.required],
    branchId: ['', Validators.required],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^\+?[0-9]{8,15}$/)]],
    role: ['STAFF' as ManagedStaffRole, Validators.required],
    branchId: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadPage();
  }

  protected loadPage(): void {
    this.loading.set(true);
    this.loadError.set(false);

    forkJoin({
      staff: this.staffServices.getStaff(),
      branches: this.branchesServices.getBranches(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ staff, branches }) => {
          this.staff.set(staff);
          this.branches.set(branches);
        },
        error: () => this.loadError.set(true),
      });
  }

  protected openCreate(): void {
    const branchId = this.authStore.user()?.branchId ?? this.branches()[0]?.id ?? '';
    this.createForm.reset({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'STAFF',
      branchId,
    });
    this.resetDialogState();
    this.dialogMode.set('create');
  }

  protected openEdit(member: StaffMember): void {
    this.editingStaff.set(member);
    this.editForm.reset({
      fullName: member.fullName,
      phone: member.phone ?? '',
      role: member.role,
      branchId: member.branchId,
      isActive: member.isActive,
    });
    this.resetDialogState();
    this.dialogMode.set('edit');
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialogMode.set(null);
    this.editingStaff.set(null);
    this.formErrorKey.set(null);
    this.submitted.set(false);
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
    this.saving.set(true);
    this.staffServices
      .createStaff({
        fullName: value.fullName.trim(),
        email: value.email.trim(),
        password: value.password,
        phone: value.phone.trim() || undefined,
        role: this.isAdmin() ? value.role : 'STAFF',
        branchId: this.isAdmin() ? value.branchId : (this.authStore.user()?.branchId ?? value.branchId),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (member) => {
          this.staff.update((current) => [...current, member]);
          this.dialogMode.set(null);
          this.successKey.set('staffManagement.messages.created');
        },
        error: (error: unknown) => this.handleFormError(error),
      });
  }

  protected submitEdit(): void {
    const member = this.editingStaff();
    if (!member || this.saving()) return;
    this.submitted.set(true);
    this.formErrorKey.set(null);

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const value = this.editForm.getRawValue();
    this.saving.set(true);
    this.staffServices
      .updateStaff(member.id, {
        fullName: value.fullName.trim(),
        phone: value.phone.trim() || null,
        role: this.isAdmin() ? value.role : 'STAFF',
        branchId: this.isAdmin() ? value.branchId : member.branchId,
        isActive: value.isActive,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.staff.update((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.dialogMode.set(null);
          this.editingStaff.set(null);
          this.successKey.set('staffManagement.messages.updated');
        },
        error: (error: unknown) => this.handleFormError(error),
      });
  }

  protected setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected setBranchFilter(event: Event): void {
    this.selectedBranchId.set((event.target as HTMLSelectElement).value);
  }

  protected controlInvalid(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  private resetDialogState(): void {
    this.submitted.set(false);
    this.formErrorKey.set(null);
    this.successKey.set(null);
  }

  private handleFormError(error: unknown): void {
    const key =
      error instanceof HttpErrorResponse && error.status === 409
        ? 'staffManagement.errors.duplicate'
        : error instanceof HttpErrorResponse && error.status === 403
          ? 'staffManagement.errors.permission'
          : 'staffManagement.errors.save';
    this.formErrorKey.set(key);
  }
}
