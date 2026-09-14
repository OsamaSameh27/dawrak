import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-counters-page',
  styleUrl: './counters-page.scss',
  templateUrl: './counters-page.html',
})
export class CountersPage {}
