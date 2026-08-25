// src/modules/maintenance/components/PhotoPicker.tsx
//
// Selector de fotos reutilizable (alta de pedido, cotización, cierre) —
// spec_module_06 §Validaciones: jpg/png/webp/pdf, ≤10MB, ≤10 por
// entidad. Presentacional: junta archivos válidos y los expone al
// padre; el padre decide cuándo subirlos (tras crear el recurso — el
// backend requiere el id del pedido/cotización antes de aceptar fotos).
import { useRef, useState } from 'react'
import { Button } from '@/shared/components'
import {
  MAX_ATTACHMENTS_PER_ENTITY,
  validateAttachmentFile,
} from '../schemas/maintenance.schema'

type Props = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  label?: string
}

export function PhotoPicker({ files, onChange, disabled = false, label = 'Fotos (opcional)' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pickError, setPickError] = useState<string | null>(null)

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return
    setPickError(null)

    const next = [...files]
    for (const file of Array.from(selected)) {
      if (next.length >= MAX_ATTACHMENTS_PER_ENTITY) {
        setPickError(`No podés adjuntar más de ${MAX_ATTACHMENTS_PER_ENTITY} archivos.`)
        break
      }
      const error = validateAttachmentFile(file)
      if (error) {
        setPickError(error)
        continue
      }
      next.push(file)
    }
    onChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        disabled={disabled}
        onChange={(event) => handleFilesSelected(event.target.files)}
        data-testid="photo-picker-input"
      />
      {pickError ? (
        <p className="text-sm text-destructive" role="alert">
          {pickError}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-2">
              <span>{file.name}</span>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => removeFile(index)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
