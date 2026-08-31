import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-track-ticket-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './track-ticket-page.html',
  styleUrl: './track-ticket-page.scss'
})
export class TrackTicketPage {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly hasResult = signal(false);
  protected readonly trackForm = this.formBuilder.nonNullable.group({
    publicId: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]]
  });

  protected searchTicket(): void {
    if (this.trackForm.invalid) {
      this.trackForm.markAllAsTouched();
      return;
    }

    this.hasResult.set(true);
  }

  protected searchAgain(): void {
    this.hasResult.set(false);
    this.trackForm.reset();
  }
}
