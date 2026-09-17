import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../../auth/state/auth-store';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-dashboard-overview-page',
  styleUrl: './dashboard-overview-page.scss',
  templateUrl: './dashboard-overview-page.html',
})
export class DashboardOverviewPage {
  private readonly auth=inject(AuthStore);protected readonly user=this.auth.user;protected readonly role=this.auth.role;
  protected readonly actions=computed(()=>{switch(this.role()){case'CUSTOMER':return[{icon:'bi-ticket-perforated',key:'myTickets',route:'/dashboard/my-tickets'},{icon:'bi-bell',key:'notifications',route:'/dashboard/notifications'},{icon:'bi-plus-circle',key:'book',route:'/booking'}];case'STAFF':return[{icon:'bi-people',key:'operate',route:'/dashboard/queue'},{icon:'bi-bell',key:'notifications',route:'/dashboard/notifications'}];default:return[{icon:'bi-activity',key:'monitor',route:'/dashboard/monitoring'},{icon:'bi-person-badge',key:'staff',route:'/dashboard/staff'},{icon:'bi-bar-chart',key:'reports',route:'/dashboard/reports'},{icon:'bi-ui-checks-grid',key:'services',route:'/dashboard/services'}];}});
}
