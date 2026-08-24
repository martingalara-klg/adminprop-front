type ModulePlaceholderProps = {
  title: string
}

/**
 * Placeholder de Fase 0 (#3). No llama a la API — cada módulo reemplaza
 * este componente por sus páginas reales en su propio issue.
 */
export function ModulePlaceholder({ title }: ModulePlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">Módulo</p>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  )
}
