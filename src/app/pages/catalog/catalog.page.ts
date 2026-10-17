import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CatalogService, ProductDraft } from '../../core/services/catalog.service';
import { BusinessService } from '../../core/services/business.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { Product } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { CopPipe } from '../../shared/format';
import { compressImage } from '../../shared/image-utils';

type StatusFilter = 'todos' | 'activos' | 'inactivos' | 'agotados';

/** Acepta rutas locales de la demo (photos/…), URLs http(s) o imágenes subidas (data:). */
function imageRef(c: AbstractControl): ValidationErrors | null {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  return /^(https?:\/\/|data:image\/|photos\/)/.test(v) ? null : { image: true };
}

@Component({
  selector: 'w-catalog',
  imports: [ReactiveFormsModule, FormsModule, IconComponent, ModalComponent, CopPipe],
  template: `
    <div class="page-head">
      <div class="titles">
        <h1>Catálogo</h1>
        <p>{{ isService() ? 'Servicios' : 'Productos' }} que {{ business().name }} ofrece. El asistente solo responde con precios que estén aquí.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" type="button" (click)="open()"><w-icon name="plus" [size]="17" /> Agregar {{ isService() ? 'servicio' : 'producto' }}</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="input-icon search"><w-icon name="search" [size]="17" /><input class="input" type="search" placeholder="Buscar por nombre o descripción" [(ngModel)]="query" aria-label="Buscar en el catálogo" /></div>
      <select class="select cat" [(ngModel)]="category" aria-label="Filtrar por categoría">
        <option value="">Todas las categorías</option>
        @for (c of catalog.categories(); track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <div class="seg">
        @for (s of statuses; track s.id) { <button type="button" [class.active]="status() === s.id" (click)="status.set(s.id)">{{ s.label }}</button> }
      </div>
    </div>

    <p class="summary faint small">{{ visible().length }} de {{ catalog.products().length }} · {{ activeCount() }} visibles para el asistente</p>

    @if (visible().length) {
      <div class="grid">
        @for (p of visible(); track p.id) {
          <article class="item fade-in" [class.inactive]="!p.active">
            <div class="media">
              @if (p.imageUrl) { <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" (error)="$any($event.target).style.visibility = 'hidden'" /> }
              @else { <span class="placeholder"><w-icon name="image" [size]="28" /></span> }
              <span class="badge" [class.badge-green]="p.available" [class.badge-red]="!p.available"><span class="dot"></span>{{ p.available ? 'Disponible' : 'Agotado' }}</span>
            </div>
            <div class="body">
              <span class="cat-name">{{ p.category }}</span>
              <h3>{{ p.name }}</h3>
              <p class="desc">{{ p.description }}</p>
              <div class="row between foot">
                <strong class="price">{{ p.price | cop }}</strong>
                <div class="row acts">
                  <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="open(p)" [attr.aria-label]="'Editar ' + p.name"><w-icon name="edit" [size]="16" /></button>
                  <button class="btn btn-quiet btn-icon btn-sm" type="button" (click)="remove(p)" [attr.aria-label]="'Eliminar ' + p.name"><w-icon name="trash" [size]="16" /></button>
                </div>
              </div>
              <div class="toggles">
                <label><button class="switch" type="button" role="switch" [class.on]="p.active" [attr.aria-checked]="p.active" (click)="catalog.toggle(p.id, 'active')"></button> Activo</label>
                <label><button class="switch" type="button" role="switch" [class.on]="p.available" [attr.aria-checked]="p.available" (click)="catalog.toggle(p.id, 'available')"></button> Disponible</label>
              </div>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="card empty">
        <div class="empty-icon"><w-icon name="tag" /></div>
        @if (catalog.products().length) {
          <h3>Sin resultados</h3><p>Ningún {{ isService() ? 'servicio' : 'producto' }} coincide con los filtros.</p>
          <button class="btn btn-ghost btn-sm" type="button" (click)="clearFilters()">Limpiar filtros</button>
        } @else {
          <h3>El catálogo está vacío</h3><p>Sin productos, el asistente no puede compartir precios: derivará esas preguntas a una persona.</p>
          <button class="btn btn-primary btn-sm" type="button" (click)="open()">Agregar el primero</button>
        }
      </div>
    }

    @if (modal()) {
      <w-modal [title]="editing() ? 'Editar ' + editing()!.name : 'Nuevo ' + (isService() ? 'servicio' : 'producto')" [wide]="true" (closed)="modal.set(false)">
        <form id="prodForm" class="pform" [formGroup]="form" (ngSubmit)="save()">
          <div class="stack">
            <div class="field">
              <label for="p-name">Nombre</label>
              <input id="p-name" class="input" formControlName="name" maxlength="60" [class.invalid]="bad('name')" placeholder="Ej: Picada para dos" />
              @if (bad('name')) { <span class="error-text">Escribe un nombre de 2 a 60 caracteres.</span> }
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="p-price">Precio (COP)</label>
                <input id="p-price" class="input" type="number" min="0" step="100" formControlName="price" [class.invalid]="bad('price')" />
                @if (bad('price')) { <span class="error-text">Precio entre $0 y $50.000.000.</span> }
                @else if (form.value.price) { <span class="hint">{{ form.value.price | cop }}</span> }
              </div>
              <div class="field">
                <label for="p-cat">Categoría</label>
                <input id="p-cat" class="input" formControlName="category" list="cats" maxlength="30" [class.invalid]="bad('category')" placeholder="Ej: Bebidas" />
                <datalist id="cats">@for (c of catalog.categories(); track c) { <option [value]="c"></option> }</datalist>
                @if (bad('category')) { <span class="error-text">Indica una categoría.</span> }
              </div>
            </div>
            <div class="field">
              <label for="p-desc">Descripción</label>
              <textarea id="p-desc" class="textarea" rows="3" formControlName="description" maxlength="220" [class.invalid]="bad('description')"></textarea>
              <span class="hint">El asistente la incluye cuando un cliente pregunta por este {{ isService() ? 'servicio' : 'producto' }}.</span>
              @if (bad('description')) { <span class="error-text">Escribe una descripción breve (mínimo 5 caracteres).</span> }
            </div>
            <div class="toggles big">
              <label><button class="switch" type="button" role="switch" [class.on]="form.value.active" (click)="flip('active')"></button> Activo (el asistente lo ofrece)</label>
              <label><button class="switch" type="button" role="switch" [class.on]="form.value.available" (click)="flip('available')"></button> Disponible</label>
            </div>
          </div>

          <div class="img-col">
            <span class="label">Imagen (opcional)</span>
            <div class="preview">
              @if (form.value.imageUrl && !bad('imageUrl')) { <img [src]="form.value.imageUrl" alt="Vista previa" /> }
              @else { <span><w-icon name="image" [size]="28" /> Sin imagen</span> }
            </div>
            <label class="btn btn-ghost btn-sm upload"><w-icon name="upload" [size]="16" /> Subir desde el equipo
              <input type="file" accept="image/*" (change)="upload($event)" hidden />
            </label>
            <input class="input" formControlName="imageUrl" placeholder="o pega una URL https://…" [class.invalid]="bad('imageUrl')" aria-label="URL de la imagen" />
            @if (bad('imageUrl')) { <span class="error-text">Usa una URL que empiece por https://</span> }
            @if (form.value.imageUrl) { <button class="btn btn-quiet btn-sm" type="button" (click)="form.controls.imageUrl.setValue('')">Quitar imagen</button> }
            <span class="hint">Se guarda solo en este navegador.</span>
          </div>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="modal.set(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="prodForm">{{ editing() ? 'Guardar cambios' : 'Agregar' }}</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-bottom: 0.6rem; }
    .search { flex: 1; min-width: 220px; }
    .search .input, .cat { border-radius: 999px; }
    .cat { width: 220px; }
    .summary { margin-bottom: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
    .item { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; transition: box-shadow 0.25s ease, transform 0.25s var(--ease); }
    .item:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .item.inactive .media img { filter: grayscale(1); opacity: 0.55; }
    .item.inactive h3, .item.inactive .price { color: var(--text-3); }
    .media { position: relative; aspect-ratio: 4 / 3; background: var(--surface-2); }
    .media img { width: 100%; height: 100%; object-fit: cover; }
    .placeholder { position: absolute; inset: 0; display: grid; place-items: center; color: var(--text-3); }
    .media .badge { position: absolute; top: 0.7rem; left: 0.7rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    .body { padding: 0.95rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .cat-name { font-size: 0.74rem; font-weight: 600; color: var(--text-3); }
    .body h3 { font-size: 1rem; letter-spacing: -0.02em; }
    .desc { font-size: 0.82rem; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .foot { margin-top: auto; padding-top: 0.6rem; }
    .price { font-family: var(--display); font-size: 1.1rem; letter-spacing: -0.03em; }
    .acts { gap: 0.1rem; }
    .toggles { display: flex; gap: 1.2rem; padding-top: 0.75rem; margin-top: 0.6rem; border-top: 1px solid var(--surface-2); }
    .toggles label { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: var(--text-2); }
    .toggles .switch { transform: scale(0.82); transform-origin: left center; margin-right: -6px; }
    .toggles.big { border-top: none; padding-top: 0; flex-wrap: wrap; }
    .pform { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 1.4rem; }
    .img-col { display: flex; flex-direction: column; gap: 0.55rem; }
    .preview { aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: var(--surface-2); display: grid; place-items: center; color: var(--text-3); font-size: 0.82rem; border: 1px dashed var(--line-strong); }
    .preview span { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
    .upload { cursor: pointer; }
    @media (max-width: 720px) { .pform { grid-template-columns: 1fr; } .cat { width: 100%; } .toolbar .seg { overflow-x: auto; max-width: 100%; } }
  `],
})
export class CatalogPage {
  catalog = inject(CatalogService);
  private businessSvc = inject(BusinessService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private fb = inject(FormBuilder);

  business = this.businessSvc.business;
  isService = computed(() => this.business().type === 'Barbería' || this.business().type === 'Servicios' || this.business().type === 'Estudio de tatuajes');

  statuses: { id: StatusFilter; label: string }[] = [
    { id: 'todos', label: 'Todos' }, { id: 'activos', label: 'Activos' }, { id: 'inactivos', label: 'Inactivos' }, { id: 'agotados', label: 'Agotados' },
  ];
  status = signal<StatusFilter>('todos');
  private q = signal('');
  private cat = signal('');
  get query() { return this.q(); } set query(v: string) { this.q.set(v); }
  get category() { return this.cat(); } set category(v: string) { this.cat.set(v); }

  activeCount = computed(() => this.catalog.products().filter((p) => p.active).length);
  visible = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.catalog.products().filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) &&
      (!this.cat() || p.category === this.cat()) &&
      (this.status() === 'todos' || (this.status() === 'activos' && p.active) || (this.status() === 'inactivos' && !p.active) || (this.status() === 'agotados' && !p.available)));
  });

  modal = signal(false);
  editing = signal<Product | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    price: [0, [Validators.required, Validators.min(0), Validators.max(50_000_000)]],
    category: ['', [Validators.required, Validators.pattern(/\S/)]],
    imageUrl: ['', imageRef],
    available: [true],
    active: [true],
  });

  bad(key: string): boolean {
    const c = this.form.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  flip(key: 'active' | 'available'): void {
    this.form.controls[key].setValue(!this.form.controls[key].value);
  }

  clearFilters(): void { this.q.set(''); this.cat.set(''); this.status.set('todos'); }

  open(p?: Product): void {
    this.editing.set(p ?? null);
    this.form.reset(p ? { ...p } : { name: '', description: '', price: 0, category: '', imageUrl: '', available: true, active: true });
    this.modal.set(true);
  }

  async upload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.form.controls.imageUrl.setValue(await compressImage(file));
    } catch (err) {
      this.toast.error('No se pudo cargar la imagen', (err as Error).message);
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const draft: ProductDraft = { ...v, name: v.name.trim(), description: v.description.trim(), category: v.category.trim(), price: Math.round(Number(v.price)), imageUrl: v.imageUrl.trim() };
    const editing = this.editing();
    try {
      if (editing) this.catalog.update(editing.id, draft); else this.catalog.create(draft);
    } catch {
      this.toast.error('No se pudo guardar', 'Intenta con una imagen más liviana.');
      return;
    }
    this.modal.set(false);
    this.toast.success(editing ? 'Cambios guardados' : 'Agregado al catálogo', `${draft.name} ya está disponible para el asistente.`);
  }

  async remove(p: Product): Promise<void> {
    if (await this.confirm.ask({ title: `¿Eliminar ${p.name}?`, text: 'El asistente dejará de ofrecerlo. Si solo quieres ocultarlo un tiempo, desactívalo.', confirmLabel: 'Eliminar', danger: true })) {
      this.catalog.remove(p.id);
      this.toast.success('Eliminado del catálogo', p.name);
    }
  }
}
