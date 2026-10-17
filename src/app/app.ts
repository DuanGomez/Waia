import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OverlaysComponent } from './shared/overlays.component';

@Component({
  selector: 'w-root',
  imports: [RouterOutlet, OverlaysComponent],
  template: `<router-outlet /><w-overlays />`,
})
export class App {}
