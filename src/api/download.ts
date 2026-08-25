// src/api/download.ts
//
// Descarga de archivos (recibos, certificados, exports de liquidaciones):
// Fetch + Blob obligatorio. PROHIBIDO window.open(url) o <a href={url}>
// sin fetch — ver docs/skills/api-client.md §"Descarga de archivos".
//
// Issue #12 (Cobranzas): `POST /renters/:id/debt-certificate` es un
// endpoint sincrónico que devuelve el PDF directamente en el body de un
// POST (no un GET) — se agrega soporte a `method`/`body` sin romper el
// uso existente (GET por default). Los errores (422 RENTER_HAS_DEBT,
// 422 BUSINESS_RULE_VIOLATION) llegan como JSON con el formato CUSTOM de
// sdd_03 aunque la respuesta exitosa sea binaria — se parsean acá para
// que el caller pueda discriminar por `error.code` igual que con Axios
// (ver docs/skills/error-handling.md).
import { API_BASE } from './http-client'
import { AdminPropApiError, type AdminPropErrorBody } from './errors'

type DownloadOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
}

export async function downloadFile(
  path: string,
  filename: string,
  opts: DownloadOptions = {},
): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (!response.ok) {
    let body: Partial<AdminPropErrorBody> | undefined
    try {
      body = (await response.json()) as Partial<AdminPropErrorBody>
    } catch {
      body = undefined
    }
    const err = body?.error
    throw new AdminPropApiError(
      err?.code ?? 'INTERNAL_ERROR',
      response.status,
      err?.message ?? 'No se pudo descargar el archivo.',
      err?.field ?? null,
      err?.details ?? {},
    )
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
