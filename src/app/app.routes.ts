import { Routes } from '@angular/router';

const page = (title: string) => `${title} · Waia`;

export const routes: Routes = [
  { path: '', title: 'Waia · Asistente de atención por WhatsApp para negocios', loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPage) },
  {
    path: 'app',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'resumen' },
      { path: 'resumen', title: page('Resumen'), loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'conversaciones', title: page('Conversaciones'), loadComponent: () => import('./pages/conversations/conversations.page').then((m) => m.ConversationsPage) },
      { path: 'asistente', title: page('Asistente'), loadComponent: () => import('./pages/assistant/assistant.page').then((m) => m.AssistantPage) },
      { path: 'catalogo', title: page('Catálogo'), loadComponent: () => import('./pages/catalog/catalog.page').then((m) => m.CatalogPage) },
      { path: 'clientes', title: page('Clientes potenciales'), loadComponent: () => import('./pages/leads/leads.page').then((m) => m.LeadsPage) },
      { path: 'automatizaciones', title: page('Automatizaciones'), loadComponent: () => import('./pages/automations/automations.page').then((m) => m.AutomationsPage) },
      { path: 'analiticas', title: page('Analíticas'), loadComponent: () => import('./pages/analytics/analytics.page').then((m) => m.AnalyticsPage) },
      { path: 'negocio', title: page('Negocio'), loadComponent: () => import('./pages/business/business.page').then((m) => m.BusinessPage) },
      { path: 'whatsapp', title: page('WhatsApp'), loadComponent: () => import('./pages/whatsapp/whatsapp.page').then((m) => m.WhatsappPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
