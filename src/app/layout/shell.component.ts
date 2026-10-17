import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DemoStore } from '../core/state/demo.store';
import { StorageService } from '../core/state/storage.service';
import { ConversationsService } from '../core/services/conversations.service';
import { LeadsService } from '../core/services/leads.service';
import { BusinessService } from '../core/services/business.service';
import { ConfirmService } from '../core/ui/confirm.service';
import { ToastService } from '../core/ui/toast.service';
import { PROFILE_META } from '../core/data/profiles';
import { ProfileId } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { LogoComponent } from '../shared/logo.component';
import { TourComponent } from './tour.component';

interface NavItem { label: string; icon: string; path: string; badge?: () => number }

@Component({
  selector: 'w-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, TourComponent],
  template: `
    <div class="shell" [style.--brand]="business().brandColor">
      @if (drawer()) { <div class="scrim" (click)="drawer.set(false)"></div> }

      <aside class="side" [class.open]="drawer()">
        <a class="brand" routerLink="/" title="Ir a la página de Waia"><w-logo [size]="30" [inverse]="true" /></a>

        <button class="biz" type="button" (click)="profileMenu.set(!profileMenu())" [attr.aria-expanded]="profileMenu()">
          @if (business().logoUrl) { <img class="biz-logo" [src]="business().logoUrl" alt="" /> }
          @else { <span class="biz-logo" [style.background]="business().brandColor">{{ initials() }}</span> }
          <span class="biz-text"><strong>{{ business().name }}</strong><small>{{ business().type }} · demo</small></span>
          <w-icon name="chevron-down" [size]="16" />
        </button>

        @for (section of nav; track section.title) {
          <p class="sec">{{ section.title }}</p>
          @for (item of section.items; track item.path) {
            <a class="item" [routerLink]="item.path" routerLinkActive="active" (click)="drawer.set(false)">
              <w-icon [name]="item.icon" [size]="19" />
              <span>{{ item.label }}</span>
              @if (item.badge && item.badge() > 0) { <em class="count">{{ item.badge() }}</em> }
            </a>
          }
        }

        <div class="side-foot">
          <div class="sim"><span class="pulse"></span> Simulación activa · sin conexión real</div>
          <a class="dcodea" href="https://www.instagram.com/dcod.ea/" target="_blank" rel="noopener">Hecho por <strong>Dcodea</strong></a>
        </div>
      </aside>

      <div class="main">
        <header class="top">
          <button class="btn btn-quiet btn-icon burger" type="button" (click)="drawer.set(true)" aria-label="Abrir menú"><w-icon name="menu" /></button>

          <div class="switch-wrap">
            <button class="profile-btn" type="button" (click)="profileMenu.set(!profileMenu())" [attr.aria-expanded]="profileMenu()">
              <span class="label">Perfil de demo</span>
              <span class="value">{{ meta()[store.activeProfile()].label }}</span>
              <w-icon name="chevron-down" [size]="16" />
            </button>
            @if (profileMenu()) {
              <div class="menu-scrim" (click)="profileMenu.set(false)"></div>
              <div class="dropdown profiles" role="menu">
                <p class="dd-title">Muestra Waia configurado para…</p>
                @for (p of store.profiles(); track p.id) {
                  <button class="profile-opt" type="button" role="menuitem" [class.current]="p.id === store.activeProfile()" (click)="switchTo(p.id)">
                    <img [src]="meta()[p.id].cover" alt="" />
                    <span><strong>{{ meta()[p.id].label }}</strong><small>{{ p.business.name }} · {{ p.business.city }}</small></span>
                    @if (p.id === store.activeProfile()) { <w-icon name="check" [size]="18" /> }
                  </button>
                }
                <p class="dd-note">Cada perfil tiene sus propias conversaciones, catálogo y clientes.</p>
              </div>
            }
          </div>

          <span class="demo-tag top-tag" title="Las conversaciones, mensajes y clientes son simulados. No hay conexión real con WhatsApp."><w-icon name="spark" [size]="14" /> Modo demostración</span>

          <div class="top-actions">
            <a class="btn btn-quiet btn-sm hide-sm" routerLink="/app/conversaciones"><w-icon name="play" [size]="15" /> Probar el asistente</a>
            <div class="more-wrap">
              <button class="btn btn-ghost btn-icon" type="button" (click)="moreMenu.set(!moreMenu())" aria-label="Más opciones" [attr.aria-expanded]="moreMenu()"><w-icon name="more" /></button>
              @if (moreMenu()) {
                <div class="menu-scrim" (click)="moreMenu.set(false)"></div>
                <div class="dropdown more" role="menu">
                  <button type="button" role="menuitem" (click)="startTour()"><w-icon name="compass" [size]="18" /> Ver recorrido guiado</button>
                  <a role="menuitem" routerLink="/" (click)="moreMenu.set(false)"><w-icon name="external" [size]="18" /> Página comercial de Waia</a>
                  <hr />
                  <button type="button" role="menuitem" (click)="resetProfile()"><w-icon name="rotate" [size]="18" /> Restablecer este negocio</button>
                  <button type="button" role="menuitem" class="danger" (click)="resetAll()"><w-icon name="refresh" [size]="18" /> Restablecer toda la demo</button>
                </div>
              }
            </div>
          </div>
        </header>

        @if (storage.error(); as err) {
          <div class="storage-warn" role="alert"><w-icon name="alert" [size]="17" /> {{ err }}</div>
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>

      @if (tourOpen()) { <w-tour (finished)="closeTour()" /> }
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; background: var(--bg); }

    /* Barra lateral */
    .side { width: 264px; flex-shrink: 0; height: 100vh; position: sticky; top: 0; overflow-y: auto; display: flex; flex-direction: column; padding: 1.3rem 0.9rem 1rem; background: var(--ink); color: #fff; }
    .brand { padding: 0 0.6rem; margin-bottom: 1.3rem; }
    .biz { display: flex; align-items: center; gap: 0.7rem; width: 100%; padding: 0.7rem; border-radius: 14px; background: rgba(255, 255, 255, 0.06); color: #fff; text-align: left; transition: background-color 0.2s ease; margin-bottom: 0.4rem; }
    .biz:hover { background: rgba(255, 255, 255, 0.1); }
    .biz-logo { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 0.85rem; color: #fff; object-fit: cover; }
    .biz-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .biz-text strong { font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .biz-text small { font-size: 0.75rem; color: #8b8b91; }
    .biz w-icon { color: #8b8b91; }
    .sec { margin: 1.1rem 0.75rem 0.4rem; font-size: 0.72rem; font-weight: 600; color: #6f6f76; }
    .item { display: flex; align-items: center; gap: 0.75rem; padding: 0.62rem 0.75rem; border-radius: 12px; color: #a2a2a8; font-size: 0.9rem; font-weight: 500; transition: color 0.2s ease, background-color 0.2s ease; }
    .item:hover { color: #fff; background: #222226; }
    .item.active { color: var(--ink); background: #fff; font-weight: 600; }
    .item.active w-icon { color: var(--green); }
    .count { margin-left: auto; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--green); color: #fff; font-style: normal; font-size: 0.72rem; font-weight: 700; display: grid; place-items: center; }
    .item.active .count { background: var(--ink); }
    .side-foot { margin-top: auto; padding: 1.2rem 0.4rem 0; display: flex; flex-direction: column; gap: 0.8rem; }
    .sim { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; border-radius: 12px; background: rgba(255, 200, 80, 0.1); color: #f2c267; font-size: 0.76rem; font-weight: 500; }
    .pulse { width: 7px; height: 7px; border-radius: 50%; background: #f2c267; animation: pulse 1.8s infinite; flex-shrink: 0; }
    .dcodea { padding: 0 0.35rem; font-size: 0.75rem; color: #8b8b91; }
    .dcodea strong { background: linear-gradient(100deg, #00e5ff, #8b7bff); -webkit-background-clip: text; background-clip: text; color: transparent; }

    /* Zona principal */
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .top { position: sticky; top: 0; z-index: 50; height: 66px; display: flex; align-items: center; gap: 0.9rem; padding: 0 1.75rem; background: rgba(250, 250, 247, 0.85); backdrop-filter: blur(14px) saturate(160%); -webkit-backdrop-filter: blur(14px) saturate(160%); border-bottom: 1px solid var(--line); }
    .burger { display: none; }
    .switch-wrap, .more-wrap { position: relative; }
    .profile-btn { display: flex; align-items: center; gap: 0.5rem; height: 40px; padding: 0 0.6rem 0 0.9rem; border-radius: 999px; background: var(--surface); border: 1px solid var(--line-strong); }
    .profile-btn:hover { background: var(--surface-2); }
    .profile-btn .label { font-size: 0.78rem; color: var(--text-3); }
    .profile-btn .value { font-size: 0.86rem; font-weight: 600; }
    .top-tag { gap: 0.35rem; }
    .top-actions { margin-left: auto; display: flex; align-items: center; gap: 0.4rem; }
    .menu-scrim { position: fixed; inset: 0; z-index: 60; }
    .dropdown { position: absolute; z-index: 61; top: calc(100% + 8px); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow-lg); padding: 0.5rem; animation: fadeIn 0.2s var(--ease-out); }
    .profiles { left: 0; width: 340px; }
    .more { right: 0; width: 260px; }
    .dd-title { font-size: 0.78rem; font-weight: 600; color: var(--text-3); padding: 0.5rem 0.6rem 0.4rem; }
    .dd-note { font-size: 0.75rem; color: var(--text-3); padding: 0.5rem 0.6rem 0.3rem; border-top: 1px solid var(--surface-2); margin-top: 0.3rem; }
    .profile-opt { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.55rem; border-radius: 12px; text-align: left; }
    .profile-opt:hover { background: var(--surface-2); }
    .profile-opt.current { background: var(--green-soft); }
    .profile-opt img { width: 46px; height: 46px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
    .profile-opt span { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .profile-opt strong { font-size: 0.9rem; }
    .profile-opt small { font-size: 0.78rem; color: var(--text-3); }
    .profile-opt w-icon { color: var(--green-dark); }
    .more button, .more a { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.6rem 0.7rem; border-radius: 10px; font-size: 0.88rem; text-align: left; color: var(--text); }
    .more button:hover, .more a:hover { background: var(--surface-2); }
    .more w-icon { color: var(--text-2); }
    .more .danger, .more .danger w-icon { color: var(--red); }
    .more hr { border: none; border-top: 1px solid var(--surface-2); margin: 0.35rem 0; }
    .storage-warn { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 1.75rem 0; padding: 0.75rem 1rem; border-radius: 14px; background: var(--amber-soft); color: var(--amber); font-size: 0.86rem; font-weight: 500; }
    .content { flex: 1; width: 100%; max-width: 1400px; margin: 0 auto; padding: 1.75rem; }

    @media (max-width: 1024px) {
      .side { position: fixed; z-index: 900; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.3s var(--ease-out); box-shadow: var(--shadow-lg); }
      .side.open { transform: none; }
      .scrim { position: fixed; inset: 0; z-index: 899; background: rgba(19, 19, 22, 0.35); }
      .burger { display: inline-flex; }
      .top { padding: 0 1rem; gap: 0.6rem; }
      .content { padding: 1.25rem 1rem; }
      .storage-warn { margin: 1rem 1rem 0; }
    }
    @media (max-width: 720px) {
      .top-tag, .hide-sm { display: none; }
      .profile-btn .label { display: none; }
      .profiles { width: min(340px, calc(100vw - 2rem)); left: -48px; }
    }
  `],
})
export class ShellComponent {
  store = inject(DemoStore);
  storage = inject(StorageService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private conversations = inject(ConversationsService);
  private leads = inject(LeadsService);
  private businessSvc = inject(BusinessService);

  business = this.businessSvc.business;
  initials = this.businessSvc.initials;
  meta = signal(PROFILE_META);
  drawer = signal(false);
  profileMenu = signal(false);
  moreMenu = signal(false);
  tourOpen = signal(!this.store.tourSeen());

  private newLeads = computed(() => this.leads.leads().filter((l) => l.status === 'nuevo').length);

  nav: { title: string; items: NavItem[] }[] = [
    { title: 'Principal', items: [
      { label: 'Resumen', icon: 'dashboard', path: '/app/resumen' },
      { label: 'Conversaciones', icon: 'chats', path: '/app/conversaciones', badge: () => this.conversations.pendingCount() },
      { label: 'Clientes potenciales', icon: 'target', path: '/app/clientes', badge: () => this.newLeads() },
    ] },
    { title: 'Asistente', items: [
      { label: 'Configuración', icon: 'bot', path: '/app/asistente' },
      { label: 'Catálogo', icon: 'tag', path: '/app/catalogo' },
      { label: 'Automatizaciones', icon: 'bolt', path: '/app/automatizaciones' },
    ] },
    { title: 'Negocio', items: [
      { label: 'Analíticas', icon: 'chart', path: '/app/analiticas' },
      { label: 'Personalización', icon: 'store', path: '/app/negocio' },
      { label: 'WhatsApp', icon: 'link', path: '/app/whatsapp' },
    ] },
  ];

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.drawer.set(false);
      this.profileMenu.set(false);
      this.moreMenu.set(false);
    });
  }

  @HostListener('document:keydown.escape')
  closeMenus() { this.profileMenu.set(false); this.moreMenu.set(false); this.drawer.set(false); }

  switchTo(id: ProfileId): void {
    this.profileMenu.set(false);
    if (id === this.store.activeProfile()) return;
    this.store.switchProfile(id);
    this.toast.success(`Ahora ves la demo de ${this.meta()[id].label.toLowerCase()}`, `${this.store.workspace().business.name}: catálogo, conversaciones y clientes propios.`);
  }

  startTour(): void {
    this.moreMenu.set(false);
    this.tourOpen.set(true);
  }

  closeTour(): void {
    this.tourOpen.set(false);
    this.store.markTourSeen();
  }

  async resetProfile(): Promise<void> {
    this.moreMenu.set(false);
    const name = this.business().name;
    if (await this.confirm.ask({ title: `¿Restablecer ${name}?`, text: 'Se borrarán los cambios de este negocio (conversaciones nuevas, catálogo, clientes y configuración) y volverá a los datos de ejemplo. Los otros perfiles no cambian.', confirmLabel: 'Restablecer', danger: true })) {
      this.store.resetProfile();
      this.toast.success('Negocio restablecido', `${name} volvió a sus datos de ejemplo.`);
    }
  }

  async resetAll(): Promise<void> {
    this.moreMenu.set(false);
    if (await this.confirm.ask({ title: '¿Restablecer toda la demo?', text: 'Los tres perfiles de negocio vuelven a sus datos iniciales. Esta acción no se puede deshacer.', confirmLabel: 'Restablecer todo', danger: true })) {
      this.store.resetAll();
      this.toast.success('Demo restablecida', 'Todos los negocios volvieron a sus datos de ejemplo.');
      this.router.navigateByUrl('/app/resumen');
    }
  }

}
