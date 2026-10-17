import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LEAD_STATUSES, LeadsService, leadStatusLabel } from '../../core/services/leads.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { Lead, LeadStatus } from '../../core/models';
import { extractPhone } from '../../core/bot/text';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { ModalComponent } from '../../shared/modal.component';
import { LongDatePipe, PhonePipe, WhenPipe } from '../../shared/format';

@Component({
  selector: 'w-leads',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, IconComponent, AvatarComponent, ModalComponent, PhonePipe, WhenPipe, LongDatePipe],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Clientes potenciales</h1>
        <p>Personas que mostraron interés de compra. El asistente las registra con su nombre y teléfono para que tu equipo cierre la venta.</p>
      </div>
      <div class="actions">
        <span class="demo-tag"><w-icon name="info" [size]="14" /> Contactos ficticios</span>
        <button class="btn btn-primary" type="button" (click)="openNew()"><w-icon name="user-plus" [size]="17" /> Registrar</button>
      </div>
    </div>

    <section class="funnel">
      @for (s of byStatus(); track s.id) {
        <button type="button" class="stage" [class.on]="status() === s.id" (click)="status.set(status() === s.id ? '' : s.id)">
          <span class="stage-label"><i [class]="'dot ' + s.id"></i>{{ s.label }}</span>
          <strong>{{ s.count }}</strong>
        </button>
      }
    </section>

    <section class="card table-card">
      <div class="toolbar">
        <div class="input-icon search"><w-icon name="search" [size]="17" /><input class="input" type="search" placeholder="Buscar por nombre, teléfono o interés" [(ngModel)]="query" aria-label="Buscar clientes potenciales" /></div>
        <select class="select st" [ngModel]="status()" (ngModelChange)="status.set($event)" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          @for (s of statuses; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
        </select>
      </div>

      @if (visible().length) {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th>Interés</th><th class="hide-md">Origen</th><th class="hide-sm">Captado</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (l of visible(); track l.id) {
                <tr class="clickable" (click)="openDetail(l.id)">
                  <td><div class="row"><w-avatar [name]="l.name" [size]="36" /><div><strong>{{ l.name }}</strong><div class="small faint">{{ l.phone | phone }}</div></div></div></td>
                  <td class="interest">{{ l.interest }}</td>
                  <td class="hide-md"><span class="source">@if (l.conversationId) { <w-icon name="spark" [size]="13" /> } {{ l.source }}</span></td>
                  <td class="hide-sm faint small">{{ l.createdAt | when: true }}</td>
                  <td (click)="$event.stopPropagation()">
                    <select class="status-select" [class]="'status-select ' + l.status" [ngModel]="l.status" (ngModelChange)="setStatus(l, $event)" [attr.aria-label]="'Estado de ' + l.name">
                      @for (s of statuses; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
                    </select>
                  </td>
                  <td class="tr"><w-icon name="chevron-right" [size]="16" /></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">
          <div class="empty-icon"><w-icon name="target" /></div>
          @if (leads.leads().length) { <h3>Sin resultados</h3><p>No hay clientes potenciales con esos filtros.</p> }
          @else { <h3>Aún no hay clientes potenciales</h3><p>Prueba en el simulador escribiendo «quiero pedir…» y deja un nombre y un teléfono: el asistente lo registrará aquí.</p><a class="btn btn-primary btn-sm" routerLink="/app/conversaciones">Ir al simulador</a> }
        </div>
      }
    </section>

    @if (detail(); as l) {
      <w-modal [title]="l.name" [subtitle]="'Cliente potencial · ' + l.source" [wide]="true" (closed)="closeDetail()">
        <div class="detail">
          <div class="d-main">
            <dl class="facts">
              <div><dt>Teléfono</dt><dd>{{ l.phone | phone }}</dd></div>
              <div><dt>Interés</dt><dd>{{ l.interest }}</dd></div>
              <div><dt>Captado</dt><dd>{{ l.createdAt | longDate }}</dd></div>
              <div><dt>Origen</dt><dd>{{ l.source }}</dd></div>
            </dl>

            <div class="field">
              <span class="label">Estado comercial</span>
              <div class="status-pick">
                @for (s of statuses; track s.id) {
                  <button type="button" [class]="'pick ' + s.id" [class.on]="l.status === s.id" (click)="setStatus(l, s.id)">{{ s.label }}</button>
                }
              </div>
            </div>

            <div class="field">
              <label for="note">Nota de seguimiento</label>
              <textarea id="note" class="textarea" rows="3" [(ngModel)]="note" maxlength="300" placeholder="Ej: Prefiere que lo llamen después de las 5 p. m."></textarea>
              <div class="row"><button class="btn btn-ghost btn-sm" type="button" [disabled]="!note.trim() || note.trim() === l.notes" (click)="saveNote(l)">Guardar nota</button></div>
            </div>

            <div class="d-actions">
              @if (l.conversationId) { <a class="btn btn-ghost btn-sm" [routerLink]="'/app/conversaciones'" [queryParams]="{ chat: l.conversationId }"><w-icon name="chat" [size]="16" /> Ver conversación</a> }
              <span class="btn btn-ghost btn-sm disabled" title="Disponible cuando se conecte WhatsApp Business Platform"><w-icon name="send" [size]="16" /> Escribir por WhatsApp · requiere integración</span>
              <button class="btn btn-quiet btn-sm danger" type="button" (click)="remove(l)"><w-icon name="trash" [size]="16" /> Eliminar</button>
            </div>
          </div>
          <div class="d-side">
            <h4>Historial</h4>
            <ol class="timeline">
              @for (h of history(l); track h.at + h.text) {
                <li><span class="t-dot"></span><div><p>{{ h.text }}</p><span class="faint tiny">{{ h.at | longDate }}</span></div></li>
              }
            </ol>
          </div>
        </div>
      </w-modal>
    }

    @if (newOpen()) {
      <w-modal title="Registrar cliente potencial" subtitle="Para contactos que llegan por otros canales (llamada, local, redes)." (closed)="newOpen.set(false)">
        <form id="leadNew" class="stack" [formGroup]="form" (ngSubmit)="create()">
          <div class="field"><label for="n-name">Nombre</label><input id="n-name" class="input" formControlName="name" maxlength="50" [class.invalid]="bad('name')" />
            @if (bad('name')) { <span class="error-text">Escribe el nombre (mínimo 3 caracteres).</span> }</div>
          <div class="field"><label for="n-phone">Teléfono</label><input id="n-phone" class="input" formControlName="phone" inputmode="tel" placeholder="300 000 0000" [class.invalid]="bad('phone')" />
            @if (bad('phone')) { <span class="error-text">Celular colombiano de 10 dígitos.</span> }<span class="hint">Usa datos ficticios: la demo guarda la información en este navegador.</span></div>
          <div class="field"><label for="n-int">Producto o servicio de interés</label>
            <select id="n-int" class="select" formControlName="productId">
              <option value="">Otro / información general</option>
              @for (p of catalog.products(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
          </div>
          @if (!form.value.productId) {
            <div class="field"><label for="n-other">Describe el interés</label><input id="n-other" class="input" formControlName="other" maxlength="80" placeholder="Ej: Cotización para evento" [class.invalid]="bad('other')" />
              @if (bad('other')) { <span class="error-text">Describe qué le interesa.</span> }</div>
          }
          <div class="field"><label for="n-notes">Notas (opcional)</label><textarea id="n-notes" class="textarea" rows="2" formControlName="notes" maxlength="300"></textarea></div>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="newOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="leadNew">Registrar</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    .funnel { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.7rem; margin-bottom: 1rem; }
    .stage { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; padding: 0.9rem 1rem; border-radius: 18px; background: var(--surface); border: 1px solid var(--line); text-align: left; transition: all 0.2s ease; }
    .stage:hover { border-color: var(--line-strong); }
    .stage.on { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
    .stage-label { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--text-2); font-weight: 500; }
    .stage strong { font-family: var(--display); font-size: 1.6rem; letter-spacing: -0.04em; line-height: 1; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.nuevo { background: var(--blue); } .dot.contactado { background: var(--violet); } .dot.interesado { background: #e0a020; } .dot.convertido { background: var(--green); } .dot.descartado { background: var(--text-3); }
    .table-card { padding: 0; overflow: hidden; }
    .toolbar { display: flex; gap: 0.6rem; flex-wrap: wrap; padding: 1rem; border-bottom: 1px solid var(--surface-2); }
    .search { flex: 1; min-width: 220px; }
    .search .input, .st { border-radius: 999px; }
    .st { width: 200px; }
    .interest { max-width: 240px; }
    .source { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; color: var(--text-2); }
    .source w-icon { color: var(--green-dark); }
    .tr { text-align: right; color: var(--text-3); }
    .status-select { height: 30px; padding: 0 1.8rem 0 0.7rem; border-radius: 999px; border: none; font-size: 0.78rem; font-weight: 600; cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.65rem center; }
    .status-select.nuevo { background-color: var(--blue-soft); color: var(--blue); }
    .status-select.contactado { background-color: var(--violet-soft); color: var(--violet); }
    .status-select.interesado { background-color: var(--amber-soft); color: var(--amber); }
    .status-select.convertido { background-color: var(--green-soft); color: var(--green-dark); }
    .status-select.descartado { background-color: var(--surface-2); color: var(--text-2); }
    .detail { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 1.5rem; }
    .d-main { display: flex; flex-direction: column; gap: 1.2rem; }
    .facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; padding: 1rem; border-radius: 16px; background: var(--bg); }
    .facts dt { font-size: 0.76rem; color: var(--text-3); }
    .facts dd { margin: 0.15rem 0 0; font-size: 0.9rem; font-weight: 500; }
    .status-pick { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .pick { height: 34px; padding: 0 0.9rem; border-radius: 999px; border: 1px solid var(--line-strong); font-size: 0.82rem; font-weight: 600; color: var(--text-2); }
    .pick.on.nuevo { background: var(--blue-soft); color: var(--blue); border-color: transparent; }
    .pick.on.contactado { background: var(--violet-soft); color: var(--violet); border-color: transparent; }
    .pick.on.interesado { background: var(--amber-soft); color: var(--amber); border-color: transparent; }
    .pick.on.convertido { background: var(--green-soft); color: var(--green-dark); border-color: transparent; }
    .pick.on.descartado { background: var(--surface-3); color: var(--text); border-color: transparent; }
    .d-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--surface-2); }
    .disabled { opacity: 0.55; cursor: not-allowed; }
    .danger { color: var(--red); }
    .d-side h4 { margin-bottom: 0.8rem; }
    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.9rem; position: relative; }
    .timeline li { display: flex; gap: 0.7rem; position: relative; }
    .timeline li:not(:last-child)::after { content: ''; position: absolute; left: 4px; top: 14px; bottom: -14px; width: 2px; background: var(--surface-3); }
    .t-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); margin-top: 5px; flex-shrink: 0; }
    .timeline p { font-size: 0.84rem; }
    @media (max-width: 1000px) { .funnel { grid-template-columns: repeat(3, minmax(0, 1fr)); } .hide-md { display: none; } }
    @media (max-width: 720px) { .detail { grid-template-columns: 1fr; } .facts { grid-template-columns: 1fr; } .st { width: 100%; } }
    @media (max-width: 600px) { .funnel { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hide-sm { display: none; } .interest { max-width: 120px; } }
  `],
})
export class LeadsPage {
  leads = inject(LeadsService);
  catalog = inject(CatalogService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  statuses = LEAD_STATUSES;
  status = signal<LeadStatus | ''>('');
  private q = signal('');
  get query() { return this.q(); } set query(v: string) { this.q.set(v); }

  byStatus = computed(() => LEAD_STATUSES.map((s) => ({ ...s, count: this.leads.leads().filter((l) => l.status === s.id).length })));
  visible = computed(() => {
    const q = this.q().trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return this.leads.leads().filter((l) =>
      (!this.status() || l.status === this.status()) &&
      (!q || l.name.toLowerCase().includes(q) || l.interest.toLowerCase().includes(q) || (!!digits && l.phone.includes(digits))));
  });

  private detailId = signal<string | null>(null);
  detail = computed(() => (this.detailId() ? this.leads.byId(this.detailId()!) ?? null : null));
  note = '';

  newOpen = signal(false);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, (c: { value: string }) => (extractPhone(c.value ?? '') ? null : { phone: true })]],
    productId: [''],
    other: [''],
    notes: [''],
  });

  constructor() {
    this.route.queryParamMap.subscribe((p) => {
      const id = p.get('lead');
      if (id && this.leads.byId(id)) this.openDetail(id, false);
    });
  }

  openDetail(id: string, updateUrl = true): void {
    this.detailId.set(id);
    this.note = this.leads.byId(id)?.notes ?? '';
    if (updateUrl) this.router.navigate([], { queryParams: { lead: id }, replaceUrl: true });
  }

  closeDetail(): void {
    this.detailId.set(null);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  history(l: Lead) { return [...l.history].reverse(); }

  setStatus(l: Lead, s: LeadStatus): void {
    if (l.status === s) return;
    this.leads.setStatus(l.id, s);
    this.toast.success(`${l.name}: ${leadStatusLabel(s)}`);
  }

  saveNote(l: Lead): void {
    this.leads.addNote(l.id, this.note);
    this.toast.success('Nota guardada');
  }

  async remove(l: Lead): Promise<void> {
    if (await this.confirm.ask({ title: `¿Eliminar a ${l.name}?`, text: 'Se borrará el registro y su historial. La conversación, si existe, se conserva.', confirmLabel: 'Eliminar', danger: true })) {
      this.leads.remove(l.id);
      this.closeDetail();
      this.toast.success('Cliente potencial eliminado');
    }
  }

  openNew(): void {
    this.form.reset({ name: '', phone: '', productId: '', other: '', notes: '' });
    this.newOpen.set(true);
  }

  bad(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  create(): void {
    const v = this.form.getRawValue();
    const otherCtrl = this.form.controls.other;
    otherCtrl.setErrors(!v.productId && !v.other.trim() ? { required: true } : null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const product = this.catalog.products().find((p) => p.id === v.productId);
    const id = this.leads.create({ name: v.name.trim(), phone: extractPhone(v.phone)!, interest: product?.name ?? v.other.trim(), productId: product?.id, notes: v.notes.trim() });
    this.newOpen.set(false);
    this.toast.success('Cliente potencial registrado', v.name.trim());
    this.openDetail(id);
  }
}
