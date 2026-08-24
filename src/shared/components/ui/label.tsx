import * as React from 'react'

import { cn } from '@/shared/utils/cn'

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

// Componente generico shadcn/ui: el `htmlFor` lo aporta cada uso via `...props`.
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
