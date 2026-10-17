import { Component, computed, input } from '@angular/core';

const TONES = ['#e6f6ee:#0e8a50', '#eef0fd:#4f46e5', '#fdf3dc:#b7791f', '#fdecea:#c2410c', '#e8f0fd:#2f6fe4', '#f1ecfb:#7c3aed', '#e7f5f4:#0f766e'];

/** Avatar con iniciales y color estable según el nombre. */
@Component({
  selector: 'w-avatar',
  template: `<span class="av" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.38"
    [style.background]="colors()[0]" [style.color]="colors()[1]">{{ initials() }}</span>`,
  styles: [':host { display: inline-flex; } .av { display: grid; place-items: center; border-radius: 50%; font-weight: 600; flex-shrink: 0; letter-spacing: 0; }'],
})
export class AvatarComponent {
  name = input.required<string>();
  size = input(40);
  initials = computed(() => this.name().split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join(''));
  colors = computed(() => {
    let h = 0;
    for (const ch of this.name()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return TONES[h % TONES.length].split(':');
  });
}
