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
  readonly serviceName = input.required<string>();

  readonly back = output<void>();
  readonly confirm = output<void>();

  readonly loading = input(false);
  readonly errorKey = input<string | null>(null);
}
