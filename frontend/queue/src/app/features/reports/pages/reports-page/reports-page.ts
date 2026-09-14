import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-reports-page',
  styleUrl: './reports-page.scss',
  templateUrl: './reports-page.html',
})
export class ReportsPage {}
