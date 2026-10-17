import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutomationsService, TRIGGERS, triggerLabel } from '../../core/services/automations.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { Automation, AutomationTrigger } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';

const TRIGGER_ICON: Record<AutomationTrigger, string> = {
  inicio: 'chat', catalogo: 'tag', compra: 'target', humano: 'headset', horario: 'clock', ubicacion: 'pin', sin_respuesta: 'alert',
};

@Component({
  selector: 'w-automations',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Automatizaciones</h1>
        <p>Reglas que el asistente aplica solo. Cada una está conectada al simulador: si la desactivas, deja de ejecutarse.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="button" (click)="open()"><w-icon name="plus" [size]="17" /> Nueva regla</button>
      </div>
    </div>

    <section class="stats">
      <div class="stat"><strong>{{ svc.activeCount() }}</strong><span>reglas activas</span></div>
      <div class="stat"><strong>{{ totalRuns() }}</strong><span>ejecuciones en la simulación</span></div>
      <div class="stat note"><w-icon name="info" [size]="17" /><span>Acciones como enviar correos o actualizar un CRM requieren integraciones futuras y no se simulan.</span></div>
    </section>

    @if (svc.automations().length) {
      <div class="rules">
        @for (a of svc.automations(); track a.id) {
          <article class="rule fade-in" [class.off]="!a.active">
            <header>
              <span class="r-icon"><w-icon [name]="icon(a.trigger)" [size]="19" /></span>
              <div class="grow">
                <h3>{{ a.name }}</h3>
                <p class="small muted">{{ a.description }}</p>
              </div>
              <button class="switch" type="button" role="switch" [class.on]="a.active" [attr.aria-checked]="a.active" (click)="toggle(a)" [attr.aria-label]="'Activar ' + a.name"></button>
            </header>
            <ol class="flow">
              <li><span class="k">Cuando</span><span class="v">{{ label(a.trigger) }}</span></li>
              @if (a.condition) { <li><span class="k">Condición</span><span class="v">{{ a.condition }}</span></li> }
              <li><span class="k">Acción</span><span class="v">{{ a.action }}</span></li>
              <li><span class="k">Resultado</span><span class="v">{{ a.expected }}</span></li>
            </ol>
            <footer>
              <span class="badge" [class.badge-green]="a.active">{{ a.active ? 'Activa' : 'Inactiva' }}</span>
              <span class="faint small"><w-icon name="bolt" [size]="13" /> {{ a.runs }} {{ a.runs === 1 ? 'ejecución' : 'ejecuciones' }}</span>
              <span class="grow"></span>
              <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="open(a)" [attr.aria-label]="'Editar ' + a.name"><w-icon name="edit" [size]="16" /></button>
              <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="remove(a)" [attr.aria-label]="'Eliminar ' + a.name"><w-icon name="trash" [size]="16" /></button>
            </footer>
          </article>
        }
      </div>
    } @else {
      <div class="card empty"><div class="empty-icon"><w-icon name="bolt" /></div><h3>Sin reglas</h3><p>Sin automatizaciones, el asistente solo responderá preguntas frecuentes y saludos.</p><button class="btn btn-primary btn-sm" type="button" (click)="open()">Crear una regla</button></div>
    }

    <p class="foot-link faint small">¿Quieres probarlas? <a routerLink="/app/conversaciones">Abre el simulador</a> y escribe, por ejemplo, «quiero hablar con una persona».</p>

    @if (modal()) {
      <w-modal [title]="editing() ? 'Editar regla' : 'Nueva regla'" subtitle="Elige el disparador que reconoce el asistente y describe qué debe pasar." (closed)="modal.set(false)">
        <form id="autoForm" class="stack" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="r-trigger">Disparador</label>
            <select id="r-trigger" class="select" formControlName="trigger">
              @for (t of triggers; track t.id) { <option [value]="t.id">{{ t.label }}</option> }
            </select>
            <span class="hint">{{ hint() }}</span>
          </div>
          <div class="field"><label for="r-name">Nombre</label><input id="r-name" class="input" formControlName="name" maxlength="50" [class.invalid]="bad('name')" />
            @if (bad('name')) { <span class="error-text">Escribe un nombre (mínimo 3 caracteres).</span> }</div>
          <div class="field"><label for="r-desc">Descripción</label><input id="r-desc" class="input" formControlName="description" maxlength="140" [class.invalid]="bad('description')" />
            @if (bad('description')) { <span class="error-text">Describe brevemente la regla.</span> }</div>
          <div class="field"><label for="r-cond">Condición (opcional)</label><input id="r-cond" class="input" formControlName="condition" maxlength="120" placeholder="Ej: Solo en horario de atención" /></div>
          <div class="form-grid">
            <div class="field"><label for="r-act">Acción</label><input id="r-act" class="input" formControlName="action" maxlength="120" [class.invalid]="bad('action')" />
              @if (bad('action')) { <span class="error-text">Indica la acción.</span> }</div>
            <div class="field"><label for="r-exp">Resultado esperado</label><input id="r-exp" class="input" formControlName="expected" maxlength="120" [class.invalid]="bad('expected')" />
              @if (bad('expected')) { <span class="error-text">Indica el resultado.</span> }</div>
          </div>
          <label class="row small"><button class="switch" type="button" role="switch" [class.on]="form.value.active" (click)="form.controls.active.setValue(!form.value.active)"></button> Activar al guardar</label>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="modal.set(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="autoForm">{{ editing() ? 'Guardar' : 'Crear regla' }}</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: 200px 260px 1fr; gap: 0.8rem; margin-bottom: 1.1rem; }
    .stat { display: flex; flex-direction: column; gap: 0.2rem; padding: 1rem 1.1rem; border-radius: 18px; background: var(--surface); border: 1px solid var(--line); }
    .stat strong { font-family: var(--display); font-size: 1.7rem; letter-spacing: -0.04em; line-height: 1; }
    .stat span { font-size: 0.82rem; color: var(--text-2); }
    .stat.note { flex-direction: row; align-items: center; gap: 0.6rem; background: var(--bg); border-style: dashed; }
    .rules { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
    .rule { display: flex; flex-direction: column; gap: 1rem; padding: 1.2rem; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--line); transition: opacity 0.2s ease, box-shadow 0.25s ease; }
    .rule:hover { box-shadow: var(--shadow); }
    .rule.off .flow, .rule.off h3 { opacity: 0.55; }
    .rule header { display: flex; gap: 0.8rem; align-items: flex-start; }
    .r-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--green-soft); color: var(--green-dark); flex-shrink: 0; }
    .rule.off .r-icon { background: var(--surface-2); color: var(--text-3); }
    .rule h3 { font-size: 1rem; }
    .rule header p { margin-top: 0.2rem; }
    .flow { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
    .flow li { display: grid; grid-template-columns: 86px 1fr; gap: 0.7rem; padding: 0.5rem 0; border-top: 1px dashed var(--line); font-size: 0.84rem; }
    .flow .k { font-size: 0.74rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; padding-top: 2px; }
    .rule footer { display: flex; align-items: center; gap: 0.6rem; margin-top: auto; }
    .rule footer .faint { display: inline-flex; align-items: center; gap: 0.25rem; }
    .foot-link { margin-top: 1.4rem; text-align: center; }
    .foot-link a { color: var(--green-dark); font-weight: 600; }
    @media (max-width: 900px) { .stats { grid-template-columns: 1fr 1fr; } .stat.note { grid-column: 1 / -1; } }
    @media (max-width: 480px) { .rules { grid-template-columns: 1fr; } .flow li { grid-template-columns: 1fr; gap: 0.15rem; } }
  `],
})
export class AutomationsPage {
  svc = inject(AutomationsService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);

  triggers = TRIGGERS;
  label = triggerLabel;
  icon = (t: AutomationTrigger) => TRIGGER_ICON[t];
  totalRuns = computed(() => this.svc.automations().reduce((n, a) => n + a.runs, 0));

  modal = signal(false);
  editing = signal<Automation | null>(null);
  form = this.fb.nonNullable.group({
    trigger: ['catalogo' as AutomationTrigger, Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    condition: [''],
    action: ['', [Validators.required, Validators.minLength(3)]],
    expected: ['', [Validators.required, Validators.minLength(3)]],
    active: [true],
  });
  hint = () => TRIGGERS.find((t) => t.id === this.form.value.trigger)?.hint ?? '';

  bad(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  toggle(a: Automation): void {
    this.svc.toggle(a.id);
    this.toast.info(a.active ? `«${a.name}» desactivada` : `«${a.name}» activada`, a.active ? 'El asistente dejará de aplicarla en el simulador.' : 'Ya se aplica en el simulador.');
  }

  open(a?: Automation): void {
    this.editing.set(a ?? null);
    this.form.reset(a ? { ...a } : { trigger: 'catalogo', name: '', description: '', condition: '', action: '', expected: '', active: true });
    this.modal.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const draft = { ...v, name: v.name.trim(), description: v.description.trim(), condition: v.condition.trim(), action: v.action.trim(), expected: v.expected.trim() };
    const editing = this.editing();
    if (editing) this.svc.update(editing.id, draft); else this.svc.create(draft);
    this.modal.set(false);
    this.toast.success(editing ? 'Regla actualizada' : 'Regla creada', draft.name);
  }

  async remove(a: Automation): Promise<void> {
    const only = this.svc.automations().filter((x) => x.trigger === a.trigger).length === 1;
    if (await this.confirm.ask({ title: `¿Eliminar «${a.name}»?`, text: only ? `Es la única regla de «${triggerLabel(a.trigger)}»: el asistente dejará de hacer esa acción.` : 'La regla se eliminará de este negocio.', confirmLabel: 'Eliminar', danger: true })) {
      this.svc.remove(a.id);
      this.toast.success('Regla eliminada');
    }
  }
}
