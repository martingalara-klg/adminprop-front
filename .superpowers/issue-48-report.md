# Issue #48 — ux: formularios de creación en modales

## Status
Completado. Los 9 formularios de creación listados en el issue viven ahora en modales (`Dialog`, shadcn/ui manual sobre `@radix-ui/react-dialog`). Ningún listado renderiza un form de creación inline.

## Componente compartido
- `src/shared/components/ui/dialog.tsx` — Dialog/DialogTrigger/DialogContent/DialogHeader/DialogFooter/DialogTitle/DialogDescription/DialogClose. Radix resuelve focus trap, cierre con Escape, `role="dialog"`/`aria-modal`, devolución de foco al trigger. Animaciones vía `tailwindcss-animate` (ya respetan `prefers-reduced-motion`).
- `src/shared/components/SuccessBanner.tsx` — feedback `role="status"` post-creación (no hay sistema de toasts en el repo; deuda separada, no de este issue).

## Módulos migrados
| Módulo | Listado | Form | Botón |
|---|---|---|---|
| Propiedades | `PropertiesListPage` | `PropertyForm` | "Nueva propiedad" |
| Conceptos de cargos recurrentes | `PropertyDetailPage` | `RecurringChargeForm` (extraído de `PropertyRecurringCharges`, que ahora es sólo lectura) | "Nuevo concepto" |
| Propietarios | `LandlordsListPage` | `LandlordForm` | "Nuevo propietario" |
| Inquilinos | `RentersListPage` | `RenterForm` | "Nuevo inquilino" |
| Contratos | `ContractsListPage` | `ContractForm` | "Nuevo contrato" (queda abierto en 409 CONTRACT_OVERLAP) |
| Pedidos de mantenimiento | `MaintenanceListPage` | `WorkOrderCreateForm` | "Nuevo pedido" — absorbe el flujo que antes vivía en `/maintenance/new` (`WorkOrderCreatePage`, eliminada); ya no navega al detalle al crear, cierra+refresca+feedback |
| Cotizaciones | `WorkOrderDetailPage` | `QuoteForm` | "Nueva cotización" |
| Organizaciones (superadmin) | `OrganizationsListPage` | `CreateOrganizationForm` | "Nueva organización" (reemplaza el toggle show/hide previo) |
| Invitaciones de usuario | `AdminUsersPage` | `InviteUserForm` | "Invitar usuario" |

## Fuera de alcance (explícito en el issue)
- Confirms inline de 2 pasos (`ConfirmDeleteButton`, cancelación de pedidos, etc.) — no migrados, mencionado como follow-up posible.
- Barrios (#49).
- `docs/sdd/`.

## Tests
- Vitest: `npm test` → 26 archivos, 243 tests verdes.
- `npm run typecheck` y `npm run lint` (`--max-warnings 0`) verdes.
- `npm run build` (bundle de producción) verde.
- Playwright: no se pudo ejecutar localmente (requiere backend real, ver `docs/runbooks/RUNBOOK-LOCAL-002-frontend.md` / CI clona `adminprop-back`). Se ajustó `tests/e2e/contracts.spec.ts` (abre el modal antes de interactuar con el form) — se ejecutará en CI del PR.

## Decisiones de implementación
- Éxito uniforme: cerrar modal + refrescar listado (ya cubierto por `invalidateQueries` existente en cada mutation hook) + `SuccessBanner`.
- Error: el modal permanece abierto (contratos: CONTRACT_OVERLAP con link al contrato en conflicto sigue accesible dentro del modal; invitaciones: 409 se ve inline sin perder el form).
- `MaintenanceListPage` absorbe la lógica de `WorkOrderCreatePage` (alta + subida secuencial de fotos) — se eliminó la ruta `/maintenance/new` y la página separada; el comportamiento post-creación pasa de "navegar al detalle" a "cerrar + refrescar + feedback", uniforme con el resto de los módulos (CA-06-01 del SDD no exige la navegación, sólo que el pedido aparezca en el listado).

## Concerns
- Sin sistema de toasts en el repo: se implementó `SuccessBanner` inline como feedback mínimo viable. Si el equipo quiere un toast real, es un issue aparte.
- Playwright no verificado localmente por falta de backend — corre en CI.
