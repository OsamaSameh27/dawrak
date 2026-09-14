import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-staff-page',
  styleUrl: './staff-page.scss',
  templateUrl: './staff-page.html',
})
export class StaffPage {}
