import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { QueueStatusViewModel } from '../../models/queue-status.model';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';

@Component({
  selector: 'app-queue-status-card',
  imports: [LocalizedTextPipe, RouterLink, TranslatePipe],
  templateUrl: './queue-status-card.html',
  styleUrl: './queue-status-card.scss'
})
export class QueueStatusCard {
  readonly queue = input.required<QueueStatusViewModel>();
  readonly canBook = input(true);
}
