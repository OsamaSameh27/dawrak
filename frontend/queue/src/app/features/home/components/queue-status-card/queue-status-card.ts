import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { QueueStatusViewModel } from '../../models/queue-status.model';

@Component({
  selector: 'app-queue-status-card',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './queue-status-card.html',
  styleUrl: './queue-status-card.scss'
})
export class QueueStatusCard {
  readonly queue = input.required<QueueStatusViewModel>();
}
