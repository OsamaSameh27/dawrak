import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { AuthStore } from '../../../auth/state/auth-store';
import { Branch } from '../../../branches/models/branch.model';
import { BranchesServices } from '../../../branches/services/branches.services';
import { QueueReport } from '../../models/report.model';
import { ReportsServices } from '../../services/reports.services';

@Component({
  imports: [FormsModule, LocalizedTextPipe, TranslatePipe],
  selector: 'app-reports-page',
  styleUrl: './reports-page.scss',
  templateUrl: './reports-page.html',
})
export class ReportsPage {
  private readonly api=inject(ReportsServices);private readonly branchesApi=inject(BranchesServices);private readonly auth=inject(AuthStore);
  protected readonly branches=signal<Branch[]>([]);protected readonly report=signal<QueueReport|null>(null);protected readonly loading=signal(true);protected readonly error=signal(false);protected readonly isAdmin=computed(()=>this.auth.role()==='ADMIN');
  protected branchId='';protected from=this.dateOffset(-6);protected to=this.dateOffset(0);
  protected readonly maxHourly=computed(()=>Math.max(1,...(this.report()?.hourlyLoad.map(item=>item.tickets)??[1])));
  ngOnInit():void{forkJoin({branches:this.branchesApi.getBranches()}).subscribe({next:({branches})=>{this.branches.set(branches);this.branchId=this.auth.user()?.branchId??branches[0]?.id??'';this.load();},error:()=>{this.loading.set(false);this.error.set(true);}});}
  protected load():void{if(!this.branchId)return;this.loading.set(true);this.error.set(false);this.api.getOverview(this.branchId,this.from,this.to).pipe(finalize(()=>this.loading.set(false))).subscribe({next:value=>this.report.set(value),error:()=>this.error.set(true)});}
  protected percentage(value:number,total:number):number{return total?Math.round(value/total*100):0;}
  private dateOffset(days:number):string{const date=new Date();date.setDate(date.getDate()+days);return date.toISOString().slice(0,10);}
}
