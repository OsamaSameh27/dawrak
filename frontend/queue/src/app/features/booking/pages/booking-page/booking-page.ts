import { Component, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BookingStepper } from '../../components/booking-stepper/booking-stepper';
import { BranchSelector } from '../../components/branch-selector/branch-selector';
import { ServiceSelector } from '../../components/service-selector/service-selector';
import { BookingSummary } from '../../components/booking-summary/booking-summary';
import { BookingSuccess } from '../../components/booking-success/booking-success';

type BookingStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-booking-page',
  imports: [
    BookingStepper,
    BranchSelector,
    ServiceSelector,
    BookingSummary,
    BookingSuccess,
    TranslatePipe
  ],
  templateUrl: './booking-page.html',
  styleUrl: './booking-page.scss'
})
export class BookingPage {
  protected readonly currentStep = signal<BookingStep>(1);
  protected readonly selectedBranchId = signal<string | null>(null);
  protected readonly selectedServiceId = signal<string | null>(null);

  protected readonly branches = [
    {
      id: 'nasr-city',
      nameKey: 'booking.branches.nasrCity.name',
      addressKey: 'booking.branches.nasrCity.address',
      hoursKey: 'booking.branches.nasrCity.hours',
      icon: 'bi-building'
    },
    {
      id: 'maadi',
      nameKey: 'booking.branches.maadi.name',
      addressKey: 'booking.branches.maadi.address',
      hoursKey: 'booking.branches.maadi.hours',
      icon: 'bi-geo-alt'
    },
    {
      id: 'downtown',
      nameKey: 'booking.branches.downtown.name',
      addressKey: 'booking.branches.downtown.address',
      hoursKey: 'booking.branches.downtown.hours',
      icon: 'bi-buildings'
    }
  ] as const;

  protected readonly services = [
    {
      id: 'general-examination',
      nameKey: 'booking.services.generalExamination.name',
      descriptionKey: 'booking.services.generalExamination.description',
      icon: 'bi-stethoscope',
      waitingCount: 6,
      estimatedMinutes: 18
    },
    {
      id: 'dental-examination',
      nameKey: 'booking.services.dentalExamination.name',
      descriptionKey: 'booking.services.dentalExamination.description',
      icon: 'bi-clipboard2-pulse',
      waitingCount: 4,
      estimatedMinutes: 12
    },
    {
      id: 'customer-service',
      nameKey: 'booking.services.customerService.name',
      descriptionKey: 'booking.services.customerService.description',
      icon: 'bi-headset',
      waitingCount: 9,
      estimatedMinutes: 25
    }
  ] as const;

  protected readonly selectedBranch = computed(
    () => this.branches.find((branch) => branch.id === this.selectedBranchId()) ?? null
  );

  protected readonly selectedService = computed(
    () => this.services.find((service) => service.id === this.selectedServiceId()) ?? null
  );

  protected selectBranch(branchId: string): void {
    if (this.selectedBranchId() !== branchId) {
      this.selectedServiceId.set(null);
    }

    this.selectedBranchId.set(branchId);
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
    this.selectedBranchId.set(null);
    this.selectedServiceId.set(null);
    this.currentStep.set(1);
  }
}
