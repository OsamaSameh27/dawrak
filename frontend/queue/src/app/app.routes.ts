import { Routes } from '@angular/router';

import { PublicLayout } from './shared/layouts/public-layout/public-layout';

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
            (component) => component.HomePage
          )
      },
      {
        path: 'booking',
        loadComponent: () =>
          import('./features/booking/pages/booking-page/booking-page').then(
            (component) => component.BookingPage
          )
      },
      {
        path: 'track',
        loadComponent: () =>
          import('./features/tickets/pages/track-ticket-page/track-ticket-page').then(
            (component) => component.TrackTicketPage
          )
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage
          )
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register-page/register-page').then(
            (component) => component.RegisterPage
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
