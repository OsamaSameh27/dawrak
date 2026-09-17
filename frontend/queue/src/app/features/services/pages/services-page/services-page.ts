import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { AuthStore } from '../../../auth/state/auth-store';
import { Branch } from '../../../branches/models/branch.model';
import { BranchesServices } from '../../../branches/services/branches.services';
import { ManagedQueueService } from '../../models/queue-service.model';
import { QueueServices } from '../../services/queue-services';

@Component({
  imports: [LocalizedTextPipe, ReactiveFormsModule, TranslatePipe],
  selector: 'app-services-page',
  styleUrl: './services-page.scss',
  templateUrl: './services-page.html',
})
export class ServicesPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(QueueServices);
  private readonly branchesApi = inject(BranchesServices);
  private readonly auth = inject(AuthStore);
  protected readonly services = signal<ManagedQueueService[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly dialog = signal<'create' | 'edit' | null>(null);
  protected readonly editing = signal<ManagedQueueService | null>(null);
  protected readonly branchFilter = signal('');
  protected readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  protected readonly visible = computed(() => this.services().filter((item) => !this.branchFilter() || item.branchId === this.branchFilter()));
  protected readonly activeCount = computed(() => this.services().filter((item) => item.isActive).length);
  protected readonly form = this.fb.nonNullable.group({
    branchId: ['', Validators.required], nameAr: ['', [Validators.required, Validators.minLength(2)]], nameEn: ['', [Validators.required, Validators.minLength(2)]],
    prefix: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{1,5}$/)]], descriptionAr: [''], descriptionEn: [''],
    averageServiceMinutes: [10, [Validators.required, Validators.min(1), Validators.max(240)]], nearTurnThreshold: [2, [Validators.required, Validators.min(0), Validators.max(20)]], isActive: [true],
  });

  ngOnInit(): void { this.load(); }
  protected load(): void {
    this.loading.set(true); this.errorKey.set(null);
    forkJoin({ services: this.api.getManaged(), branches: this.branchesApi.getBranches() }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ services, branches }) => { this.services.set(services); this.branches.set(branches); }, error: () => this.errorKey.set('servicesManagement.errors.load'),
    });
  }
  protected openCreate(): void {
    this.editing.set(null); this.dialog.set('create'); this.form.reset({ branchId: this.auth.user()?.branchId ?? this.branches()[0]?.id ?? '', nameAr: '', nameEn: '', prefix: '', descriptionAr: '', descriptionEn: '', averageServiceMinutes: 10, nearTurnThreshold: 2, isActive: true });
  }
  protected openEdit(item: ManagedQueueService): void {
    this.editing.set(item); this.dialog.set('edit'); this.form.reset({ branchId: item.branchId, nameAr: item.nameAr, nameEn: item.nameEn, prefix: item.prefix, descriptionAr: item.descriptionAr ?? '', descriptionEn: item.descriptionEn ?? '', averageServiceMinutes: item.averageServiceMinutes, nearTurnThreshold: item.nearTurnThreshold, isActive: item.isActive });
  }
  protected close(): void { if (!this.saving()) this.dialog.set(null); }
  protected setFilter(event: Event): void { this.branchFilter.set((event.target as HTMLSelectElement).value); }
  protected submit(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const current = this.editing(); this.saving.set(true); this.errorKey.set(null);
    const request = current
      ? this.api.update(current.id, { nameAr: value.nameAr.trim(), nameEn: value.nameEn.trim(), descriptionAr: value.descriptionAr.trim(), descriptionEn: value.descriptionEn.trim(), averageServiceMinutes: value.averageServiceMinutes, nearTurnThreshold: value.nearTurnThreshold, isActive: value.isActive })
      : this.api.create({ branchId: this.isAdmin() ? value.branchId : this.auth.user()?.branchId ?? value.branchId, nameAr: value.nameAr.trim(), nameEn: value.nameEn.trim(), prefix: value.prefix.trim().toUpperCase(), descriptionAr: value.descriptionAr.trim(), descriptionEn: value.descriptionEn.trim(), averageServiceMinutes: value.averageServiceMinutes, nearTurnThreshold: value.nearTurnThreshold });
    request.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.dialog.set(null); this.load(); }, error: (error: unknown) => this.errorKey.set(error instanceof HttpErrorResponse && error.status === 409 ? 'servicesManagement.errors.duplicate' : 'servicesManagement.errors.save') });
  }
}
