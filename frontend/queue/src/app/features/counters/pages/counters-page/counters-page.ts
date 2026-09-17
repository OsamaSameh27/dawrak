import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { AuthStore } from '../../../auth/state/auth-store';
import { Branch } from '../../../branches/models/branch.model';
import { BranchesServices } from '../../../branches/services/branches.services';
import { ManagedQueueService } from '../../../services/models/queue-service.model';
import { QueueServices } from '../../../services/services/queue-services';
import { QueueCounter } from '../../../queues/models/queue-management.model';
import { QueueManagementServices } from '../../../queues/services/queue-management.services';

@Component({
  imports: [LocalizedTextPipe, ReactiveFormsModule, TranslatePipe],
  selector: 'app-counters-page',
  styleUrl: './counters-page.scss',
  templateUrl: './counters-page.html',
})
export class CountersPage {
  private readonly fb = inject(FormBuilder); private readonly api = inject(QueueManagementServices); private readonly servicesApi = inject(QueueServices); private readonly branchesApi = inject(BranchesServices); private readonly auth = inject(AuthStore);
  protected readonly counters = signal<QueueCounter[]>([]); protected readonly services = signal<ManagedQueueService[]>([]); protected readonly branches = signal<Branch[]>([]); protected readonly loading = signal(true); protected readonly saving = signal(false); protected readonly errorKey = signal<string | null>(null); protected readonly dialog = signal<'create'|'edit'|null>(null); protected readonly editing = signal<QueueCounter|null>(null); protected readonly branchFilter = signal(''); protected readonly isAdmin = computed(() => this.auth.role()==='ADMIN');
  protected readonly visible = computed(()=>this.counters().filter(item=>!this.branchFilter()||item.branchId===this.branchFilter()));
  protected readonly availableServices = computed(()=>{const branchId=this.form.controls.branchId.value; return this.services().filter(item=>item.branchId===branchId&&item.isActive);});
  protected readonly form=this.fb.nonNullable.group({branchId:['',Validators.required],serviceId:[''],number:[1,[Validators.required,Validators.min(1),Validators.max(999)]]});
  ngOnInit():void{this.load();}
  protected load():void{this.loading.set(true);this.errorKey.set(null);forkJoin({counters:this.api.getCounters(),services:this.servicesApi.getManaged(),branches:this.branchesApi.getBranches()}).pipe(finalize(()=>this.loading.set(false))).subscribe({next:result=>{this.counters.set(result.counters);this.services.set(result.services);this.branches.set(result.branches);},error:()=>this.errorKey.set('countersManagement.errors.load')});}
  protected openCreate():void{const branchId=this.auth.user()?.branchId??this.branches()[0]?.id??'';this.editing.set(null);this.form.reset({branchId,serviceId:'',number:1});this.dialog.set('create');}
  protected openEdit(item:QueueCounter):void{this.editing.set(item);this.form.reset({branchId:item.branchId,serviceId:item.serviceId??'',number:item.number});this.dialog.set('edit');}
  protected close():void{if(!this.saving())this.dialog.set(null);}
  protected setFilter(event:Event):void{this.branchFilter.set((event.target as HTMLSelectElement).value);}
  protected branchCode(branchId:string):string{return this.branches().find(branch=>branch.id===branchId)?.code??'—';}
  protected submit():void{if(this.form.invalid||this.saving()){this.form.markAllAsTouched();return;}const value=this.form.getRawValue();const current=this.editing();this.saving.set(true);const request=current?this.api.updateCounter(current.id,{number:value.number,serviceId:value.serviceId||null}):this.api.createCounter({branchId:this.isAdmin()?value.branchId:this.auth.user()?.branchId??value.branchId,number:value.number,serviceId:value.serviceId||undefined});request.pipe(finalize(()=>this.saving.set(false))).subscribe({next:()=>{this.dialog.set(null);this.load();},error:(error:unknown)=>this.errorKey.set(error instanceof HttpErrorResponse&&error.status===409?'countersManagement.errors.duplicate':'countersManagement.errors.save')});}
}
