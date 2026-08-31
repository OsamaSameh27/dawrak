import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { QueueStatusCard } from '../../components/queue-status-card/queue-status-card';
import { QueueStatusViewModel } from '../../models/queue-status.model';

interface HomeStep {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-home-page',
  imports: [QueueStatusCard, RouterLink, TranslatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss'
})
export class HomePage {
  protected readonly queues: readonly QueueStatusViewModel[] = [
    {
      id: 'general-examination',
      serviceNameKey: 'home.services.generalExamination',
      branchNameKey: 'home.branches.nasrCity',
      waitingCount: 6,
      estimatedMinutes: 18,
      status: 'available',
      icon: 'bi-stethoscope'
    },
    {
      id: 'dental-examination',
      serviceNameKey: 'home.services.dentalExamination',
      branchNameKey: 'home.branches.maadi',
      waitingCount: 14,
      estimatedMinutes: 35,
      status: 'busy',
      icon: 'bi-clipboard2-pulse'
    },
    {
      id: 'customer-service',
      serviceNameKey: 'home.services.customerService',
      branchNameKey: 'home.branches.downtown',
      waitingCount: 0,
      estimatedMinutes: null,
      status: 'closed',
      icon: 'bi-headset'
    }
  ];

  protected readonly steps: readonly HomeStep[] = [
    {
      icon: 'bi-geo-alt',
      titleKey: 'home.howItWorks.steps.choose.title',
      descriptionKey: 'home.howItWorks.steps.choose.description'
    },
    {
      icon: 'bi-ticket-perforated',
      titleKey: 'home.howItWorks.steps.ticket.title',
      descriptionKey: 'home.howItWorks.steps.ticket.description'
    },
    {
      icon: 'bi-bell',
      titleKey: 'home.howItWorks.steps.follow.title',
      descriptionKey: 'home.howItWorks.steps.follow.description'
    }
  ];
}
