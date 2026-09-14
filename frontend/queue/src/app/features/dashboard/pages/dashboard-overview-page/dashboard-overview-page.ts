import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-dashboard-overview-page',
  styleUrl: './dashboard-overview-page.scss',
  templateUrl: './dashboard-overview-page.html',
})
export class DashboardOverviewPage {}
