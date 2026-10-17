import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';
import { BusinessService } from '../../core/services/business.service';
import { AssistantService } from '../../core/services/assistant.service';
import { ConversationsService } from '../../core/services/conversations.service';
import { ToastService } from '../../core/ui/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { BarChartComponent } from '../../shared/charts';
import { AgoPipe } from '../../shared/format';

@Component({
  selector: 'w-dashboard',
  imports: [RouterLink, IconComponent, AvatarComponent, BarChartComponent, AgoPipe],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Resumen</h1>
        <p>Así va la atención de {{ business().name }} en los últimos 7 días.</p>
      </div>
      <div class="actions">
        <span class="demo-tag"><w-icon name="info" [size]="14" /> Datos de demostración</span>
        <a class="btn btn-primary" routerLink="/app/conversaciones"><w-icon name="chat" [size]="17" /> Abrir simulador</a>
      </div>
    </div>

    <section class="kpis">
      @for (k of cards(); track k.label) {
        <article class="kpi fade-in">
          <div class="kpi-top"><span class="kpi-icon" [class]="'kpi-icon ' + k.tone"><w-icon [name]="k.icon" [size]="19" /></span>
            @if (k.link) { <a [routerLink]="k.link" class="kpi-link" [attr.aria-label]="'Ver ' + k.label"><w-icon name="arrow-right" [size]="16" /></a> }
          </div>
          <strong class="kpi-value">{{ k.value }}</strong>
          <span class="kpi-label">{{ k.label }}</span>
          <span class="kpi-hint">{{ k.hint }}</span>
        </article>
      }
    </section>

    <section class="grid-main">
      <article class="card chart-card">
        <div class="card-head">
          <div><h3>Actividad de conversaciones</h3><p>Chats con mensajes de clientes por día</p></div>
          <strong class="big mono">{{ weekTotal() }}</strong>
        </div>
        <w-bar-chart [points]="analytics.conversationsPerDay()" [height]="220" [legend]="['Conversaciones activas', 'Respondidas por el asistente']" ariaLabel="Conversaciones por día en los últimos 7 días" />
      </article>

      <div class="side-col">
        <article class="card wa">
          <div class="wa-head">
            <span class="wa-icon"><w-icon name="link" [size]="20" /></span>
            <div><h3>Conexión de WhatsApp</h3><p class="faint small">Estado de la integración</p></div>
          </div>
          <div class="wa-status"><span class="pulse"></span><strong>Simulación activa</strong></div>
          <p class="small muted">Esta demo no está conectada a WhatsApp. Las conversaciones son simuladas dentro de Waia y ningún mensaje sale del navegador.</p>
          <a class="btn btn-ghost btn-sm" routerLink="/app/whatsapp">Ver requisitos de conexión <w-icon name="arrow-right" [size]="15" /></a>
        </article>

        <article class="card bot">
          <div class="row between">
            <div class="row"><span class="bot-icon"><w-icon name="bot" [size]="19" /></span><div><h4>{{ assistant().assistantName }}</h4><p class="tiny faint">Asistente de {{ business().name }}</p></div></div>
            <button class="switch" type="button" role="switch" [class.on]="assistant().botEnabled" [attr.aria-checked]="assistant().botEnabled" (click)="toggleBot()" aria-label="Activar o pausar el asistente"></button>
          </div>
          <p class="small muted bot-text">{{ assistant().botEnabled ? 'Respondiendo automáticamente en la simulación.' : 'En pausa: los mensajes nuevos quedan pendientes de una persona.' }}</p>
        </article>
      </div>
    </section>

    <section class="grid-two">
      <article class="card">
        <div class="card-head"><div><h3>Actividad reciente</h3><p>Mensajes, clientes potenciales y transferencias</p></div></div>
        <ul class="activity">
          @for (a of analytics.recentActivity(); track a.at + a.title + a.kind) {
            <li>
              <span class="act-icon" [class]="'act-icon ' + a.kind"><w-icon [name]="actIcon[a.kind]" [size]="16" /></span>
              <div class="grow">
                <p class="act-title"><strong>{{ a.title }}</strong> <span class="faint">· {{ a.at | ago }}</span></p>
                <p class="act-text truncate">{{ a.text }}</p>
              </div>
              @if (a.conversationId) { <a class="btn btn-quiet btn-icon btn-sm" [routerLink]="'/app/conversaciones'" [queryParams]="{ chat: a.conversationId }" aria-label="Abrir conversación"><w-icon name="chevron-right" [size]="16" /></a> }
              @if (a.leadId) { <a class="btn btn-quiet btn-icon btn-sm" [routerLink]="'/app/clientes'" [queryParams]="{ lead: a.leadId }" aria-label="Ver cliente potencial"><w-icon name="chevron-right" [size]="16" /></a> }
            </li>
          } @empty {
            <li class="faint small">Todavía no hay actividad.</li>
          }
        </ul>
      </article>

      <article class="card">
        <div class="card-head">
          <div><h3>Esperando a una persona</h3><p>Chats que el asistente transfirió al equipo</p></div>
          <span class="badge" [class.badge-amber]="pending().length > 0">{{ pending().length }}</span>
        </div>
        @if (pending().length) {
          <ul class="pending">
            @for (c of pending(); track c.id) {
              <li>
                <a [routerLink]="'/app/conversaciones'" [queryParams]="{ chat: c.id }">
                  <w-avatar [name]="c.contactName" [size]="38" />
                  <div class="grow"><strong>{{ c.contactName }}</strong><p class="small faint truncate">{{ lastText(c.id) }}</p></div>
                  @if (c.unread) { <span class="unread">{{ c.unread }}</span> }
                </a>
              </li>
            }
          </ul>
        } @else {
          <div class="empty"><div class="empty-icon"><w-icon name="check-circle" /></div><h3>Todo al día</h3><p>No hay conversaciones esperando a una persona.</p></div>
        }
      </article>
    </section>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.9rem; margin-bottom: 1.1rem; }
    .kpi { display: flex; flex-direction: column; padding: 1.1rem 1.1rem 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); transition: box-shadow 0.25s ease, transform 0.25s var(--ease); }
    .kpi:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .kpi-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .kpi-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; }
    .kpi-icon.green { background: var(--green-soft); color: var(--green-dark); }
    .kpi-icon.violet { background: var(--violet-soft); color: var(--violet); }
    .kpi-icon.amber { background: var(--amber-soft); color: var(--amber); }
    .kpi-icon.blue { background: var(--blue-soft); color: var(--blue); }
    .kpi-icon.ink { background: var(--surface-2); color: var(--text); }
    .kpi-link { color: var(--text-3); }
    .kpi-link:hover { color: var(--text); }
    .kpi-value { font-family: var(--display); font-size: 1.85rem; font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
    .kpi-label { margin-top: 0.4rem; font-size: 0.84rem; font-weight: 600; }
    .kpi-hint { font-size: 0.76rem; color: var(--text-3); margin-top: 0.15rem; }

    .grid-main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 340px); gap: 1rem; margin-bottom: 1rem; }
    .big { font-family: var(--display); font-size: 1.6rem; letter-spacing: -0.04em; }
    .side-col { display: flex; flex-direction: column; gap: 1rem; }
    .wa { display: flex; flex-direction: column; gap: 0.8rem; }
    .wa-head { display: flex; align-items: center; gap: 0.75rem; }
    .wa-icon, .bot-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--surface-2); flex-shrink: 0; }
    .bot-icon { background: var(--green-soft); color: var(--green-dark); }
    .wa-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; border-radius: 12px; background: var(--amber-soft); color: var(--amber); font-size: 0.88rem; }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: #e0a020; animation: pulse 1.8s infinite; }
    .wa .btn { align-self: flex-start; }
    .bot-text { margin-top: 0.7rem; }

    .grid-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; }
    .activity, .pending { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .activity li { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0; border-top: 1px solid var(--surface-2); }
    .activity li:first-child { border-top: none; }
    .act-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; }
    .act-icon.mensaje { background: var(--surface-2); color: var(--text-2); }
    .act-icon.lead { background: var(--green-soft); color: var(--green-dark); }
    .act-icon.humano { background: var(--amber-soft); color: var(--amber); }
    .act-title { font-size: 0.86rem; }
    .act-text { font-size: 0.82rem; color: var(--text-2); }
    .pending a { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0.5rem; border-radius: 12px; }
    .pending a:hover { background: var(--bg); }
    .pending strong { font-size: 0.9rem; }
    .unread { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 99px; background: var(--green); color: #fff; font-size: 0.74rem; font-weight: 700; display: grid; place-items: center; }

    @media (max-width: 1280px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 1024px) { .grid-main { grid-template-columns: minmax(0, 1fr); } .side-col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
    @media (max-width: 760px) { .grid-two, .side-col { grid-template-columns: minmax(0, 1fr); } .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; } .kpi-value { font-size: 1.5rem; } }
  `],
})
export class DashboardPage {
  analytics = inject(AnalyticsService);
  private businessSvc = inject(BusinessService);
  private assistantSvc = inject(AssistantService);
  private conversations = inject(ConversationsService);
  private toast = inject(ToastService);

  business = this.businessSvc.business;
  assistant = this.assistantSvc.config;
  actIcon = { mensaje: 'chat', lead: 'target', humano: 'headset', resuelta: 'check' } as const;

  weekTotal = computed(() => this.analytics.conversationsPerDay().reduce((n, p) => n + p.value, 0));
  pending = computed(() => this.conversations.conversations().filter((c) => c.status === 'humano'));

  cards = computed(() => {
    const k = this.analytics.kpis();
    return [
      { label: 'Conversaciones recibidas', value: k.received, hint: `${k.clientMessages} mensajes de clientes`, icon: 'chats', tone: 'ink', link: '/app/conversaciones' },
      { label: 'Conversaciones atendidas', value: k.attended, hint: 'Con respuesta del asistente o del equipo', icon: 'check-circle', tone: 'green', link: '' },
      { label: 'Clientes potenciales', value: k.leads, hint: `${k.leadsFromBot} captados por el asistente`, icon: 'target', tone: 'violet', link: '/app/clientes' },
      { label: 'Respuestas automáticas', value: k.autoAnswered, hint: 'Preguntas resueltas sin una persona', icon: 'spark', tone: 'blue', link: '/app/analiticas' },
      { label: 'Pendientes de una persona', value: k.pending, hint: 'Transferidas al equipo', icon: 'headset', tone: 'amber', link: '/app/conversaciones' },
      { label: 'Tasa de automatización', value: `${k.automationRate} %`, hint: 'Mensajes resueltos por el asistente', icon: 'bolt', tone: 'green', link: '' },
    ];
  });

  lastText(id: string): string {
    const c = this.conversations.byId(id);
    return c?.messages.filter((m) => m.author === 'cliente').at(-1)?.text ?? '';
  }

  toggleBot(): void {
    const on = !this.assistant().botEnabled;
    this.assistantSvc.setBotEnabled(on);
    this.toast.info(on ? 'Asistente activado' : 'Asistente en pausa', on ? 'Responderá automáticamente en el simulador.' : 'Los mensajes nuevos quedarán pendientes de una persona.');
  }
}
