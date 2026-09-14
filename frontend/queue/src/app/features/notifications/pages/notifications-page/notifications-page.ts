import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-notifications-page',
  styleUrl: './notifications-page.scss',
  templateUrl: './notifications-page.html',
})
export class NotificationsPage {}
