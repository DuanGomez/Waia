import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../../core/services/assistant.service';
import { AutomationsService, triggerLabel } from '../../core/services/automations.service';
import { BusinessService } from '../../core/services/business.service';
import { DemoStore } from '../../core/state/demo.store';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { AssistantConfig, Faq, Tone } from '../../core/models';
import { respond } from '../../core/bot/engine';
import { formatHours, formatPhone } from '../../core/bot/text';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

type Tab = 'comportamiento' | 'faq' | 'reglas';

const TONES: { id: Tone; label: string; sample: string }[] = [
  { id: 'cercano', label: 'Cercano', sample: '¡Claro! ¿En qué te puedo ayudar?' },
  { id: 'profesional', label: 'Profesional', sample: 'Con gusto. ¿En qué podemos ayudarle?' },
  { id: 'entusiasta', label: 'Entusiasta', sample: '¡Genial! ¿En qué te ayudo hoy?' },
];

@Component({
  selector: 'w-assistant',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Configuración del asistente</h1>
        <p>Define cómo habla {{ config().assistantName }} y qué responde. Los cambios se aplican de inmediato en el simulador.</p>
      </div>
      <div class="actions">
        <label class="bot-switch" [class.off]="!config().botEnabled">
          <span><strong>{{ config().botEnabled ? 'Asistente activo' : 'Asistente en pausa' }}</strong><small>En la simulación</small></span>
          <button class="switch" type="button" role="switch" [class.on]="config().botEnabled" [attr.aria-checked]="config().botEnabled" (click)="toggleBot()" aria-label="Activar o pausar el asistente"></button>
        </label>
      </div>
    </div>

    <div class="seg tabs" role="tablist">
      <button type="button" role="tab" [class.active]="tab() === 'comportamiento'" (click)="tab.set('comportamiento')">Comportamiento</button>
      <button type="button" role="tab" [class.active]="tab() === 'faq'" (click)="tab.set('faq')">Preguntas frecuentes <em>{{ faqs().length }}</em></button>
      <button type="button" role="tab" [class.active]="tab() === 'reglas'" (click)="tab.set('reglas')">Reglas <em>{{ automations.activeCount() }}/{{ automations.automations().length }}</em></button>
    </div>

    <div class="layout">
      <div class="main-col">
        @switch (tab()) {
          @case ('comportamiento') {
            <form class="stack" [formGroup]="form" (ngSubmit)="save()">
              <section class="card">
                <div class="card-head"><div><h3>Identidad</h3><p>Cómo se presenta el asistente a los clientes</p></div></div>
                <div class="form-grid">
                  <div class="field">
                    <label for="a-name">Nombre del asistente</label>
                    <input id="a-name" class="input" formControlName="assistantName" maxlength="24" [class.invalid]="invalid('assistantName')" />
                    @if (invalid('assistantName')) { <span class="error-text">Escribe un nombre de 2 a 24 caracteres.</span> }
                  </div>
                  <div class="field">
                    <label>Negocio</label>
                    <div class="readonly"><strong>{{ business().name }}</strong><a routerLink="/app/negocio">Editar</a></div>
                  </div>
                  <div class="field full">
                    <label>Tono de comunicación</label>
                    <div class="tones">
                      @for (t of tones; track t.id) {
                        <button type="button" class="tone" [class.on]="form.value.tone === t.id" (click)="form.controls.tone.setValue(t.id); form.markAsDirty()">
                          <strong>{{ t.label }}</strong><span>«{{ t.sample }}»</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </section>

              <section class="card">
                <div class="card-head"><div><h3>Mensajes</h3><p>Puedes usar variables: <code>{{ '{' }}negocio{{ '}' }}</code> <code>{{ '{' }}asistente{{ '}' }}</code> <code>{{ '{' }}telefono{{ '}' }}</code> <code>{{ '{' }}direccion{{ '}' }}</code></p></div></div>
                <div class="stack">
                  @for (m of messageFields; track m.key) {
                    <div class="field">
                      <label [for]="'m-' + m.key">{{ m.label }}</label>
                      <textarea [id]="'m-' + m.key" class="textarea" rows="2" [formControlName]="m.key" maxlength="400" [class.invalid]="invalid(m.key)"></textarea>
                      <span class="hint">{{ m.hint }}</span>
                      @if (invalid(m.key)) { <span class="error-text">Este mensaje es obligatorio (mínimo 10 caracteres).</span> }
                    </div>
                  }
                </div>
              </section>

              <div class="save-bar" [class.show]="form.dirty">
                <span>Tienes cambios sin guardar</span>
                <button class="btn btn-ghost btn-sm" type="button" (click)="reset()">Descartar</button>
                <button class="btn btn-green btn-sm" type="submit">Guardar cambios</button>
              </div>
            </form>
          }

          @case ('faq') {
            <section class="card">
              <div class="card-head">
                <div><h3>Preguntas frecuentes</h3><p>El asistente responde cuando el mensaje contiene alguna de las palabras clave.</p></div>
                <button class="btn btn-primary btn-sm" type="button" (click)="openFaq()"><w-icon name="plus" [size]="16" /> Agregar</button>
              </div>
              @if (faqs().length) {
                <ul class="faqs">
                  @for (f of faqs(); track f.id) {
                    <li [class.off]="!f.enabled">
                      <div class="grow">
                        <strong>{{ f.question }}</strong>
                        <p class="small muted">{{ f.answer }}</p>
                        <div class="kw">@for (k of f.keywords.slice(0, 6); track k) { <span>{{ k }}</span> } @if (f.keywords.length > 6) { <span>+{{ f.keywords.length - 6 }}</span> }</div>
                      </div>
                      <div class="faq-actions">
                        <button class="switch" type="button" role="switch" [class.on]="f.enabled" [attr.aria-checked]="f.enabled" (click)="assistant.toggleFaq(f.id)" [attr.aria-label]="'Activar ' + f.question"></button>
                        <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="openFaq(f)" aria-label="Editar"><w-icon name="edit" [size]="16" /></button>
                        <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="removeFaq(f)" aria-label="Eliminar"><w-icon name="trash" [size]="16" /></button>
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty"><div class="empty-icon"><w-icon name="doc" /></div><h3>Sin preguntas frecuentes</h3><p>Agrega las preguntas que más te hacen tus clientes y el asistente las responderá solo.</p><button class="btn btn-primary btn-sm" type="button" (click)="openFaq()">Agregar la primera</button></div>
              }
            </section>
          }

          @case ('reglas') {
            <section class="card">
              <div class="card-head">
                <div><h3>Reglas básicas</h3><p>Activa o desactiva lo que el asistente hace por su cuenta.</p></div>
                <a class="btn btn-ghost btn-sm" routerLink="/app/automatizaciones">Administrar <w-icon name="arrow-right" [size]="15" /></a>
              </div>
              <ul class="rules">
                @for (a of automations.automations(); track a.id) {
                  <li>
                    <span class="rule-icon" [class.on]="a.active"><w-icon name="bolt" [size]="17" /></span>
                    <div class="grow"><strong>{{ a.name }}</strong><p class="small faint">{{ trigger(a.trigger) }} · {{ a.runs }} ejecuciones</p></div>
                    <button class="switch" type="button" role="switch" [class.on]="a.active" [attr.aria-checked]="a.active" (click)="automations.toggle(a.id)" [attr.aria-label]="'Activar ' + a.name"></button>
                  </li>
                }
              </ul>
            </section>
          }
        }
      </div>

      <aside class="side-col">
        <section class="card tester">
          <div class="card-head"><div><h3>Prueba rápida</h3><p>Escribe una pregunta y mira qué respondería</p></div></div>
          <form class="row" (ngSubmit)="test()">
            <input class="input" name="probe" [(ngModel)]="probe" (keydown.enter)="$event.preventDefault(); probe = $any($event.target).value; test()" placeholder="Ej: ¿hacen domicilios?" aria-label="Pregunta de prueba" />
            <button class="btn btn-primary btn-icon" type="submit" [disabled]="!probe.trim()" aria-label="Probar"><w-icon name="send" [size]="17" /></button>
          </form>
          <div class="examples">@for (e of examples(); track e) { <button type="button" (click)="probe = e; test()">{{ e }}</button> }</div>
          @if (answer(); as a) {
            <div class="answer fade-in">
              <span class="tag"><w-icon name="spark" [size]="12" /> {{ config().assistantName }} · intención: {{ a.intent }}</span>
              @for (r of a.replies; track $index) { <p>{{ r }}</p> }
              @if (a.note) { <span class="note">{{ a.note }}</span> }
            </div>
          }
        </section>

        <section class="card">
          <div class="card-head"><div><h3>Datos que usa el asistente</h3><p>Se editan en Personalización</p></div><a class="btn btn-quiet btn-sm" routerLink="/app/negocio">Editar</a></div>
          <dl class="facts">
            <div><dt><w-icon name="store" [size]="15" /> Negocio</dt><dd>{{ business().name }}</dd></div>
            <div><dt><w-icon name="pin" [size]="15" /> Dirección</dt><dd>{{ business().address }}, {{ business().city }}</dd></div>
            <div><dt><w-icon name="phone" [size]="15" /> Teléfono</dt><dd>{{ phone() }}</dd></div>
            <div class="col"><dt><w-icon name="clock" [size]="15" /> Horario</dt><dd>@for (h of hours(); track h) { <span>{{ h }}</span> }</dd></div>
          </dl>
        </section>
      </aside>
    </div>

    @if (faqModal()) {
      <w-modal [title]="editingFaq() ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente'" subtitle="El asistente usará esta respuesta cuando detecte las palabras clave." (closed)="faqModal.set(false)">
        <form id="faqForm" class="stack" [formGroup]="faqForm" (ngSubmit)="saveFaq()">
          <div class="field">
            <label for="f-q">Pregunta</label>
            <input id="f-q" class="input" formControlName="question" placeholder="Ej: ¿Hacen domicilios?" maxlength="120" [class.invalid]="faqInvalid('question')" />
            @if (faqInvalid('question')) { <span class="error-text">Escribe la pregunta (mínimo 5 caracteres).</span> }
          </div>
          <div class="field">
            <label for="f-k">Palabras clave</label>
            <input id="f-k" class="input" formControlName="keywords" placeholder="domicilio, domicilios, envío" [class.invalid]="faqInvalid('keywords')" />
            <span class="hint">Sepáralas con comas. No importan mayúsculas ni tildes.</span>
            @if (faqInvalid('keywords')) { <span class="error-text">Agrega al menos una palabra clave.</span> }
          </div>
          <div class="field">
            <label for="f-a">Respuesta</label>
            <textarea id="f-a" class="textarea" rows="4" formControlName="answer" maxlength="600" [class.invalid]="faqInvalid('answer')"></textarea>
            @if (faqInvalid('answer')) { <span class="error-text">Escribe la respuesta (mínimo 10 caracteres).</span> }
          </div>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="faqModal.set(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="faqForm">{{ editingFaq() ? 'Guardar' : 'Agregar' }}</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    .bot-switch { display: flex; align-items: center; gap: 0.9rem; padding: 0.55rem 0.6rem 0.55rem 1rem; border-radius: 16px; background: var(--green-soft); }
    .bot-switch.off { background: var(--red-soft); }
    .bot-switch span { display: flex; flex-direction: column; }
    .bot-switch strong { font-size: 0.86rem; }
    .bot-switch small { font-size: 0.74rem; color: var(--text-2); }
    .tabs { margin-bottom: 1.1rem; max-width: 100%; overflow-x: auto; }
    .tabs em { font-style: normal; font-size: 0.72rem; color: var(--text-3); margin-left: 0.25rem; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 1rem; align-items: start; }
    .side-col { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 86px; }
    .readonly { display: flex; align-items: center; justify-content: space-between; height: 44px; padding: 0 0.95rem; border-radius: var(--r-md); background: var(--bg); border: 1px solid var(--line); font-size: 0.92rem; }
    .readonly a { font-size: 0.82rem; color: var(--green-dark); font-weight: 600; }
    .tones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .tone { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.8rem 0.9rem; border-radius: 14px; border: 1px solid var(--line-strong); text-align: left; transition: all 0.15s ease; }
    .tone strong { font-size: 0.88rem; }
    .tone span { font-size: 0.78rem; color: var(--text-3); }
    .tone:hover { border-color: var(--text-3); }
    .tone.on { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); background: var(--bg); }
    code { font-size: 0.76rem; padding: 0.1rem 0.35rem; border-radius: 6px; background: var(--surface-2); color: var(--text); }
    .save-bar { position: sticky; bottom: 1rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.6rem 0.6rem 1.1rem; border-radius: 999px; background: var(--ink); color: #fff; box-shadow: var(--shadow-lg); opacity: 0; transform: translateY(12px); pointer-events: none; transition: all 0.3s var(--ease-out); }
    .save-bar.show { opacity: 1; transform: none; pointer-events: auto; }
    .save-bar span { flex: 1; font-size: 0.86rem; }
    .save-bar .btn-ghost { background: transparent; color: #fff; border-color: rgba(255, 255, 255, 0.25); }
    .faqs, .rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .faqs li { display: flex; gap: 1rem; padding: 1rem 0; border-top: 1px solid var(--surface-2); }
    .faqs li:first-child { border-top: none; padding-top: 0.2rem; }
    .faqs li.off .grow { opacity: 0.5; }
    .faqs strong { font-size: 0.92rem; }
    .faqs p { margin-top: 0.25rem; }
    .kw { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
    .kw span { font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 99px; background: var(--surface-2); color: var(--text-2); }
    .faq-actions { display: flex; align-items: flex-start; gap: 0.25rem; }
    .rules li { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem 0; border-top: 1px solid var(--surface-2); }
    .rules li:first-child { border-top: none; }
    .rule-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); color: var(--text-3); }
    .rule-icon.on { background: var(--green-soft); color: var(--green-dark); }
    .rules strong { font-size: 0.9rem; }
    .tester .row .input { border-radius: 999px; }
    .examples { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.7rem; }
    .examples button { font-size: 0.74rem; padding: 0.25rem 0.6rem; border-radius: 99px; background: var(--surface-2); color: var(--text-2); }
    .examples button:hover { background: var(--green-soft); color: var(--green-dark); }
    .answer { margin-top: 0.9rem; padding: 0.8rem 0.9rem; border-radius: 16px 16px 16px 6px; background: #dff3e8; display: flex; flex-direction: column; gap: 0.45rem; }
    .answer p { white-space: pre-line; font-size: 0.86rem; }
    .tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 600; color: var(--green-dark); }
    .note { font-size: 0.74rem; color: var(--text-2); }
    .facts { margin: 0; display: flex; flex-direction: column; gap: 0.7rem; }
    .facts div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.84rem; }
    .facts div.col { flex-direction: column; gap: 0.35rem; }
    .facts dt { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--text-3); white-space: nowrap; }
    .facts dd { margin: 0; text-align: right; font-weight: 500; }
    .facts .col dd { text-align: left; display: flex; flex-direction: column; gap: 0.15rem; color: var(--text-2); font-weight: 400; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } .side-col { position: static; } }
    @media (max-width: 640px) { .tones { grid-template-columns: 1fr; } .faqs li { flex-direction: column; gap: 0.6rem; } }
  `],
})
export class AssistantPage {
  assistant = inject(AssistantService);
  automations = inject(AutomationsService);
  private businessSvc = inject(BusinessService);
  private store = inject(DemoStore);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);

  config = this.assistant.config;
  faqs = this.assistant.faqs;
  business = this.businessSvc.business;
  tones = TONES;
  tab = signal<Tab>('comportamiento');
  trigger = triggerLabel;
  phone = computed(() => formatPhone(this.business().phone));
  hours = computed(() => formatHours(this.business().hours));

  messageFields: { key: keyof AssistantConfig & string; label: string; hint: string }[] = [
    { key: 'welcomeMessage', label: 'Mensaje de bienvenida', hint: 'Se envía en el primer mensaje de cada conversación.' },
    { key: 'farewellMessage', label: 'Mensaje de despedida', hint: 'Cuando el cliente se despide.' },
    { key: 'fallbackMessage', label: 'Cuando no entiende', hint: 'Va seguido de las opciones disponibles.' },
    { key: 'handoffMessage', label: 'Al derivar a una persona', hint: 'Cuando el cliente pide un asesor o el asistente no logra ayudar.' },
    { key: 'leadConfirmationMessage', label: 'Al registrar un pedido o reserva', hint: 'Variables extra: {nombre}, {producto}, {telefono_cliente}.' },
  ];

  form = this.fb.nonNullable.group({
    assistantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(24)]],
    tone: ['cercano' as Tone, Validators.required],
    welcomeMessage: ['', [Validators.required, Validators.minLength(10)]],
    farewellMessage: ['', [Validators.required, Validators.minLength(10)]],
    fallbackMessage: ['', [Validators.required, Validators.minLength(10)]],
    handoffMessage: ['', [Validators.required, Validators.minLength(10)]],
    leadConfirmationMessage: ['', [Validators.required, Validators.minLength(10)]],
  });

  faqModal = signal(false);
  editingFaq = signal<Faq | null>(null);
  faqForm = this.fb.nonNullable.group({
    question: ['', [Validators.required, Validators.minLength(5)]],
    keywords: ['', [Validators.required, Validators.pattern(/\S/)]],
    answer: ['', [Validators.required, Validators.minLength(10)]],
  });

  probe = '';
  answer = signal<{ intent: string; replies: string[]; note: string } | null>(null);
  examples = computed(() => [this.faqs()[0]?.question, '¿A qué hora abren?', 'Quiero hablar con alguien'].filter((x): x is string => !!x));

  constructor() {
    // Recargar el formulario al cambiar de perfil o al restablecer (si no hay cambios pendientes).
    effect(() => {
      const c = this.config();
      if (!this.form.dirty) this.form.reset({ ...c });
    });
    effect(() => { this.store.activeProfile(); untracked(() => { this.form.reset({ ...this.config() }); this.answer.set(null); }); });
  }

  invalid(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  faqInvalid(key: string): boolean {
    const c = this.faqForm.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Revisa los campos marcados'); return; }
    this.assistant.save({ ...this.config(), ...this.form.getRawValue() });
    this.form.markAsPristine();
    this.toast.success('Asistente actualizado', 'El simulador ya usa la nueva configuración.');
  }

  reset(): void { this.form.reset({ ...this.config() }); }

  toggleBot(): void {
    const on = !this.config().botEnabled;
    this.assistant.setBotEnabled(on);
    this.toast.info(on ? 'Asistente activado' : 'Asistente en pausa', on ? 'Responderá en el simulador.' : 'Los mensajes nuevos quedarán pendientes de una persona.');
  }

  openFaq(f?: Faq): void {
    this.editingFaq.set(f ?? null);
    this.faqForm.reset({ question: f?.question ?? '', keywords: f?.keywords.join(', ') ?? '', answer: f?.answer ?? '' });
    this.faqModal.set(true);
  }

  saveFaq(): void {
    if (this.faqForm.invalid) { this.faqForm.markAllAsTouched(); return; }
    const v = this.faqForm.getRawValue();
    const keywords = [...new Set(v.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean))];
    const draft = { question: v.question.trim(), keywords, answer: v.answer.trim(), enabled: this.editingFaq()?.enabled ?? true };
    const editing = this.editingFaq();
    if (editing) this.assistant.updateFaq(editing.id, draft); else this.assistant.createFaq(draft);
    this.faqModal.set(false);
    this.toast.success(editing ? 'Pregunta actualizada' : 'Pregunta agregada', 'Pruébala en el simulador o en la prueba rápida.');
  }

  async removeFaq(f: Faq): Promise<void> {
    if (await this.confirm.ask({ title: '¿Eliminar esta pregunta?', text: `«${f.question}» dejará de responderse automáticamente.`, confirmLabel: 'Eliminar', danger: true })) {
      this.assistant.removeFaq(f.id);
      this.toast.success('Pregunta eliminada');
    }
  }

  /** Ejecuta el motor real sobre una conversación vacía, sin guardar nada. */
  test(): void {
    const text = this.probe.trim();
    if (!text) return;
    const ws = this.store.workspace();
    const res = respond({ business: ws.business, assistant: ws.assistant, faqs: ws.faqs, products: ws.products, automations: ws.automations },
      { messages: [{ id: 'x', author: 'bot', text: '', at: new Date().toISOString() }], contactName: 'Cliente de prueba' }, text);
    const notes: string[] = [];
    if (!ws.assistant.botEnabled) notes.push('Nota: el asistente está en pausa; en el simulador no respondería.');
    if (res.handoff) notes.push('La conversación pasaría a una persona.');
    if (res.leadFlow) notes.push('Iniciaría el registro de un pedido o reserva.');
    this.answer.set({ intent: res.intent, replies: res.replies.map((r) => r.text), note: notes.join(' ') });
  }
}
