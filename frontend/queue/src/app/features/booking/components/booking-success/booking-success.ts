import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-success',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './booking-success.html',
  styleUrl: './booking-success.scss',
})
export class BookingSuccess {
  readonly ticketNumber = input.required<string>();
  readonly branchName = input.required<string>();
  readonly serviceName = input.required<string>();
  readonly peopleAhead = input.required<number>();
  readonly estimatedMinutes = input.required<number>();
  readonly newBooking = output<void>();
}
