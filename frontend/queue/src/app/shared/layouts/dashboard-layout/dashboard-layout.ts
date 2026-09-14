import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { DashboardHeader } from '../../components/dashboard-header/dashboard-header';
import { DashboardSidebar } from '../../components/dashboard-sidebar/dashboard-sidebar';

@Component({
  imports: [DashboardHeader, DashboardSidebar, RouterOutlet, TranslatePipe],
  selector: 'app-dashboard-layout',
  styleUrl: './dashboard-layout.scss',
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  protected readonly isSidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
