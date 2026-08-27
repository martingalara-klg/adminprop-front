// src/shared/components/SuccessBanner.tsx
//
// Issue #48: feedback visible al crear con éxito desde un modal ("cerrar
// modal + refrescar listado + toast/feedback"). El repo no tiene un
// sistema de toasts todavía (deuda separada) — este banner inline
// `role="status"` (región `aria-live="polite"` implícita) cubre el
// requisito de accesibilidad sin introducir una librería nueva.
type SuccessBannerProps = {
  message: string
}

export function SuccessBanner({ message }: SuccessBannerProps) {
  return (
    <p
      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      role="status"
    >
      {message}
    </p>
  )
}
