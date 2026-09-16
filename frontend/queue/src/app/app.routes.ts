import { Routes } from '@angular/router';

import { PublicLayout } from './shared/layouts/public-layout/public-layout';
import { authGuard } from './features/auth/guards/auth-guard';
import { roleGuard } from './features/auth/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page').then(
            (component) => component.HomePage,
          ),
      },
      {
        path: 'booking',
        loadComponent: () =>
          import('./features/booking/pages/booking-page/booking-page').then(
            (component) => component.BookingPage,
          ),
      },
      {
        path: 'track',
        pathMatch: 'full',
        redirectTo: 'my-tickets',
      },
      {
        path: 'my-tickets',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['CUSTOMER'] },
        loadComponent: () =>
          import('./features/tickets/pages/current-tickets-page/current-tickets-page').then(
            (component) => component.CurrentTicketsPage,
          ),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register-page/register-page').then(
            (component) => component.RegisterPage,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/dashboard-layout/dashboard-layout').then(
        (component) => component.DashboardLayout,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-overview-page/dashboard-overview-page').then(
            (component) => component.DashboardOverviewPage,
          ),
      },
      {
        path: 'queue',
        canActivate: [roleGuard],
        data: {
          roles: ['STAFF', 'MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/queues/pages/queue-management-page/queue-management-page').then(
            (component) => component.QueueManagementPage,
          ),
      },
      {
        path: 'my-tickets',
        canActivate: [roleGuard],
        data: {
          roles: ['CUSTOMER'],
        },
        loadComponent: () =>
          import('./features/tickets/pages/my-tickets-page/my-tickets-page').then(
            (component) => component.MyTicketsPage,
          ),
      },
      {
        path: 'branches',
        canActivate: [roleGuard],
        data: {
          roles: ['MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/branches/pages/branches-page/branches-page').then(
            (component) => component.BranchesPage,
          ),
      },
      {
        path: 'services',
        canActivate: [roleGuard],
        data: {
          roles: ['MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/services/pages/services-page/services-page').then(
            (component) => component.ServicesPage,
          ),
      },
      {
        path: 'counters',
        canActivate: [roleGuard],
        data: {
          roles: ['STAFF', 'MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/counters/pages/counters-page/counters-page').then(
            (component) => component.CountersPage,
          ),
      },
      {
        path: 'staff',
        canActivate: [roleGuard],
        data: {
          roles: ['MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/users/pages/staff-page/staff-page').then(
            (component) => component.StaffPage,
          ),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: {
          roles: ['MANAGER', 'ADMIN'],
        },
        loadComponent: () =>
          import('./features/reports/pages/reports-page/reports-page').then(
            (component) => component.ReportsPage,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page/notifications-page').then(
            (component) => component.NotificationsPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
