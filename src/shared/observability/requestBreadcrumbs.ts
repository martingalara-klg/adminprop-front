// src/shared/observability/requestBreadcrumbs.ts
//
// Issue #15 (Fase 8) — "breadcrumbs con request-id" para trazabilidad de
// errores. `package.json` NO tiene `@sentry/*` como dependencia (Sentry
// es post-infra, decisión #111 en adminprop-back CLAUDE.md §10) — este
// módulo es el punto de integración liviano: hoy loguea a `console` y
// mantiene un ring buffer de los últimos N `X-Request-Id` en memoria;
// cuando se instale el SDK de Sentry, `recordRequestBreadcrumb` y
// `reportRequestError` son los DOS únicos call-sites a reemplazar por
// `Sentry.addBreadcrumb(...)` / `Sentry.captureException(...)` — nada en
// `http-client.ts` (el único consumidor) debería cambiar.
//
// El `X-Request-Id` ya lo genera/propaga `http-client.ts` (issue #4,
// `docs/skills/api-client.md` §"Interceptor de request") y el backend lo
// propaga a logs/jobs/notificaciones (sdd_04 §4.6) — este módulo cierra
// el círculo del lado del cliente.
const MAX_BREADCRUMBS = 20

export type RequestBreadcrumb = {
  requestId: string
  method: string
  url: string
  /** Status HTTP final, o 'pending' mientras el request está en curso. */
  status: number | 'pending'
  timestamp: string
}

export type RequestErrorReport = {
  requestId: string
  method: string
  url: string
  status: number
  code: string
  message: string
}

let breadcrumbs: RequestBreadcrumb[] = []

/** Registra un request (enviado o resuelto) en el ring buffer de trazabilidad. */
export function recordRequestBreadcrumb(breadcrumb: RequestBreadcrumb): void {
  breadcrumbs = [...breadcrumbs, breadcrumb].slice(-MAX_BREADCRUMBS)
  // eslint-disable-next-line no-console -- punto de integración liviano (ver docstring del módulo)
  console.debug('[observability] request breadcrumb', breadcrumb)
}

/**
 * Reporta un error final de request con el trail de breadcrumbs previos —
 * el equivalente hoy de `Sentry.captureException(error, { extra, breadcrumbs })`.
 */
export function reportRequestError(report: RequestErrorReport): void {
  // eslint-disable-next-line no-console -- punto de integración liviano (ver docstring del módulo)
  console.error('[observability] request error', report, { breadcrumbs: getRequestBreadcrumbs() })
}

/** Copia de solo lectura del buffer — para debugging o para adjuntar a un reporte. */
export function getRequestBreadcrumbs(): RequestBreadcrumb[] {
  return [...breadcrumbs]
}

/** Sólo para tests — resetea el buffer entre casos. */
export function clearRequestBreadcrumbs(): void {
  breadcrumbs = []
}
