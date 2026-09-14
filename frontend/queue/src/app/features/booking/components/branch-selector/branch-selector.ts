import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Branch } from '../../../branches/models/branch.model';

@Component({
  selector: 'app-branch-selector',
  imports: [TranslatePipe],
  templateUrl: './branch-selector.html',
  styleUrl: './branch-selector.scss',
})
export class BranchSelector {
  readonly branches = input.required<readonly Branch[]>();
  readonly selectedId = input<string | null>(null);
  readonly branchSelected = output<string>();
}
