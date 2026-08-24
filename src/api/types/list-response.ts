// src/api/types/list-response.ts
//
// sdd_03 §"Convenciones Generales": las respuestas exitosas envuelven
// { data, meta } — meta solo en endpoints paginados. No aplanar.
export type ListResponse<T> = {
  data: T[]
  meta: {
    next_cursor: string | null
    limit: number
  }
}

// Excepción documentada: GET /audit-logs usa page/page_size (sdd_03 §16).
export type PageListResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    page_size: number
  }
}
