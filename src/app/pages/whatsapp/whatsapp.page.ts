import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { BusinessService } from '../../core/services/business.service';
import { DemoStore } from '../../core/state/demo.store';
import { ToastService } from '../../core/ui/toast.service';
import { extractPhone, formatPhone } from '../../core/bot/text';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'w-whatsapp',
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Integración con WhatsApp</h1>
        <p>Qué se necesita para conectar Waia a WhatsApp Business Platform cuando el negocio esté listo.</p>
      </div>
    </div>

    <section class="status card">
      <span class="s-icon"><w-icon name="link" [size]="24" /></span>
      <div class="grow">
        <div class="row wrap"><h2>No conectado</h2><span class="demo-tag"><span class="pulse"></span> Modo demostración</span></div>
        <p class="muted">Esta demo funciona completa sin conexión real: las conversaciones se simulan en el navegador y ningún mensaje se envía ni se recibe por WhatsApp. No se muestran estados de conexión ficticios.</p>
      </div>
      <button class="btn btn-ghost" type="button" disabled title="Requiere el backend de producción. No disponible en la demo."><w-icon name="lock" [size]="16" /> Conectar con Meta · requiere backend</button>
    </section>

    <div class="layout">
      <div class="stack">
        <section class="card">
          <div class="card-head">
            <div><h3>Requisitos para activar la integración</h3><p>Lista de preparación. Marcarlos aquí solo sirve como seguimiento: no verifica nada con Meta.</p></div>
            <span class="badge" [class.badge-green]="done() === total()">{{ done() }}/{{ total() }}</span>
          </div>
          <div class="progress"><i [style.width.%]="(done() / total()) * 100"></i></div>
          <ul class="reqs">
            @for (r of setup().requirements; track r.id) {
              <li>
                <button type="button" class="check" [class.on]="r.done" (click)="svc.toggleRequirement(r.id)" [attr.aria-pressed]="r.done" [attr.aria-label]="'Marcar ' + r.label">
                  @if (r.done) { <w-icon name="check" [size]="14" [stroke]="2.4" /> }
                </button>
                <div><strong>{{ r.label }}</strong><p class="small faint">{{ r.detail }}</p></div>
              </li>
            }
          </ul>
        </section>

        <section class="card">
          <div class="card-head"><div><h3>Cómo funcionará en producción</h3><p>Flujo de un mensaje real una vez exista el backend</p></div></div>
          <ol class="arch">
            <li><span class="a-icon"><w-icon name="phone" [size]="18" /></span><div><strong>Cliente escribe por WhatsApp</strong><p>Al número del negocio.</p></div></li>
            <li><span class="a-icon"><w-icon name="server" [size]="18" /></span><div><strong>Meta envía el mensaje al webhook</strong><p>WhatsApp Cloud API llama al servidor de Waia por HTTPS.</p></div></li>
            <li><span class="a-icon green"><w-icon name="spark" [size]="18" /></span><div><strong>El motor de Waia decide la respuesta</strong><p>Las mismas reglas de esta demo, ejecutadas en el servidor.</p></div></li>
            <li><span class="a-icon"><w-icon name="send" [size]="18" /></span><div><strong>Waia responde por la API</strong><p>Con el token guardado de forma segura en el backend.</p></div></li>
            <li><span class="a-icon"><w-icon name="dashboard" [size]="18" /></span><div><strong>El equipo ve todo en este panel</strong><p>Conversaciones, clientes potenciales y analíticas reales.</p></div></li>
          </ol>
        </section>
      </div>

      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h3>Número comercial</h3><p>Solo referencia visual para la propuesta al cliente</p></div></div>
          <form class="stack" [formGroup]="form" (ngSubmit)="save()">
            <div class="field"><label for="w-num">Número que usará el asistente</label><input id="w-num" class="input" formControlName="businessNumber" inputmode="tel" placeholder="300 000 0000" [class.invalid]="bad('businessNumber')" />
              @if (bad('businessNumber')) { <span class="error-text">Celular de 10 dígitos que empiece por 3.</span> }
              <span class="hint">Debe ser un número que no esté activo en la app de WhatsApp del celular.</span></div>
            <div class="field"><label for="w-name">Nombre visible</label><input id="w-name" class="input" formControlName="displayName" maxlength="40" [class.invalid]="bad('displayName')" />
              @if (bad('displayName')) { <span class="error-text">Escribe el nombre que verán los clientes.</span> }</div>
            <button class="btn btn-primary" type="submit" [disabled]="!form.dirty">Guardar datos</button>
          </form>
        </section>

        <section class="card security">
          <span class="sec-icon"><w-icon name="shield" [size]="20" /></span>
          <h3>Seguridad de credenciales</h3>
          <p class="small muted">Waia nunca pide ni guarda tokens, contraseñas ni claves de Meta en el navegador. En producción vivirán cifradas en el servidor y solo el backend podrá usarlas.</p>
          <ul class="small">
            <li><w-icon name="check" [size]="14" /> Sin campos para tokens en esta demo</li>
            <li><w-icon name="check" [size]="14" /> Sin llamadas a servicios externos</li>
            <li><w-icon name="check" [size]="14" /> Costo de la demo: $0</li>
          </ul>
        </section>

        <section class="card">
          <h3>Qué requiere integración futura</h3>
          <ul class="future small muted">
            <li>Enviar y recibir mensajes reales</li>
            <li>Plantillas aprobadas para escribir primero al cliente</li>
            <li>Notificaciones al equipo cuando un chat se transfiere</li>
            <li>Varios usuarios con inicio de sesión</li>
            <li>Base de datos y respaldo de la información</li>
          </ul>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .status { display: flex; align-items: center; gap: 1.1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .s-icon { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: var(--surface-2); flex-shrink: 0; }
    .status h2 { font-size: 1.35rem; }
    .status p { margin-top: 0.35rem; max-width: 720px; font-size: 0.9rem; }
    .pulse { width: 7px; height: 7px; border-radius: 50%; background: #e0a020; animation: pulse 1.8s infinite; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 1rem; align-items: start; }
    .progress { height: 8px; border-radius: 99px; background: var(--surface-2); overflow: hidden; margin-bottom: 1rem; }
    .progress i { display: block; height: 100%; background: var(--green); border-radius: 99px; transition: width 0.4s var(--ease-out); }
    .reqs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .reqs li { display: flex; gap: 0.8rem; padding: 0.75rem 0; border-top: 1px solid var(--surface-2); }
    .reqs li:first-child { border-top: none; }
    .reqs strong { font-size: 0.9rem; }
    .check { width: 22px; height: 22px; border-radius: 7px; border: 2px solid var(--line-strong); display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; color: #fff; transition: all 0.15s ease; }
    .check.on { background: var(--green); border-color: var(--green); }
    .arch { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0; }
    .arch li { display: flex; gap: 0.9rem; position: relative; padding-bottom: 1.1rem; }
    .arch li:not(:last-child)::after { content: ''; position: absolute; left: 19px; top: 40px; bottom: 0; width: 2px; background: var(--surface-3); }
    .a-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--surface-2); flex-shrink: 0; }
    .a-icon.green { background: var(--green-soft); color: var(--green-dark); }
    .arch strong { font-size: 0.9rem; }
    .arch p { font-size: 0.82rem; color: var(--text-2); }
    .security { background: var(--ink); color: #fff; border-color: var(--ink); }
    .security .muted { color: rgba(255, 255, 255, 0.7); margin: 0.4rem 0 0.8rem; }
    .sec-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: rgba(23, 178, 106, 0.18); color: #4ade80; margin-bottom: 0.8rem; }
    .security ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .security li { display: flex; align-items: center; gap: 0.45rem; }
    .security li w-icon { color: #4ade80; }
    .future { margin: 0.6rem 0 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.35rem; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `],
})
export class WhatsappPage {
  svc = inject(BusinessService);
  private store = inject(DemoStore);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  setup = this.svc.whatsapp;
  total = computed(() => this.setup().requirements.length);
  done = computed(() => this.setup().requirements.filter((r) => r.done).length);

  form = this.fb.nonNullable.group({
    businessNumber: ['', [(c: AbstractControl) => (!c.value || /^3\d{9}$/.test(extractPhone(String(c.value)) ?? '') ? null : { phone: true })]],
    displayName: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  constructor() {
    effect(() => {
      this.store.activeProfile();
      const s = this.setup();
      untracked(() => { if (!this.form.dirty) this.form.reset({ businessNumber: s.businessNumber ? formatPhone(s.businessNumber) : '', displayName: s.displayName }); });
    });
  }

  bad(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.svc.saveWhatsapp({ businessNumber: extractPhone(v.businessNumber) ?? '', displayName: v.displayName.trim() });
    this.form.markAsPristine();
    this.toast.success('Datos guardados', 'Solo como referencia: no se realizó ninguna conexión.');
  }
}
