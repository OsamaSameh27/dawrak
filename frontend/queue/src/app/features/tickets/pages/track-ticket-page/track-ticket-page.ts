import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, Subscription, timeout } from 'rxjs';

import { TicketsServices } from '../../services/tickets.services';
import { QueueTicket } from '../../models/ticket.model';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';

@Component({
  selector: 'app-track-ticket-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LocalizedTextPipe],
  templateUrl: './track-ticket-page.html',
  styleUrl: './track-ticket-page.scss',
})
export class TrackTicketPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly ticketsServices = inject(TicketsServices);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private ticketSubscription?: Subscription;

  protected readonly ticket = signal<QueueTicket | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  protected readonly trackForm = this.formBuilder.nonNullable.group({
    publicId: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ),
      ],
    ],
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.ticketSubscription?.unsubscribe();
        this.ticket.set(null);
        this.errorKey.set(null);

        const publicId = params.get('publicId')?.trim() ?? '';
        this.trackForm.reset({ publicId });

        if (publicId) {
          this.searchTicket();
        }
      });
  }

  protected searchTicket(): void {
    const publicId = this.trackForm.controls.publicId.value.trim();
    this.trackForm.controls.publicId.setValue(publicId);

    if (this.loading()) {
      return;
    }

    this.errorKey.set(null);

    if (this.trackForm.invalid) {
      this.trackForm.markAllAsTouched();
      return;
    }

    this.ticketSubscription?.unsubscribe();
    this.ticket.set(null);
    this.loading.set(true);

    this.ticketSubscription = this.ticketsServices
      .getTicket(publicId)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (ticket) => {
          this.ticket.set(ticket);
        },
        error: (error: unknown) => {
          const notFound =
            error instanceof HttpErrorResponse && error.status === 404;

          this.errorKey.set(
            notFound ? 'track.errors.notFound' : 'track.errors.loadFailed',
          );
        },
      });
  }

  protected searchAgain(): void {
    this.ticketSubscription?.unsubscribe();
    this.ticket.set(null);
    this.errorKey.set(null);
    this.trackForm.reset();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { publicId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
