import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

interface BranchChoice {
  id: string;
  nameKey: string;
  addressKey: string;
  hoursKey: string;
  icon: string;
}

@Component({
  selector: 'app-branch-selector',
  imports: [TranslatePipe],
  templateUrl: './branch-selector.html',
  styleUrl: './branch-selector.scss',
})
export class BranchSelector {
  readonly branches = input.required<readonly BranchChoice[]>();
  readonly selectedId = input<string | null>(null);
  readonly branchSelected = output<string>();
}
