import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-booking-summary',
  imports: [TranslatePipe],
  templateUrl: './booking-summary.html',
  styleUrl: './booking-summary.scss',
})
export class BookingSummary {
  readonly branchName = input.required<string>();
  readonly branchAddress = input.required<string | null>();
  readonly serviceNameKey = input.required<string>();
  readonly waitingCount = input.required<number>();
  readonly estimatedMinutes = input.required<number>();
  readonly back = output<void>();
  readonly confirm = output<void>();
}
