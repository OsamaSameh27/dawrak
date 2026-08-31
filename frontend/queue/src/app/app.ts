import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgForOf } from "../../node_modules/@angular/common/types/_common_module-chunk";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('queue');
}
