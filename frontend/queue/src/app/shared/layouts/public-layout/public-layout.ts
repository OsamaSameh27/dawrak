import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { InteractiveBackground } from '../../components/interactive-background/interactive-background';
import { PublicFooter } from '../../components/public-footer/public-footer';
import { PublicHeader } from '../../components/public-header/public-header';

@Component({
  imports: [InteractiveBackground, PublicFooter, PublicHeader, RouterOutlet],
  selector: 'app-public-layout',
  styleUrl: './public-layout.scss',
  templateUrl: './public-layout.html',
})
export class PublicLayout {}
