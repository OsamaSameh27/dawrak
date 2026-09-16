import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
import { TicketsServices } from '../../../tickets/services/tickets.services';
import { QueueTicket } from '../../../tickets/models/ticket.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

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

  protected readonly selectedBranch = computed(
    () => this.apiBranches().find((branch) => branch.id === this.selectedBranchId()) ?? null,
  );

  protected readonly selectedService = computed(
    () => this.apiServices().find((service) => service.id === this.selectedServiceId()) ?? null,
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

    if (step === 1 && this.selectedBranch()) {
      this.currentStep.set(2);
    } else if (
      step === 2 &&
      !this.servicesLoading() &&
      !this.servicesFailed() &&
      this.selectedService()
    ) {
      this.currentStep.set(3);
    }
  }

  protected previousStep(): void {
    if (this.bookingLoading()) {
      return;
    }

    this.bookingError.set(null);

    const step = this.currentStep();

    if (step > 1 && step < 4) {
      this.currentStep.set((step - 1) as BookingStep);
    }
  }
  protected confirmBooking(): void {
    const service = this.selectedService();

    if (this.currentStep() !== 3 || !service || this.bookingLoading() || this.createdTicket()) {
      return;
    }

    let idempotencyKey = this.bookingKeys.get(service.id);

    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      this.bookingKeys.set(service.id, idempotencyKey);
    }

    this.bookingLoading.set(true);
    this.bookingError.set(null);

    this.ticketsServices
      .createTicket({
        serviceId: service.id,
        idempotencyKey,
      })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.bookingLoading.set(false);
        }),
      )
      .subscribe({
        next: (ticket) => {
          this.createdTicket.set(ticket);
          this.currentStep.set(4);
        },
        error: (error: unknown) => {
          let messageKey = 'booking.submit.unconfirmed';

          if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
              messageKey = 'booking.submit.loginRequired';
            } else if (error.status === 403) {
              messageKey = 'booking.submit.customerOnly';
            } else if (error.status === 409) {
              messageKey = 'booking.submit.conflict';
            } else if (error.status === 400 || error.status === 404) {
              messageKey = 'booking.submit.invalidSelection';
            }
          }

          this.bookingError.set(messageKey);
        },
      });
  }

  protected startNewBooking(): void {
    if (this.bookingLoading()) {
      return;
    }

    this.bookingKeys.clear();
    this.createdTicket.set(null);
    this.bookingError.set(null);

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

  private readonly ticketsServices = inject(TicketsServices);
  private readonly destroyRef = inject(DestroyRef);

  private readonly bookingKeys = new Map<string, string>();

  protected readonly bookingLoading = signal(false);
  protected readonly bookingError = signal<string | null>(null);
  protected readonly createdTicket = signal<QueueTicket | null>(null);
}
