import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BookingStepper } from '../../components/booking-stepper/booking-stepper';
import { BranchSelector } from '../../components/branch-selector/branch-selector';
import { ServiceSelector } from '../../components/service-selector/service-selector';
import { BookingSummary } from '../../components/booking-summary/booking-summary';
import { BookingSuccess } from '../../components/booking-success/booking-success';
import { BranchesServices } from '../../../branches/services/branches.services';
import { Branch } from '../../../branches/models/branch.model';
import { finalize, Subscription, timeout } from 'rxjs';
import { QueueServices } from '../../../services/services/queue-services';
import { QueueService } from '../../../services/models/queue-service.model';

type BookingStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-booking-page',
  imports: [
    BookingStepper,
    BranchSelector,
    ServiceSelector,
    BookingSummary,
    BookingSuccess,
    TranslatePipe,
  ],
  templateUrl: './booking-page.html',
  styleUrl: './booking-page.scss',
})
export class BookingPage {
  protected readonly currentStep = signal<BookingStep>(1);
  protected readonly selectedBranchId = signal<string | null>(null);
  protected readonly selectedServiceId = signal<string | null>(null);

  protected readonly services = [
    {
      id: 'general-examination',
      nameKey: 'booking.services.generalExamination.name',
      descriptionKey: 'booking.services.generalExamination.description',
      icon: 'bi-stethoscope',
      waitingCount: 6,
      estimatedMinutes: 18,
    },
    {
      id: 'dental-examination',
      nameKey: 'booking.services.dentalExamination.name',
      descriptionKey: 'booking.services.dentalExamination.description',
      icon: 'bi-clipboard2-pulse',
      waitingCount: 4,
      estimatedMinutes: 12,
    },
    {
      id: 'customer-service',
      nameKey: 'booking.services.customerService.name',
      descriptionKey: 'booking.services.customerService.description',
      icon: 'bi-headset',
      waitingCount: 9,
      estimatedMinutes: 25,
    },
  ] as const;

  protected readonly selectedBranch = computed(
    () => this.apiBranches().find((branch) => branch.id === this.selectedBranchId()) ?? null,
  );

  protected readonly selectedService = computed(
    () => this.services.find((service) => service.id === this.selectedServiceId()) ?? null,
  );

  protected selectBranch(branchId: string): void {
    if (this.selectedBranchId() === branchId) {
      return;
    }

    this.selectedBranchId.set(branchId);
    this.loadServices();
  }

  protected selectService(serviceId: string): void {
    this.selectedServiceId.set(serviceId);
  }

  protected nextStep(): void {
    const step = this.currentStep();

    if (step === 1 && this.selectedBranchId()) {
      this.currentStep.set(2);
    } else if (step === 2 && this.selectedServiceId()) {
      this.currentStep.set(3);
    }
  }

  protected previousStep(): void {
    const step = this.currentStep();

    if (step > 1 && step < 4) {
      this.currentStep.set((step - 1) as BookingStep);
    }
  }

  protected confirmBooking(): void {
    if (this.selectedBranch() && this.selectedService()) {
      this.currentStep.set(4);
    }
  }

  protected startNewBooking(): void {
    this.servicesSubscription?.unsubscribe();

    this.selectedBranchId.set(null);
    this.selectedServiceId.set(null);
    this.apiServices.set([]);
    this.servicesLoading.set(false);
    this.servicesFailed.set(false);
    this.currentStep.set(1);
  }

  ngOnDestroy(): void {
    this.servicesSubscription?.unsubscribe();
  }
  private readonly branchesServices = inject(BranchesServices);

  protected readonly apiBranches = signal<Branch[]>([]);
  protected readonly branchesLoading = signal(false);
  protected readonly branchesFailed = signal(false);

  ngOnInit(): void {
    this.loadBranches();
  }

  protected loadBranches(): void {
    if (this.branchesLoading()) {
      return;
    }

    this.branchesLoading.set(true);
    this.branchesFailed.set(false);

    this.branchesServices
      .getBranches()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.branchesLoading.set(false);
        }),
      )
      .subscribe({
        next: (branches) => {
          this.apiBranches.set(branches);
        },
        error: () => {
          this.branchesFailed.set(true);
        },
      });
  }

  private readonly queueServices = inject(QueueServices);
  private servicesSubscription?: Subscription;

  protected readonly apiServices = signal<QueueService[]>([]);
  protected readonly servicesLoading = signal(false);
  protected readonly servicesFailed = signal(false);

  protected loadServices(): void {
    this.servicesSubscription?.unsubscribe();

    const branchId = this.selectedBranchId();

    this.apiServices.set([]);
    this.selectedServiceId.set(null);
    this.servicesFailed.set(false);
    this.servicesLoading.set(false);

    if (!branchId) {
      return;
    }

    this.servicesLoading.set(true);

    this.servicesSubscription = this.queueServices
      .getByBranch(branchId)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.servicesLoading.set(false);
        }),
      )
      .subscribe({
        next: (services) => {
          this.apiServices.set(services);
        },
        error: () => {
          this.servicesFailed.set(true);
        },
      });
  }
}
