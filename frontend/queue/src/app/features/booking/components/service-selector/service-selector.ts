import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { QueueService } from '../../../services/models/queue-service.model';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';

interface ServiceChoice {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  waitingCount: number;
  estimatedMinutes: number;
}

@Component({
  selector: 'app-service-selector',
  imports: [TranslatePipe, LocalizedTextPipe],
  templateUrl: './service-selector.html',
  styleUrl: './service-selector.scss'
})
export class ServiceSelector {
  readonly services = input.required<readonly QueueService[]>();
  readonly selectedId = input<string | null>(null);
  readonly serviceSelected = output<string>();
}
