import { cn } from '@/shared/utils/cn'

type SpinnerProps = {
  label?: string
  className?: string
}

/**
 * Estado `loading` compartido por los flujos del front (ver docs/skills/flow-implementation.md).
 */
export function Spinner({ label, className }: SpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2 p-8', className)}
      role="status"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  )
}
