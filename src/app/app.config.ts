import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { routes } from './app.routes';
import { LocalWorkspaceRepository, WorkspaceRepository } from './core/state/workspace.repository';

registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    // Para conectar un backend real basta con cambiar esta implementación.
    { provide: WorkspaceRepository, useClass: LocalWorkspaceRepository },
  ],
};
