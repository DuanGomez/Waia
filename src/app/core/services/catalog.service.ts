import { Injectable, computed, inject } from '@angular/core';
import { Product } from '../models';
import { DemoStore } from '../state/demo.store';
import { uid } from '../bot/conversation-logic';

export type ProductDraft = Omit<Product, 'id'>;

/** Catálogo de productos y servicios del negocio activo. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private store = inject(DemoStore);

  readonly products = computed(() => this.store.workspace().products);
  readonly categories = computed(() => [...new Set(this.products().map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es')));

  create(draft: ProductDraft): void {
    this.store.mutate((ws) => { ws.products.unshift({ ...draft, id: uid('prod') }); });
  }

  update(id: string, draft: ProductDraft): void {
    this.store.mutate((ws) => {
      const i = ws.products.findIndex((p) => p.id === id);
      if (i >= 0) ws.products[i] = { ...draft, id };
    });
  }

  toggle(id: string, field: 'active' | 'available'): void {
    this.store.mutate((ws) => {
      const p = ws.products.find((x) => x.id === id);
      if (p) p[field] = !p[field];
    });
  }

  remove(id: string): void {
    this.store.mutate((ws) => { ws.products = ws.products.filter((p) => p.id !== id); });
  }
}
