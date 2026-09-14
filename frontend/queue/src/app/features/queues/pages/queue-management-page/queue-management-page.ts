import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-queue-management-page',
  styleUrl: './queue-management-page.scss',
  templateUrl: './queue-management-page.html',
})
export class QueueManagementPage {}
