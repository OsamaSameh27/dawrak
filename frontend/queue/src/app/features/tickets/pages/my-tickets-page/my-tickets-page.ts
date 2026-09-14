import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-my-tickets-page',
  styleUrl: './my-tickets-page.scss',
  templateUrl: './my-tickets-page.html',
})
export class MyTicketsPage {}
