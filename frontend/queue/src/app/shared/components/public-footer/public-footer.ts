import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [RouterLink, TranslatePipe],
  selector: 'app-public-footer',
  styleUrl: './public-footer.scss',
  templateUrl: './public-footer.html',
})
export class PublicFooter {
  protected readonly currentYear = new Date().getFullYear();
}
