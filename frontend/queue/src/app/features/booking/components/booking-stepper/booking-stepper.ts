import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-stepper',
  imports: [TranslatePipe],
  templateUrl: './booking-stepper.html',
  styleUrl: './booking-stepper.scss'
})
export class BookingStepper {
  readonly currentStep = input.required<number>();

  protected readonly steps = [
    'booking.stepper.branch',
    'booking.stepper.service',
    'booking.stepper.confirm'
  ] as const;
}
