// src/api/download.ts
//
// Descarga de archivos (recibos, certificados, exports de liquidaciones):
// Fetch + Blob obligatorio. PROHIBIDO window.open(url) o <a href={url}>
// sin fetch — ver docs/skills/api-client.md §"Descarga de archivos".
import { API_BASE } from './http-client'

export async function downloadFile(path: string, filename: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
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
