import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConversationsService } from '../../core/services/conversations.service';
import { AssistantService } from '../../core/services/assistant.service';
import { CatalogService } from '../../core/services/catalog.service';
import { LeadsService, leadStatusLabel } from '../../core/services/leads.service';
import { BusinessService } from '../../core/services/business.service';
import { ToastService } from '../../core/ui/toast.service';
import { ConfirmService } from '../../core/ui/confirm.service';
import { Conversation, ConversationStatus, Intent, Message, Product } from '../../core/models';
import { extractPhone, formatPhone } from '../../core/bot/text';
import { IconComponent } from '../../shared/icon.component';
import { AvatarComponent } from '../../shared/avatar.component';
import { ModalComponent } from '../../shared/modal.component';
import { CopPipe, LongDatePipe, PhonePipe, WhenPipe } from '../../shared/format';

type Filter = 'todas' | ConversationStatus;
type Mode = 'cliente' | 'agente';

const STATUS: Record<ConversationStatus, { label: string; badge: string }> = {
  bot: { label: 'Asistente', badge: 'badge-green' },
  humano: { label: 'Pendiente', badge: 'badge-amber' },
  resuelta: { label: 'Resuelta', badge: '' },
};

const INTENT_TEXT: Partial<Record<Intent, string>> = {
  saludo: 'Saludo', horario: 'Horario', ubicacion: 'Ubicación', catalogo: 'Catálogo', precio: 'Precio',
  compra: 'Compra / reserva', humano: 'Pidió una persona', faq: 'Pregunta frecuente', desconocido: 'No entendido',
  agradecimiento: 'Agradecimiento', despedida: 'Despedida', dato_lead: 'Datos del pedido',
};

@Component({
  selector: 'w-conversations',
  imports: [FormsModule, RouterLink, IconComponent, AvatarComponent, ModalComponent, CopPipe, PhonePipe, WhenPipe, LongDatePipe],
  template: `
    <div class="inbox" [class.has-chat]="!!selected()">
      <!-- Bandeja -->
      <section class="list">
        <div class="list-head">
          <div class="row between">
            <h2>Conversaciones</h2>
            <button class="btn btn-primary btn-sm" type="button" (click)="openNew()"><w-icon name="plus" [size]="16" /> Nueva</button>
          </div>
          <div class="input-icon search"><w-icon name="search" [size]="17" /><input class="input" type="search" placeholder="Buscar contacto o mensaje" [(ngModel)]="query" aria-label="Buscar conversaciones" /></div>
          <div class="seg filters" role="tablist">
            @for (f of filters; track f.id) {
              <button type="button" role="tab" [class.active]="filter() === f.id" (click)="filter.set(f.id)">{{ f.label }}@if (count(f.id); as n) { <em>{{ n }}</em> }</button>
            }
          </div>
        </div>
        <ul class="threads">
          @for (c of visible(); track c.id) {
            <li>
              <button type="button" class="thread" [class.active]="c.id === selectedId()" (click)="select(c.id)">
                <w-avatar [name]="c.contactName" [size]="44" />
                <div class="grow">
                  <div class="row between"><strong class="truncate">{{ c.contactName }}</strong><span class="time" [class.unread-time]="c.unread">{{ lastAt(c) | when }}</span></div>
                  <div class="row between">
                    <span class="preview truncate">
                      @if (last(c); as m) {
                        @if (m.author === 'bot') { <w-icon name="spark" [size]="13" /> }
                        @if (m.author === 'agente') { <w-icon name="headset" [size]="13" /> }
                        {{ m.author === 'sistema' ? m.text : m.text }}
                      } @else { <em class="faint">Sin mensajes todavía</em> }
                    </span>
                    @if (c.unread) { <span class="unread">{{ c.unread }}</span> }
                    @else if (typing().has(c.id)) { <span class="typing-mini">escribiendo…</span> }
                  </div>
                  <span class="badge tiny-badge" [class]="'badge tiny-badge ' + status[c.status].badge"><span class="dot"></span>{{ status[c.status].label }}</span>
                </div>
              </button>
            </li>
          } @empty {
            <li class="empty"><div class="empty-icon"><w-icon name="inbox" /></div><h3>Sin resultados</h3><p>No hay conversaciones con ese filtro o búsqueda.</p></li>
          }
        </ul>
      </section>

      <!-- Chat -->
      <section class="chat">
        @if (selected(); as c) {
          <header class="chat-head">
            <button class="btn btn-quiet btn-icon back" type="button" (click)="clearSelection()" aria-label="Volver a la bandeja"><w-icon name="arrow-left" /></button>
            <w-avatar [name]="c.contactName" [size]="40" />
            <div class="grow head-text">
              <strong class="truncate">{{ c.contactName }}</strong>
              <span class="faint small">{{ c.contactPhone | phone }} · {{ c.channel }}</span>
            </div>
            <div class="head-actions">
              <label class="bot-toggle" [class.off]="!c.automationEnabled" title="Activa o pausa el asistente solo en esta conversación">
                <w-icon name="bot" [size]="16" /><span class="hide-md">Asistente</span>
                <button class="switch" type="button" role="switch" [class.on]="c.automationEnabled" [attr.aria-checked]="c.automationEnabled" (click)="toggleAutomation(c)" aria-label="Asistente en esta conversación"></button>
              </label>
              <button class="btn btn-ghost btn-icon hide-sm" type="button" (click)="transfer(c)" [disabled]="c.status === 'humano'" title="Transferir a una persona" aria-label="Transferir a una persona"><w-icon name="headset" [size]="17" /></button>
              <button class="btn btn-ghost btn-icon hide-sm" type="button" (click)="resolve(c)" [disabled]="c.status === 'resuelta'" title="Marcar como resuelta" aria-label="Marcar como resuelta"><w-icon name="check" [size]="17" /></button>
              <button class="btn btn-quiet btn-icon" type="button" (click)="info.set(!info())" [class.on]="info()" aria-label="Información del contacto"><w-icon name="info" /></button>
            </div>
          </header>

          <div class="sim-banner"><w-icon name="spark" [size]="14" /> Conversación simulada · ningún mensaje se envía a WhatsApp</div>
          @if (!assistant().botEnabled) {
            <div class="paused-banner"><w-icon name="pause" [size]="14" /> El asistente está en pausa para todo el negocio. <a routerLink="/app/asistente">Activarlo</a></div>
          }

          <div class="messages" #scroller>
            @for (m of c.messages; track m.id; let i = $index) {
              @if (showDay(c.messages, i)) { <div class="day"><span>{{ dayLabel(m.at) }}</span></div> }
              @if (m.author === 'sistema') {
                <div class="system"><w-icon name="info" [size]="13" /> {{ m.text }}</div>
              } @else {
                <div class="msg" [class]="'msg ' + m.author">
                  @if (m.author !== 'cliente') {
                    <span class="who">@if (m.author === 'bot') { <w-icon name="spark" [size]="12" /> {{ assistant().assistantName }} · asistente } @else { <w-icon name="headset" [size]="12" /> Equipo de {{ business().name }} }</span>
                  }
                  <div class="bubble">
                    <p>{{ m.text }}</p>
                    @if (m.author === 'bot' && productsOf(m).length) {
                      <div class="cards">
                        @for (p of productsOf(m).slice(0, 3); track p.id) {
                          <div class="pcard">
                            @if (p.imageUrl) { <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" /> } @else { <span class="pimg"><w-icon name="image" [size]="16" /></span> }
                            <div class="grow"><strong class="truncate">{{ p.name }}</strong><span>{{ p.price | cop }}</span></div>
                          </div>
                        }
                      </div>
                    }
                    <span class="stamp">{{ m.at | when: true }}@if (m.author === 'cliente' && m.intent) { · {{ intentText(m.intent) }} }</span>
                  </div>
                </div>
              }
            } @empty {
              <div class="chat-empty">
                <span class="empty-icon"><w-icon name="chat" /></span>
                <h3>Escribe el primer mensaje</h3>
                <p>Escribe como si fueras {{ c.contactName.split(' ')[0] }}. {{ assistant().assistantName }} responderá con la configuración de {{ business().name }}.</p>
              </div>
            }
            @if (typing().has(c.id)) {
              <div class="msg bot"><span class="who"><w-icon name="spark" [size]="12" /> {{ assistant().assistantName }} está escribiendo</span><div class="bubble typing"><i></i><i></i><i></i></div></div>
            }
          </div>

          <footer class="composer">
            @if (mode() === 'cliente') {
              <div class="suggestions" aria-label="Mensajes sugeridos">
                @for (s of suggestions(); track s) { <button type="button" class="chip" (click)="send(s)">{{ s }}</button> }
              </div>
            }
            @if (mode() === 'cliente' && !willReply()) {
              <p class="note"><w-icon name="info" [size]="14" /> El asistente no responderá en este chat: el mensaje quedará pendiente para una persona.</p>
            }
            <div class="compose-row">
              <div class="seg mode">
                <button type="button" [class.active]="mode() === 'cliente'" (click)="mode.set('cliente')" title="Simula lo que escribe el cliente">Cliente</button>
                <button type="button" [class.active]="mode() === 'agente'" (click)="mode.set('agente')" title="Responde como una persona del equipo">Equipo</button>
              </div>
              <form class="compose" (ngSubmit)="submitBox(box)">
                <input #box class="input" autocomplete="off" maxlength="600" (input)="hasDraft.set(!!box.value.trim())"
                  (keydown.enter)="$event.preventDefault(); submitBox(box)"
                  [placeholder]="mode() === 'cliente' ? 'Escribe como ' + c.contactName.split(' ')[0] + '…' : 'Responde como equipo de ' + business().name + '…'" aria-label="Mensaje" />
                <button class="btn btn-green btn-icon send" type="submit" [disabled]="!hasDraft()" aria-label="Enviar mensaje"><w-icon name="send" [size]="18" /></button>
              </form>
            </div>
          </footer>
        } @else {
          <div class="no-chat">
            <span class="no-chat-icon"><w-icon name="chats" [size]="30" /></span>
            <h2>Elige una conversación</h2>
            <p>Abre un chat de la bandeja o crea uno nuevo para probar cómo responde {{ assistant().assistantName }}.</p>
            <button class="btn btn-primary" type="button" (click)="openNew()"><w-icon name="plus" [size]="17" /> Nueva conversación de prueba</button>
          </div>
        }
      </section>

      <!-- Ficha del contacto -->
      @if (selected(); as c) {
        @if (info()) {
          <aside class="info">
            <div class="info-head">
              <w-avatar [name]="c.contactName" [size]="64" />
              <h3>{{ c.contactName }}</h3>
              <p class="faint small">{{ c.contactPhone | phone }}</p>
              <span class="badge" [class]="'badge ' + status[c.status].badge"><span class="dot"></span>{{ status[c.status].label }}</span>
            </div>

            <dl class="facts">
              <div><dt>Canal</dt><dd>{{ c.channel }}</dd></div>
              <div><dt>Inicio</dt><dd>{{ c.createdAt | longDate }}</dd></div>
              <div><dt>Mensajes</dt><dd>{{ c.messages.length }}</dd></div>
              <div><dt>Asistente</dt><dd>{{ c.automationEnabled ? 'Activo en este chat' : 'En pausa' }}</dd></div>
            </dl>

            @if (c.tags.length) {
              <div class="block"><h4>Etiquetas</h4><div class="row wrap">@for (t of c.tags; track t) { <span class="badge">{{ t }}</span> }</div></div>
            }

            @if (c.leadFlow) {
              <div class="block flow">
                <h4>Pedido en curso</h4>
                <ol class="steps">
                  <li [class.done]="c.leadFlow.step !== 'producto'" [class.cur]="c.leadFlow.step === 'producto'">Producto @if (c.leadFlow.productId) { <span class="faint">· {{ productName(c.leadFlow.productId) }}</span> }</li>
                  <li [class.done]="c.leadFlow.step === 'telefono'" [class.cur]="c.leadFlow.step === 'nombre'">Nombre @if (c.leadFlow.name) { <span class="faint">· {{ c.leadFlow.name }}</span> }</li>
                  <li [class.cur]="c.leadFlow.step === 'telefono'">Teléfono</li>
                </ol>
              </div>
            }

            <div class="block">
              <h4>Cliente potencial</h4>
              @if (leadOf(c); as lead) {
                <a class="lead-link" [routerLink]="'/app/clientes'" [queryParams]="{ lead: lead.id }">
                  <w-icon name="target" [size]="18" />
                  <span class="grow"><strong>{{ lead.interest }}</strong><small>{{ statusLabel(lead.status) }}</small></span>
                  <w-icon name="chevron-right" [size]="16" />
                </a>
              } @else {
                <p class="small faint">Aún no se registra. El asistente lo crea cuando el cliente quiere comprar y deja sus datos.</p>
                <button class="btn btn-ghost btn-sm" type="button" (click)="openLead(c)"><w-icon name="user-plus" [size]="16" /> Registrar manualmente</button>
              }
            </div>

            @if (intentsOf(c).length) {
              <div class="block"><h4>Lo que preguntó</h4><div class="row wrap">@for (t of intentsOf(c); track t) { <span class="badge badge-violet">{{ t }}</span> }</div></div>
            }

            <div class="block actions-sm">
              <button class="btn btn-ghost btn-sm" type="button" (click)="transfer(c)" [disabled]="c.status === 'humano'"><w-icon name="headset" [size]="16" /> Transferir a una persona</button>
              <button class="btn btn-ghost btn-sm" type="button" (click)="resolve(c)" [disabled]="c.status === 'resuelta'"><w-icon name="check" [size]="16" /> Marcar resuelta</button>
              <button class="btn btn-quiet btn-sm danger" type="button" (click)="remove(c)"><w-icon name="trash" [size]="16" /> Eliminar conversación</button>
            </div>
          </aside>
        }
      }
    </div>

    @if (newOpen()) {
      <w-modal title="Nueva conversación de prueba" subtitle="Crea un contacto ficticio para simular un chat desde cero." (closed)="newOpen.set(false)">
        <form id="newConv" class="stack" (ngSubmit)="createConversation()">
          <div class="field">
            <label for="nc-name">Nombre del contacto</label>
            <input id="nc-name" class="input" name="name" [(ngModel)]="newName" [class.invalid]="newTried && !newName.trim()" placeholder="Ej: Juliana Castaño" maxlength="40" />
            @if (newTried && !newName.trim()) { <span class="error-text">Escribe un nombre.</span> }
          </div>
          <div class="field">
            <label for="nc-phone">Teléfono (ficticio)</label>
            <input id="nc-phone" class="input" name="phone" [(ngModel)]="newPhone" [class.invalid]="newTried && !validNewPhone()" placeholder="300 000 0000" inputmode="tel" />
            @if (newTried && !validNewPhone()) { <span class="error-text">Usa un celular de 10 dígitos que empiece por 3.</span> }
            <span class="hint">No uses datos reales: la demo guarda todo en este navegador.</span>
          </div>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="newOpen.set(false)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="newConv">Crear y abrir</button>
        </ng-container>
      </w-modal>
    }

    @if (leadFor(); as c) {
      <w-modal title="Registrar cliente potencial" [subtitle]="'Desde la conversación con ' + c.contactName" (closed)="leadFor.set(null)">
        <form id="leadForm" class="stack" (ngSubmit)="saveLead(c)">
          <div class="field"><label for="lf-name">Nombre</label><input id="lf-name" class="input" name="lname" [(ngModel)]="leadName" [class.invalid]="leadTried && !leadName.trim()" /></div>
          <div class="field"><label for="lf-phone">Teléfono</label><input id="lf-phone" class="input" name="lphone" [(ngModel)]="leadPhone" [class.invalid]="leadTried && !extract(leadPhone)" />
            @if (leadTried && !extract(leadPhone)) { <span class="error-text">Teléfono de 10 dígitos.</span> }</div>
          <div class="field"><label for="lf-int">Producto o servicio de interés</label>
            <select id="lf-int" class="select" name="lint" [(ngModel)]="leadProduct">
              <option value="">Información general</option>
              @for (p of products(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
          </div>
        </form>
        <ng-container footer>
          <button class="btn btn-ghost" type="button" (click)="leadFor.set(null)">Cancelar</button>
          <button class="btn btn-primary" type="submit" form="leadForm">Registrar</button>
        </ng-container>
      </w-modal>
    }
  `,
  styles: [`
    :host { display: block; }
    .inbox { display: grid; grid-template-columns: 340px minmax(0, 1fr) auto; height: calc(100dvh - 66px - 3.5rem); min-height: 560px; background: var(--surface); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; }

    /* Bandeja */
    .list { display: flex; flex-direction: column; border-right: 1px solid var(--line); min-height: 0; min-width: 0; }
    .list-head { padding: 1.1rem 1rem 0.8rem; display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid var(--surface-2); }
    .list-head h2 { font-size: 1.25rem; }
    .search .input { height: 40px; border-radius: 999px; background: var(--bg); }
    .filters { width: 100%; }
    .filters button { flex: 1; padding: 0 0.4rem; font-size: 0.78rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; }
    .filters em { font-style: normal; font-size: 0.7rem; color: var(--text-3); }
    .threads { list-style: none; margin: 0; padding: 0.4rem; overflow-y: auto; flex: 1; }
    .thread { width: 100%; display: flex; gap: 0.7rem; padding: 0.7rem 0.65rem; border-radius: 14px; text-align: left; transition: background-color 0.15s ease; }
    .thread:hover { background: var(--bg); }
    .thread.active { background: var(--green-soft); }
    .thread strong { font-size: 0.9rem; }
    .time { font-size: 0.72rem; color: var(--text-3); white-space: nowrap; }
    .unread-time { color: var(--green-dark); font-weight: 600; }
    .preview { font-size: 0.82rem; color: var(--text-2); display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.1rem; }
    .preview w-icon { color: var(--green-dark); }
    .unread { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--green); color: #fff; font-size: 0.7rem; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
    .typing-mini { font-size: 0.74rem; color: var(--green-dark); font-weight: 500; }
    .tiny-badge { height: 20px; font-size: 0.68rem; margin-top: 0.35rem; }

    /* Chat */
    .chat { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--bg); }
    .chat-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: var(--surface); border-bottom: 1px solid var(--line); }
    .head-text { display: flex; flex-direction: column; min-width: 0; }
    .head-text .small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .head-actions { display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0; }
    .back { display: none; }
    .bot-toggle { display: inline-flex; align-items: center; gap: 0.45rem; height: 36px; padding: 0 0.4rem 0 0.75rem; border-radius: 999px; background: var(--green-soft); color: var(--green-dark); font-size: 0.8rem; font-weight: 600; }
    .bot-toggle.off { background: var(--surface-2); color: var(--text-2); }
    .bot-toggle .switch { transform: scale(0.85); }
    .btn-icon.on { background: var(--surface-2); }
    .sim-banner, .paused-banner { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.4rem; font-size: 0.76rem; font-weight: 500; background: var(--amber-soft); color: var(--amber); }
    .paused-banner { background: var(--red-soft); color: var(--red); }
    .paused-banner a { text-decoration: underline; font-weight: 600; }
    .messages { flex: 1; overflow-y: auto; padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.55rem;
      background-image: radial-gradient(rgba(19, 19, 22, 0.035) 1px, transparent 1px); background-size: 18px 18px; }
    .day { display: flex; justify-content: center; margin: 0.6rem 0; }
    .day span { padding: 0.25rem 0.75rem; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); font-size: 0.72rem; font-weight: 600; color: var(--text-2); }
    .system { align-self: center; display: inline-flex; align-items: center; gap: 0.35rem; max-width: 80%; padding: 0.35rem 0.8rem; border-radius: 999px; background: var(--surface-3); color: var(--text-2); font-size: 0.75rem; text-align: center; }
    .msg { display: flex; flex-direction: column; max-width: min(78%, 520px); }
    .msg.cliente { align-self: flex-start; }
    .msg.bot, .msg.agente { align-self: flex-end; align-items: flex-end; }
    .who { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.7rem; font-weight: 600; color: var(--text-3); margin: 0 0.5rem 0.2rem; }
    .bubble { position: relative; padding: 0.6rem 0.8rem 0.45rem; border-radius: 18px; box-shadow: 0 1px 1px rgba(19, 19, 22, 0.05); }
    .bubble p { white-space: pre-line; font-size: 0.9rem; line-height: 1.45; overflow-wrap: anywhere; }
    .cliente .bubble { background: var(--surface); border: 1px solid var(--line); border-top-left-radius: 6px; }
    .bot .bubble { background: #dff3e8; border-top-right-radius: 6px; }
    .agente .bubble { background: var(--ink); color: #fff; border-top-right-radius: 6px; }
    .stamp { display: block; margin-top: 0.25rem; font-size: 0.68rem; color: var(--text-3); text-align: right; }
    .agente .stamp { color: rgba(255, 255, 255, 0.55); }
    .cards { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.55rem; }
    .pcard { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem; border-radius: 12px; background: rgba(255, 255, 255, 0.75); }
    .pcard img, .pimg { width: 40px; height: 40px; border-radius: 9px; object-fit: cover; flex-shrink: 0; display: grid; place-items: center; background: var(--surface-2); }
    .pcard strong { display: block; font-size: 0.8rem; }
    .pcard span { font-size: 0.76rem; color: var(--text-2); }
    .typing { display: flex; gap: 4px; padding: 0.75rem 0.9rem; }
    .typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--green-dark); opacity: 0.4; animation: dot 1.2s infinite; }
    .typing i:nth-child(2) { animation-delay: 0.15s; } .typing i:nth-child(3) { animation-delay: 0.3s; }
    @keyframes dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-4px); opacity: 1; } }
    .chat-empty { margin: auto; text-align: center; max-width: 340px; color: var(--text-2); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
    .chat-empty .empty-icon { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: var(--surface); border: 1px solid var(--line); }
    .chat-empty p { font-size: 0.88rem; }

    .composer { padding: 0.7rem 1rem 0.9rem; background: var(--surface); border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 0.6rem; }
    .suggestions { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
    .chip { flex-shrink: 0; height: 30px; padding: 0 0.8rem; border-radius: 999px; border: 1px solid var(--line-strong); background: var(--surface); font-size: 0.78rem; font-weight: 500; color: var(--text-2); transition: all 0.15s ease; }
    .chip:hover { border-color: var(--green); color: var(--green-dark); background: var(--green-soft); }
    .note { display: flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; color: var(--amber); }
    .compose-row { display: flex; align-items: center; gap: 0.6rem; }
    .mode { flex-shrink: 0; }
    .mode button { height: 36px; padding: 0 0.85rem; }
    .compose { flex: 1; display: flex; gap: 0.5rem; min-width: 0; }
    .compose .input { border-radius: 999px; background: var(--bg); }
    .send { width: 44px; height: 44px; flex-shrink: 0; }
    .no-chat { margin: auto; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.7rem; max-width: 380px; padding: 2rem; }
    .no-chat-icon { width: 72px; height: 72px; border-radius: 22px; display: grid; place-items: center; background: var(--surface); border: 1px solid var(--line); color: var(--green-dark); }
    .no-chat p { color: var(--text-2); }

    /* Ficha */
    .info { width: 300px; border-left: 1px solid var(--line); overflow-y: auto; padding: 1.3rem 1.1rem; display: flex; flex-direction: column; gap: 1.1rem; }
    .info-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.35rem; }
    .info-head h3 { margin-top: 0.4rem; }
    .facts { margin: 0; display: flex; flex-direction: column; gap: 0.55rem; padding: 0.9rem; border-radius: 14px; background: var(--bg); }
    .facts div { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.82rem; }
    .facts dt { color: var(--text-3); }
    .facts dd { margin: 0; text-align: right; font-weight: 500; }
    .block { display: flex; flex-direction: column; gap: 0.55rem; }
    .block h4 { font-size: 0.82rem; color: var(--text-2); }
    .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.84rem; }
    .steps li { display: flex; align-items: center; gap: 0.5rem; color: var(--text-3); }
    .steps li::before { content: ''; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--line-strong); flex-shrink: 0; }
    .steps li.done { color: var(--text); } .steps li.done::before { background: var(--green); border-color: var(--green); }
    .steps li.cur { color: var(--text); font-weight: 600; } .steps li.cur::before { border-color: var(--green); }
    .lead-link { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem; border-radius: 14px; background: var(--green-soft); color: var(--green-dark); }
    .lead-link strong { display: block; font-size: 0.86rem; color: var(--text); }
    .lead-link small { font-size: 0.76rem; }
    .actions-sm { padding-top: 0.6rem; border-top: 1px solid var(--surface-2); }
    .actions-sm .btn { justify-content: flex-start; }
    .danger { color: var(--red); }

    @media (max-width: 1280px) {
      .info { position: fixed; z-index: 70; right: 0; top: 66px; bottom: 0; background: var(--surface); box-shadow: var(--shadow-lg); }
    }
    @media (max-width: 1100px) { .hide-md { display: none; } }
    @media (max-width: 860px) {
      .inbox { grid-template-columns: minmax(0, 1fr); height: calc(100dvh - 66px - 2.5rem); border-radius: 20px; }
      .inbox.has-chat .list { display: none; }
      .inbox:not(.has-chat) .chat { display: none; }
      .back { display: inline-flex; }
      .hide-sm { display: none; }
      .msg { max-width: 88%; }
      .messages { padding: 1rem 0.8rem; }
      .info { width: 100%; max-width: 340px; }
    }
    @media (max-width: 480px) {
      .compose-row { flex-direction: column; align-items: stretch; }
      .mode { align-self: flex-start; }
    }
  `],
})
export class ConversationsPage {
  private svc = inject(ConversationsService);
  private assistantSvc = inject(AssistantService);
  private catalog = inject(CatalogService);
  private leadsSvc = inject(LeadsService);
  private businessSvc = inject(BusinessService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  status = STATUS;
  filters: { id: Filter; label: string }[] = [
    { id: 'todas', label: 'Todas' }, { id: 'bot', label: 'Asistente' }, { id: 'humano', label: 'Pendientes' }, { id: 'resuelta', label: 'Resueltas' },
  ];
  assistant = this.assistantSvc.config;
  business = this.businessSvc.business;
  products = this.catalog.products;
  typing = this.svc.typing;

  filter = signal<Filter>('todas');
  selectedId = signal<string | null>(null);
  mode = signal<Mode>('cliente');
  info = signal(typeof window !== 'undefined' && window.innerWidth > 1280);
  private q = signal('');
  get query() { return this.q(); }
  set query(v: string) { this.q.set(v); }
  hasDraft = signal(false);
  private box = viewChild<ElementRef<HTMLInputElement>>('box');

  newOpen = signal(false);
  newName = '';
  newPhone = '';
  newTried = false;
  leadFor = signal<Conversation | null>(null);
  leadName = '';
  leadPhone = '';
  leadProduct = '';
  leadTried = false;

  selected = computed(() => this.svc.conversations().find((c) => c.id === this.selectedId()) ?? null);
  visible = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.svc.conversations().filter((c) =>
      (this.filter() === 'todas' || c.status === this.filter()) &&
      (!q || c.contactName.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q))));
  });

  willReply = computed(() => !!this.selected()?.automationEnabled && this.assistant().botEnabled);

  /** Sugerencias según el negocio y el punto de la conversación. */
  suggestions = computed(() => {
    const c = this.selected();
    if (c?.leadFlow?.step === 'nombre') return ['Sí', c.contactName];
    if (c?.leadFlow?.step === 'telefono') return ['300 123 4567', 'Cancelar'];
    if (c?.leadFlow?.step === 'producto') return this.products().filter((p) => p.active && p.available).slice(0, 4).map((p) => p.name);
    const prods = this.products().filter((p) => p.active && p.available);
    const first = prods[0]?.name.toLowerCase();
    const second = prods[1]?.name.toLowerCase();
    const isBarber = this.business().type === 'Barbería';
    return [
      'Hola', '¿A qué hora abren hoy?', '¿Dónde quedan?',
      isBarber ? '¿Qué servicios tienen?' : '¿Qué tienen en el catálogo?',
      first ? `¿Cuánto vale ${first}?` : '¿Qué precios manejan?',
      second ? `${isBarber ? 'Quiero agendar' : 'Quiero pedir'} ${second}` : 'Quiero hacer un pedido',
      this.assistant() && this.business().type === 'Restaurante' ? '¿Hacen domicilios?' : '¿Qué medios de pago reciben?',
      'Quiero hablar con una persona',
    ];
  });

  constructor() {
    // Abrir el chat indicado en la URL (?chat=id) o el primero al entrar en escritorio.
    this.route.queryParamMap.subscribe((p) => {
      const id = p.get('chat');
      if (id && this.svc.byId(id)) this.select(id, false);
      else if (!this.selectedId() && window.innerWidth > 860) {
        const first = this.svc.conversations()[0];
        if (first) this.select(first.id, false);
      }
    });
    // Si el chat seleccionado desaparece (otro perfil, restablecer), se limpia la selección.
    effect(() => {
      const list = this.svc.conversations();
      const id = untracked(this.selectedId);
      if (id && !list.some((c) => c.id === id)) this.selectedId.set(window.innerWidth > 860 ? list[0]?.id ?? null : null);
    });
    // Bajar al último mensaje cuando llegan mensajes nuevos.
    effect(() => {
      const c = this.selected();
      void c?.messages.length;
      void this.typing().size;
      queueMicrotask(() => setTimeout(() => {
        const el = this.scroller()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }));
    });
  }

  select(id: string, updateUrl = true): void {
    if (this.selectedId() !== id) this.clearBox();
    this.selectedId.set(id);
    this.svc.markRead(id);
    if (updateUrl) this.router.navigate([], { queryParams: { chat: id }, replaceUrl: true });
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  count(f: Filter): number {
    return f === 'todas' ? 0 : this.svc.conversations().filter((c) => c.status === f).length;
  }

  send(text: string): void {
    const c = this.selected();
    if (!c || !text.trim()) return;
    if (this.mode() === 'cliente') this.svc.sendAsClient(c.id, text);
    else this.svc.sendAsAgent(c.id, text);
  }

  /** Lee y limpia el campo directamente: sin sincronización asíncrona que pueda perder texto. */
  submitBox(box: HTMLInputElement): void {
    const text = box.value;
    box.value = '';
    this.hasDraft.set(false);
    this.send(text);
    box.focus();
  }

  private clearBox(): void {
    const el = this.box()?.nativeElement;
    if (el) el.value = '';
    this.hasDraft.set(false);
  }

  toggleAutomation(c: Conversation): void {
    this.svc.setAutomation(c.id, !c.automationEnabled);
    this.toast.info(c.automationEnabled ? 'Asistente pausado en este chat' : 'Asistente reactivado en este chat');
  }

  transfer(c: Conversation): void { this.svc.transferToHuman(c.id); this.mode.set('agente'); }

  resolve(c: Conversation): void {
    this.svc.resolve(c.id);
    this.toast.success('Conversación resuelta', c.contactName);
  }

  async remove(c: Conversation): Promise<void> {
    if (await this.confirm.ask({ title: '¿Eliminar esta conversación?', text: `Se borrará el chat simulado con ${c.contactName}. Los clientes potenciales registrados se conservan.`, confirmLabel: 'Eliminar', danger: true })) {
      this.svc.remove(c.id);
      this.clearSelection();
      this.toast.success('Conversación eliminada');
    }
  }

  openNew(): void {
    this.newName = ''; this.newPhone = ''; this.newTried = false;
    this.newOpen.set(true);
  }

  validNewPhone(): boolean { return !!extractPhone(this.newPhone); }

  createConversation(): void {
    this.newTried = true;
    if (!this.newName.trim() || !this.validNewPhone()) return;
    const id = this.svc.start(this.newName, extractPhone(this.newPhone)!);
    this.newOpen.set(false);
    this.mode.set('cliente');
    this.filter.set('todas');
    this.select(id);
  }

  openLead(c: Conversation): void {
    this.leadName = c.contactName; this.leadPhone = formatPhone(c.contactPhone); this.leadTried = false;
    const mentioned = [...c.messages].reverse().find((m) => m.author === 'cliente' && m.productIds?.length);
    this.leadProduct = mentioned?.productIds?.[0] ?? '';
    this.leadFor.set(c);
  }

  extract(v: string) { return extractPhone(v); }

  saveLead(c: Conversation): void {
    this.leadTried = true;
    const phone = extractPhone(this.leadPhone);
    if (!this.leadName.trim() || !phone) return;
    const product = this.products().find((p) => p.id === this.leadProduct);
    this.leadsSvc.create({ name: this.leadName.trim(), phone, interest: product?.name ?? 'Información general', productId: product?.id, notes: `Registrado desde la conversación con ${c.contactName}.` });
    this.leadFor.set(null);
    this.toast.success('Cliente potencial registrado', `${this.leadName} quedó en Clientes potenciales.`);
  }

  leadOf(c: Conversation) { return c.leadId ? this.leadsSvc.byId(c.leadId) : undefined; }
  statusLabel = leadStatusLabel;
  productName(id: string) { return this.products().find((p) => p.id === id)?.name ?? ''; }
  productsOf(m: Message): Product[] {
    return (m.productIds ?? []).map((id) => this.products().find((p) => p.id === id)).filter((p): p is Product => !!p);
  }
  intentsOf(c: Conversation): string[] {
    return [...new Set(c.messages.filter((m) => m.intent && m.intent !== 'dato_lead' && m.intent !== 'saludo').map((m) => INTENT_TEXT[m.intent!] ?? ''))].filter(Boolean);
  }
  intentText(i: Intent) { return INTENT_TEXT[i] ?? ''; }
  last(c: Conversation): Message | undefined { return c.messages[c.messages.length - 1]; }
  lastAt(c: Conversation): string { return this.last(c)?.at ?? c.createdAt; }

  showDay(list: Message[], i: number): boolean {
    return i === 0 || new Date(list[i - 1].at).toDateString() !== new Date(list[i].at).toDateString();
  }

  dayLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    const s = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
