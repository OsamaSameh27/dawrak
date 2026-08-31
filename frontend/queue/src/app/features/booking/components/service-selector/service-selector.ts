import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [TranslatePipe],
  templateUrl: './service-selector.html',
  styleUrl: './service-selector.scss'
})
export class ServiceSelector {
  readonly services = input.required<readonly ServiceChoice[]>();
  readonly selectedId = input<string | null>(null);
  readonly serviceSelected = output<string>();
}
