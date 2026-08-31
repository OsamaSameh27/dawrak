import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  NgZone
} from '@angular/core';

@Component({
  selector: 'app-interactive-background',
  templateUrl: './interactive-background.html',
  styleUrl: './interactive-background.scss'
})
export class InteractiveBackground {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private animationFrame: number | null = null;

  constructor() {
    afterNextRender(() => this.listenToPointer());
  }

  private listenToPointer(): void {
    const view = this.elementRef.nativeElement.ownerDocument.defaultView;

    if (
      !view ||
      !view.matchMedia('(pointer: fine)').matches ||
      view.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      if (this.animationFrame !== null) {
        return;
      }

      const pointerX = event.clientX;
      const pointerY = event.clientY;

      this.animationFrame = view.requestAnimationFrame(() => {
        this.elementRef.nativeElement.style.setProperty('--pointer-x', `${pointerX}px`);
        this.elementRef.nativeElement.style.setProperty('--pointer-y', `${pointerY}px`);
        this.animationFrame = null;
      });
    };

    this.ngZone.runOutsideAngular(() => {
      view.addEventListener('pointermove', handlePointerMove, { passive: true });
    });

    this.destroyRef.onDestroy(() => {
      view.removeEventListener('pointermove', handlePointerMove);

      if (this.animationFrame !== null) {
        view.cancelAnimationFrame(this.animationFrame);
      }
    });
  }
}
