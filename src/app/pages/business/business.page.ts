import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { BusinessService, initials } from '../../core/services/business.service';
import { AssistantService } from '../../core/services/assistant.service';
import { DemoStore } from '../../core/state/demo.store';
import { ToastService } from '../../core/ui/toast.service';
import { PROFILE_META } from '../../core/data/profiles';
import { Business, BusinessType, ProfileId } from '../../core/models';
import { extractPhone, fillTemplate, formatPhone } from '../../core/bot/text';
import { IconComponent } from '../../shared/icon.component';
import { compressImage } from '../../shared/image-utils';

const TYPES: BusinessType[] = ['Restaurante', 'Tienda de ropa', 'Barbería', 'Joyería', 'Estudio de tatuajes', 'Servicios'];
const COLORS = ['#c2410c', '#4f46e5', '#0f766e', '#17b26a', '#be185d', '#1d4ed8', '#a16207', '#131316'];

function hoursRange(g: AbstractControl): ValidationErrors | null {
  const v = g.value as { open: boolean; from: string; to: string };
  return v.open && (!v.from || !v.to || v.from >= v.to) ? { range: true } : null;
}

@Component({
  selector: 'w-business',
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Personalización del negocio</h1>
        <p>Adapta Waia a cada cliente sin tocar código: identidad, datos de contacto, horarios y mensajes.</p>
      </div>
    </div>

    <section class="profiles">
      @for (p of store.profiles(); track p.id) {
        <article class="profile" [class.current]="p.id === store.activeProfile()">
          <img [src]="meta[p.id].cover" alt="" />
          <div class="p-body">
            <span class="p-type">{{ meta[p.id].label }}</span>
            <strong>{{ p.business.name }}</strong>
            <span class="faint small">{{ p.business.city }}</span>
          </div>
          @if (p.id === store.activeProfile()) { <span class="badge badge-green p-state"><w-icon name="check" [size]="13" /> En uso</span> }
          @else { <button class="btn btn-ghost btn-sm p-state" type="button" (click)="use(p.id)">Usar este perfil</button> }
        </article>
      }
    </section>
    <p class="iso faint small"><w-icon name="shield" [size]="14" /> Cada perfil guarda por separado su catálogo, conversaciones, clientes potenciales y configuración.</p>

    <div class="layout">
      <form class="stack" [formGroup]="form" (ngSubmit)="save()">
        <section class="card">
          <div class="card-head"><div><h3>Identidad</h3><p>Nombre, tipo de negocio y marca</p></div></div>
          <div class="form-grid">
            <div class="field"><label for="b-name">Nombre comercial</label><input id="b-name" class="input" formControlName="name" maxlength="40" [class.invalid]="bad('name')" />
              @if (bad('name')) { <span class="error-text">Escribe el nombre (2 a 40 caracteres).</span> }</div>
            <div class="field"><label for="b-type">Tipo de negocio</label>
              <select id="b-type" class="select" formControlName="type">@for (t of types; track t) { <option [value]="t">{{ t }}</option> }</select></div>
            <div class="field full"><label for="b-desc">Descripción</label><textarea id="b-desc" class="textarea" rows="2" formControlName="description" maxlength="200" [class.invalid]="bad('description')"></textarea>
              @if (bad('description')) { <span class="error-text">Describe el negocio en una frase (mínimo 10 caracteres).</span> }</div>
            <div class="field full">
              <span class="label">Color de marca</span>
              <div class="colors">
                @for (c of colors; track c) { <button type="button" class="swatch" [style.background]="c" [class.on]="form.value.brandColor === c" (click)="setColor(c)" [attr.aria-label]="'Color ' + c"></button> }
                <label class="custom"><input type="color" formControlName="brandColor" aria-label="Color personalizado" /> Otro</label>
              </div>
            </div>
            <div class="field full">
              <span class="label">Logo (opcional)</span>
              <div class="logo-row">
                <span class="logo-prev" [style.background]="form.value.brandColor">@if (form.value.logoUrl) { <img [src]="form.value.logoUrl" alt="Logo" /> } @else { {{ previewInitials() }} }</span>
                <label class="btn btn-ghost btn-sm"><w-icon name="upload" [size]="16" /> Subir logo<input type="file" accept="image/*" hidden (change)="uploadLogo($event)" /></label>
                @if (form.value.logoUrl) { <button class="btn btn-quiet btn-sm" type="button" (click)="form.controls.logoUrl.setValue(''); form.markAsDirty()">Quitar</button> }
                <span class="hint">Sin logo se usan las iniciales con el color de marca.</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><h3>Contacto</h3><p>El asistente comparte estos datos cuando le preguntan</p></div></div>
          <div class="form-grid">
            <div class="field"><label for="b-phone">Teléfono / WhatsApp</label><input id="b-phone" class="input" formControlName="phone" inputmode="tel" [class.invalid]="bad('phone')" />
              @if (bad('phone')) { <span class="error-text">Celular de 10 dígitos o fijo con indicativo 60.</span> }</div>
            <div class="field"><label for="b-email">Correo</label><input id="b-email" class="input" type="email" formControlName="email" [class.invalid]="bad('email')" />
              @if (bad('email')) { <span class="error-text">Correo no válido.</span> }</div>
            <div class="field"><label for="b-addr">Dirección</label><input id="b-addr" class="input" formControlName="address" maxlength="80" [class.invalid]="bad('address')" />
              @if (bad('address')) { <span class="error-text">Escribe la dirección.</span> }</div>
            <div class="field"><label for="b-city">Ciudad</label><input id="b-city" class="input" formControlName="city" maxlength="40" [class.invalid]="bad('city')" />
              @if (bad('city')) { <span class="error-text">Escribe la ciudad.</span> }</div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><h3>Horario de atención</h3><p>El asistente responde «¿a qué hora abren?» con esta tabla</p></div></div>
          <div class="hours" formArrayName="hours">
            @for (h of hoursArray.controls; track $index; let i = $index) {
              <div class="hour" [formGroupName]="i" [class.closed]="!h.value.open" [class.err]="h.invalid">
                <span class="day">{{ h.value.day }}</span>
                <label class="open"><button class="switch" type="button" role="switch" [class.on]="h.value.open" (click)="toggleDay(i)" [attr.aria-label]="'Abre el ' + h.value.day"></button> {{ h.value.open ? 'Abierto' : 'Cerrado' }}</label>
                @if (h.value.open) {
                  <input class="input time" type="time" formControlName="from" [attr.aria-label]="'Apertura ' + h.value.day" />
                  <span class="faint">a</span>
                  <input class="input time" type="time" formControlName="to" [attr.aria-label]="'Cierre ' + h.value.day" />
                }
                @if (h.invalid) { <span class="error-text">La hora de cierre debe ser después de la apertura.</span> }
              </div>
            }
          </div>
        </section>

        <section class="card" [formGroup]="messages">
          <div class="card-head"><div><h3>Mensajes predeterminados</h3><p>Bienvenida y despedida del asistente. Los demás mensajes están en Configuración del asistente.</p></div></div>
          <div class="stack">
            <div class="field"><label for="b-wel">Bienvenida</label><textarea id="b-wel" class="textarea" rows="2" formControlName="welcomeMessage" [class.invalid]="msgBad('welcomeMessage')"></textarea>
              @if (msgBad('welcomeMessage')) { <span class="error-text">Mínimo 10 caracteres.</span> }</div>
            <div class="field"><label for="b-far">Despedida</label><textarea id="b-far" class="textarea" rows="2" formControlName="farewellMessage" [class.invalid]="msgBad('farewellMessage')"></textarea>
              @if (msgBad('farewellMessage')) { <span class="error-text">Mínimo 10 caracteres.</span> }</div>
          </div>
        </section>

        <div class="save-bar" [class.show]="form.dirty || messages.dirty">
          <span>Tienes cambios sin guardar</span>
          <button class="btn btn-ghost btn-sm" type="button" (click)="load()">Descartar</button>
          <button class="btn btn-green btn-sm" type="submit">Guardar cambios</button>
        </div>
      </form>

      <aside class="preview-col">
        <section class="card preview">
          <h4>Así te ven tus clientes</h4>
          <p class="faint tiny">Vista previa con los datos del formulario</p>
          <div class="phone">
            <div class="ph-head" [style.background]="form.value.brandColor">
              <span class="ph-logo">@if (form.value.logoUrl) { <img [src]="form.value.logoUrl" alt="" /> } @else { {{ previewInitials() }} }</span>
              <div><strong>{{ form.value.name || 'Tu negocio' }}</strong><small>{{ form.value.type }} · asistente {{ assistantName() }}</small></div>
            </div>
            <div class="ph-body">
              <div class="b in">Hola, ¿a qué hora abren?</div>
              <div class="b out">{{ welcomePreview() }}</div>
              <div class="b out">Estamos en {{ form.value.address }}, {{ form.value.city }}. Teléfono: {{ phonePreview() }}</div>
            </div>
            <div class="ph-foot"><span>Mensaje</span><i [style.background]="form.value.brandColor"><w-icon name="send" [size]="14" /></i></div>
          </div>
          <p class="disclaimer"><w-icon name="info" [size]="13" /> Vista ilustrativa. No representa la interfaz oficial de WhatsApp.</p>
        </section>
      </aside>
    </div>
  `,
  styles: [`
    .profiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.9rem; }
    .profile { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem; border-radius: 18px; background: var(--surface); border: 1px solid var(--line); }
    .profile.current { border-color: var(--green); box-shadow: 0 0 0 1px var(--green); }
    .profile img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; flex-shrink: 0; }
    .p-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .p-type { font-size: 0.72rem; font-weight: 600; color: var(--text-3); }
    .p-body strong { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .p-state { flex-shrink: 0; }
    .iso { display: flex; align-items: center; gap: 0.4rem; margin: 0.7rem 0 1.4rem; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1rem; align-items: start; }
    .colors { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .swatch { width: 32px; height: 32px; border-radius: 50%; border: 3px solid var(--surface); box-shadow: 0 0 0 1px var(--line-strong); transition: transform 0.15s ease; }
    .swatch:hover { transform: scale(1.08); }
    .swatch.on { box-shadow: 0 0 0 2px var(--ink); }
    .custom { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-2); cursor: pointer; }
    .custom input { width: 32px; height: 32px; border: none; padding: 0; background: none; cursor: pointer; }
    .logo-row { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
    .logo-prev { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; color: #fff; font-family: var(--display); font-weight: 700; overflow: hidden; }
    .logo-prev img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
    .logo-row label { cursor: pointer; }
    .hours { display: flex; flex-direction: column; }
    .hour { display: flex; align-items: center; flex-wrap: wrap; gap: 0.7rem; padding: 0.55rem 0; border-top: 1px solid var(--surface-2); }
    .hour:first-child { border-top: none; }
    .day { width: 90px; font-weight: 600; font-size: 0.88rem; }
    .open { display: inline-flex; align-items: center; gap: 0.45rem; width: 120px; font-size: 0.82rem; color: var(--text-2); }
    .open .switch { transform: scale(0.85); transform-origin: left center; margin-right: -4px; }
    .time { width: 130px; height: 38px; }
    .hour.closed .day { color: var(--text-3); }
    .hour .error-text { flex-basis: 100%; }
    .save-bar { position: sticky; bottom: 1rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.6rem 0.6rem 1.1rem; border-radius: 999px; background: var(--ink); color: #fff; box-shadow: var(--shadow-lg); opacity: 0; transform: translateY(12px); pointer-events: none; transition: all 0.3s var(--ease-out); }
    .save-bar.show { opacity: 1; transform: none; pointer-events: auto; }
    .save-bar span { flex: 1; font-size: 0.86rem; }
    .save-bar .btn-ghost { background: transparent; color: #fff; border-color: rgba(255, 255, 255, 0.25); }
    .preview-col { position: sticky; top: 86px; }
    .phone { margin-top: 1rem; border-radius: 26px; overflow: hidden; border: 1px solid var(--line); background: #f3f1ec; }
    .ph-head { display: flex; align-items: center; gap: 0.65rem; padding: 0.85rem 0.9rem; color: #fff; transition: background-color 0.3s ease; }
    .ph-logo { width: 38px; height: 38px; border-radius: 50%; background: rgba(255, 255, 255, 0.22); display: grid; place-items: center; font-weight: 700; font-size: 0.82rem; overflow: hidden; flex-shrink: 0; }
    .ph-logo img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
    .ph-head strong { display: block; font-size: 0.9rem; }
    .ph-head small { font-size: 0.72rem; opacity: 0.85; }
    .ph-body { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 0.8rem; min-height: 230px; }
    .b { max-width: 85%; padding: 0.55rem 0.75rem; border-radius: 14px; font-size: 0.8rem; line-height: 1.4; }
    .b.in { align-self: flex-start; background: #fff; border-top-left-radius: 4px; }
    .b.out { align-self: flex-end; background: #dff3e8; border-top-right-radius: 4px; }
    .ph-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0.7rem; background: #fff; }
    .ph-foot span { flex: 1; padding: 0.45rem 0.8rem; border-radius: 99px; background: var(--surface-2); font-size: 0.78rem; color: var(--text-3); }
    .ph-foot i { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
    .disclaimer { display: flex; gap: 0.35rem; margin-top: 0.8rem; font-size: 0.72rem; color: var(--text-3); }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } .preview-col { position: static; } }
    @media (max-width: 900px) { .profiles { grid-template-columns: 1fr; } }
    @media (max-width: 520px) { .time { width: calc(50% - 1.2rem); } .open { width: auto; } }
    @media (max-width: 420px) { .profile img { width: 48px; height: 48px; } .p-state { padding: 0 0.7rem; font-size: 0.76rem; } .profile { gap: 0.6rem; } }
  `],
})
export class BusinessPage {
  store = inject(DemoStore);
  private svc = inject(BusinessService);
  private assistant = inject(AssistantService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  meta = PROFILE_META;
  types = TYPES;
  colors = COLORS;
  assistantName = computed(() => this.assistant.config().assistantName);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    type: ['Restaurante' as BusinessType],
    description: ['', [Validators.required, Validators.minLength(10)]],
    logoUrl: [''],
    brandColor: ['#17b26a'],
    phone: ['', [Validators.required, (c: AbstractControl) => (extractPhone(String(c.value ?? '')) ? null : { phone: true })]],
    email: ['', [Validators.email]],
    address: ['', [Validators.required, Validators.pattern(/\S/)]],
    city: ['', [Validators.required, Validators.pattern(/\S/)]],
    hours: this.fb.array<FormGroup>([]),
  });
  messages = this.fb.nonNullable.group({
    welcomeMessage: ['', [Validators.required, Validators.minLength(10)]],
    farewellMessage: ['', [Validators.required, Validators.minLength(10)]],
  });
  get hoursArray() { return this.form.controls.hours as FormArray<FormGroup>; }

  private formValue = signal(this.form.getRawValue());
  previewInitials = computed(() => initials(this.formValue().name || 'Negocio'));
  phonePreview = computed(() => formatPhone(extractPhone(this.formValue().phone) ?? this.formValue().phone));
  welcomePreview = computed(() => fillTemplate(this.messagesValue().welcomeMessage, { negocio: this.formValue().name, asistente: this.assistantName() }));
  private messagesValue = signal(this.messages.getRawValue());

  constructor() {
    this.form.valueChanges.subscribe(() => this.formValue.set(this.form.getRawValue()));
    this.messages.valueChanges.subscribe(() => this.messagesValue.set(this.messages.getRawValue()));
    // Recargar al cambiar de perfil o restablecer la demo.
    effect(() => { this.svc.business(); this.assistant.config(); untracked(() => { if (!this.form.dirty && !this.messages.dirty) this.load(); }); });
    effect(() => { this.store.activeProfile(); untracked(() => this.load()); });
  }

  load(): void {
    const b = this.svc.business();
    this.hoursArray.clear();
    b.hours.forEach((h) => this.hoursArray.push(this.fb.nonNullable.group({ day: [h.day], open: [h.open], from: [h.from], to: [h.to] }, { validators: hoursRange })));
    this.form.reset({ ...b, phone: formatPhone(b.phone), hours: b.hours });
    const a = this.assistant.config();
    this.messages.reset({ welcomeMessage: a.welcomeMessage, farewellMessage: a.farewellMessage });
    this.formValue.set(this.form.getRawValue());
    this.messagesValue.set(this.messages.getRawValue());
  }

  bad(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
  msgBad(key: string): boolean {
    const c = this.messages.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  setColor(c: string): void { this.form.controls.brandColor.setValue(c); this.form.markAsDirty(); }

  toggleDay(i: number): void {
    const g = this.hoursArray.at(i);
    g.patchValue({ open: !g.value.open });
    this.form.markAsDirty();
  }

  async uploadLogo(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.form.controls.logoUrl.setValue(await compressImage(file, 240, 0.85));
      this.form.markAsDirty();
    } catch (err) {
      this.toast.error('No se pudo cargar el logo', (err as Error).message);
    }
  }

  use(id: ProfileId): void {
    this.store.switchProfile(id);
    this.toast.success(`Perfil: ${PROFILE_META[id].label}`, `Ahora ves la demo de ${this.store.workspace().business.name}.`);
  }

  save(): void {
    if (this.form.invalid || this.messages.invalid) {
      this.form.markAllAsTouched(); this.messages.markAllAsTouched();
      this.toast.error('Revisa los campos marcados');
      return;
    }
    const v = this.form.getRawValue();
    const business: Business = {
      name: v.name.trim(), type: v.type, description: v.description.trim(), logoUrl: v.logoUrl, brandColor: v.brandColor,
      phone: extractPhone(v.phone)!, email: v.email.trim(), address: v.address.trim(), city: v.city.trim(),
      hours: v.hours.map((h) => ({ day: String(h['day']), open: !!h['open'], from: String(h['from']), to: String(h['to']) })),
    };
    this.svc.save(business);
    this.assistant.save({ ...this.assistant.config(), ...this.messages.getRawValue() });
    this.form.markAsPristine();
    this.messages.markAsPristine();
    this.toast.success('Negocio actualizado', 'El panel y el asistente ya usan los nuevos datos.');
  }
}
