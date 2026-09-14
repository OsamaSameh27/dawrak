import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-branches-page',
  styleUrl: './branches-page.scss',
  templateUrl: './branches-page.html',
})
export class BranchesPage {}
