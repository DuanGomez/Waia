import { Component, computed, input } from '@angular/core';
import { DayPoint, RankItem } from '../core/services/analytics.service';

/** Barras por día (SVG/CSS puro, sin librerías). La serie secundaria se dibuja encima. */
@Component({
  selector: 'w-bar-chart',
  template: `
    <div class="bars" [style.height.px]="height()" role="img" [attr.aria-label]="ariaLabel()">
      @for (p of points(); track p.key; let last = $last) {
        <div class="col" [class.now]="last">
          <span class="value">{{ p.value }}</span>
          <div class="track">
            <i class="main" [style.height.%]="pct(p.value)"></i>
            @if (p.secondary !== undefined) { <i class="sec" [style.height.%]="pct(p.secondary)"></i> }
          </div>
          <span class="label">{{ p.label }}</span>
        </div>
      }
    </div>
    @if (legend().length) {
      <div class="legend">
        <span><i class="sw main"></i>{{ legend()[0] }}</span>
        @if (legend()[1]) { <span><i class="sw sec"></i>{{ legend()[1] }}</span> }
      </div>
    }
  `,
  styles: [`
    .bars { display: flex; align-items: stretch; gap: 10px; }
    .col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .value { font-size: 0.74rem; font-weight: 600; color: var(--text-3); }
    .col.now .value { color: var(--text); }
    .track { position: relative; flex: 1; width: 100%; max-width: 46px; display: flex; align-items: flex-end; }
    .track i { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 10px; min-height: 4px; transition: height 0.6s var(--ease-out); }
    .main { background: var(--surface-3); }
    .sec { background: var(--green); left: 22% !important; right: 22% !important; }
    .col.now .main { background: #d8efe2; }
    .label { font-size: 0.74rem; font-weight: 500; color: var(--text-3); white-space: nowrap; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; font-size: 0.78rem; color: var(--text-2); }
    .legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
    .sw { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .sw.main { background: var(--surface-3); }
    .sw.sec { background: var(--green); }
    @media (max-width: 560px) { .bars { gap: 5px; } }
  `],
})
export class BarChartComponent {
  points = input.required<DayPoint[]>();
  height = input(200);
  legend = input<string[]>([]);
  ariaLabel = input('Gráfico de barras');
  private max = computed(() => Math.max(1, ...this.points().map((p) => p.value)));
  pct(v: number) { return Math.max((v / this.max()) * 100, v ? 4 : 2); }
}

/** Ranking con barras horizontales. */
@Component({
  selector: 'w-rank-list',
  template: `
    @if (items().length) {
      <ol class="rank">
        @for (it of items(); track it.label; let i = $index) {
          <li>
            <div class="row1"><span class="name">{{ it.label }}</span><span class="num">{{ it.value }}</span></div>
            <div class="bar"><i [style.width.%]="(it.value / max()) * 100" [style.background]="color()"></i></div>
          </li>
        }
      </ol>
    } @else {
      <p class="empty-mini">{{ empty() }}</p>
    }
  `,
  styles: [`
    .rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.85rem; }
    .row1 { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.86rem; margin-bottom: 0.35rem; }
    .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .num { font-weight: 600; font-variant-numeric: tabular-nums; }
    .bar { height: 8px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
    .bar i { display: block; height: 100%; border-radius: 99px; transition: width 0.6s var(--ease-out); }
    .empty-mini { color: var(--text-3); font-size: 0.86rem; padding: 1rem 0; }
  `],
})
export class RankListComponent {
  items = input.required<RankItem[]>();
  color = input('var(--ink)');
  empty = input('Aún no hay datos suficientes.');
  max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));
}

/** Dona de proporciones. */
@Component({
  selector: 'w-donut',
  template: `
    <div class="donut-wrap">
      <svg viewBox="0 0 120 120" class="donut" role="img" [attr.aria-label]="center() + ' ' + caption()">
        <circle cx="60" cy="60" r="48" fill="none" stroke="var(--surface-2)" stroke-width="14" />
        @for (s of segments(); track s.label) {
          <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="s.color" stroke-width="14"
            [attr.stroke-dasharray]="s.dash + ' ' + circ" [attr.stroke-dashoffset]="-s.offset" transform="rotate(-90 60 60)" stroke-linecap="butt" />
        }
        <text x="60" y="58" text-anchor="middle" class="big">{{ center() }}</text>
        <text x="60" y="76" text-anchor="middle" class="small">{{ caption() }}</text>
      </svg>
      <ul class="legend">
        @for (s of data(); track s.label) {
          <li><i [style.background]="s.color"></i><span>{{ s.label }}</span><strong>{{ s.value }}</strong></li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .donut-wrap { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .donut { width: 150px; height: 150px; flex-shrink: 0; }
    .big { font-family: var(--display); font-size: 22px; font-weight: 700; fill: var(--text); letter-spacing: -0.04em; }
    .small { font-size: 9px; fill: var(--text-3); }
    .legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; flex: 1; min-width: 180px; }
    .legend li { display: flex; align-items: center; gap: 0.55rem; font-size: 0.86rem; }
    .legend i { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .legend span { flex: 1; color: var(--text-2); }
    .legend strong { font-variant-numeric: tabular-nums; }
  `],
})
export class DonutComponent {
  data = input.required<{ label: string; value: number; color: string }[]>();
  center = input('');
  caption = input('');
  readonly circ = 2 * Math.PI * 48;
  segments = computed(() => {
    const total = this.data().reduce((n, d) => n + d.value, 0) || 1;
    let offset = 0;
    return this.data().map((d) => {
      const dash = (d.value / total) * this.circ;
      const seg = { label: d.label, color: d.color, dash, offset };
      offset += dash;
      return seg;
    });
  });
}
