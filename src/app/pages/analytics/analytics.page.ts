import { Component, computed, inject } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BusinessService } from '../../core/services/business.service';
import { IconComponent } from '../../shared/icon.component';
import { BarChartComponent, DonutComponent, RankListComponent } from '../../shared/charts';

@Component({
  selector: 'w-analytics',
  imports: [IconComponent, BarChartComponent, DonutComponent, RankListComponent],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Analíticas</h1>
        <p>Qué preguntan los clientes de {{ business().name }} y cuánto resuelve el asistente por su cuenta.</p>
      </div>
      <div class="actions"><span class="demo-tag"><w-icon name="info" [size]="14" /> Datos de demostración, no son resultados reales</span></div>
    </div>

    <section class="kpis">
      @for (k of kpis(); track k.label) {
        <div class="kpi"><span class="label">{{ k.label }}</span><strong>{{ k.value }}</strong><span class="hint">{{ k.hint }}</span></div>
      }
    </section>

    <section class="grid two">
      <article class="card">
        <div class="card-head"><div><h3>Conversaciones por día</h3><p>Últimos 7 días</p></div></div>
        <w-bar-chart [points]="a.conversationsPerDay()" [legend]="['Conversaciones activas', 'Respondidas por el asistente']" ariaLabel="Conversaciones por día" />
      </article>
      <article class="card">
        <div class="card-head"><div><h3>Mensajes resueltos automáticamente</h3><p>Mensajes de clientes y respuestas útiles del asistente</p></div></div>
        <w-bar-chart [points]="a.messagesPerDay()" [legend]="['Mensajes recibidos', 'Resueltos por el asistente']" ariaLabel="Mensajes por día" />
      </article>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-head"><div><h3>Resolución</h3><p>Cómo terminaron las conversaciones</p></div></div>
        <w-donut [data]="a.resolution()" [center]="resolvedPct() + '%'" caption="sin intervención" />
      </article>
      <article class="card">
        <div class="card-head"><div><h3>Clientes potenciales por día</h3><p>{{ k().leads }} en total · {{ k().leadsFromBot }} por el asistente</p></div></div>
        <w-bar-chart [points]="a.leadsPerDay()" [height]="170" ariaLabel="Clientes potenciales por día" />
      </article>
      <article class="card">
        <div class="card-head"><div><h3>Estado de los clientes potenciales</h3><p>Embudo comercial</p></div></div>
        <w-rank-list [items]="leadStatus()" color="var(--violet)" empty="Todavía no hay clientes potenciales." />
      </article>
    </section>

    <section class="grid three">
      <article class="card">
        <div class="card-head"><div><h3>Preguntas frecuentes más consultadas</h3><p>Respondidas con las FAQ configuradas</p></div></div>
        <w-rank-list [items]="a.topFaqs()" color="var(--green)" empty="Ninguna pregunta frecuente se ha consultado aún." />
      </article>
      <article class="card">
        <div class="card-head"><div><h3>{{ isService() ? 'Servicios' : 'Productos' }} más consultados</h3><p>Menciones en conversaciones y pedidos</p></div></div>
        <w-rank-list [items]="a.topProducts()" empty="Aún no se han consultado productos." />
      </article>
      <article class="card">
        <div class="card-head"><div><h3>Qué piden los clientes</h3><p>Intención detectada en cada mensaje</p></div></div>
        <w-rank-list [items]="a.intents()" color="var(--blue)" />
      </article>
    </section>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.8rem; margin-bottom: 1rem; }
    .kpi { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem 1.1rem; border-radius: 18px; background: var(--surface); border: 1px solid var(--line); }
    .kpi .label { font-size: 0.8rem; color: var(--text-2); font-weight: 500; }
    .kpi strong { font-family: var(--display); font-size: 1.8rem; letter-spacing: -0.04em; line-height: 1.1; }
    .kpi .hint { font-size: 0.74rem; color: var(--text-3); }
    .grid { display: grid; gap: 1rem; margin-bottom: 1rem; }
    .grid.two { grid-template-columns: 1fr 1fr; }
    .grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (max-width: 1200px) { .grid.three { grid-template-columns: 1fr 1fr; } .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 800px) { .grid.two, .grid.three { grid-template-columns: 1fr; } .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `],
})
export class AnalyticsPage {
  a = inject(AnalyticsService);
  private businessSvc = inject(BusinessService);
  business = this.businessSvc.business;
  k = this.a.kpis;
  isService = computed(() => this.business().type === 'Barbería');

  resolvedPct = computed(() => {
    const k = this.k();
    return k.received ? Math.round((k.resolvedByBot / k.received) * 100) : 0;
  });

  leadStatus = computed(() => this.a.leadsByStatus().map((s) => ({ label: s.label, value: s.value })));

  kpis = computed(() => {
    const k = this.k();
    const conv = k.leads ? Math.round((k.converted / k.leads) * 100) : 0;
    return [
      { label: 'Resueltas por el asistente', value: k.resolvedByBot, hint: `de ${k.received} conversaciones` },
      { label: 'Transferidas a una persona', value: k.transferred, hint: `${k.pending} siguen pendientes` },
      { label: 'Tasa de automatización', value: `${k.automationRate} %`, hint: `${k.autoAnswered} de ${k.clientMessages} mensajes` },
      { label: 'Clientes potenciales', value: k.leads, hint: `${k.leadsFromBot} captados por el asistente` },
      { label: 'Convertidos', value: `${conv} %`, hint: `${k.converted} ${k.converted === 1 ? 'venta cerrada' : 'ventas cerradas'} en la demo` },
    ];
  });
}
