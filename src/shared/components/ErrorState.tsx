type ErrorStateProps = {
  title?: string
  message?: string
  error?: unknown
}

/**
 * Estado `error` compartido por los flujos del front. La discriminación por
 * `error.code` del SDD vive en cada módulo (ver docs/skills/error-handling.md);
 * este componente es sólo el contenedor visual genérico de último recurso.
 */
export function ErrorState({ title = 'Ocurrió un error', message, error }: ErrorStateProps) {
  const resolvedMessage =
    message ?? (error instanceof Error ? error.message : 'Intentá de nuevo en unos minutos.')

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center" role="alert">
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{resolvedMessage}</p>
    </div>
  )
}
