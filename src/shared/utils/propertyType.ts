// src/shared/utils/propertyType.ts
//
// Issue #55 (ronda feedback #2 del PO): mapa de presentación es-AR para
// `property_type` — el backend recibe/devuelve el valor en minúscula
// (`property_type: string` libre, sdd_03 §properties); este mapa es SOLO
// de presentación (select, listado, ficha). Compartido entre los módulos
// `properties` (PropertyForm/PropertyEditForm/PropertiesTable/ficha) y
// `people` (LandlordPropertiesList) para no duplicar el catálogo.
//
// `duplex` ya está incluido acá aunque el backend (#103) todavía no lo
// habilite en todos los ambientes: cuando el back lo mergee, el valor
// llega tal cual y este mapa ya sabe capitalizarlo — no bloquea el resto.
export const PROPERTY_TYPE_OPTIONS = [
  'departamento',
  'casa',
  'local',
  'cochera',
  'duplex',
  'otro',
] as const

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  departamento: 'Departamento',
  casa: 'Casa',
  local: 'Local',
  cochera: 'Cochera',
  duplex: 'Duplex',
  otro: 'Otro',
}

// Valores libres fuera del catálogo sugerido (texto corto <=50, ver
// property.schema.ts) se muestran tal cual — nunca `undefined`.
export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPE_LABELS[value] ?? value
}
