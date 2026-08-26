#!/usr/bin/env python3
"""tests/e2e/seed/seed.py -- issue #16.

Siembra DIRECTO a la base de datos de adminprop-back (sin pasar por el
flujo de invitación por email, inviable en CI) los fixtures que los 4
E2E críticos del frontend necesitan: organización activa, usuarios con
password conocida, roles/permisos idénticos a los que
`adminprop-back/src/adminprop/modules/superadmin/provisioning.py` siembra
en producción, y datos de negocio (propiedades/personas/contrato/
rent_period/concepto recurrente) para los flujos de contrato, cobranzas y
liquidaciones.

**SIN modificar adminprop-back** (regla del ticket) -- este script vive
enteramente en adminprop-front y sólo hace INSERT/UPDATE directos vía SQL
crudo, conectando como el rol superusuario `adminprop` (BYPASSRLS, mismo
rol que usan las migraciones Alembic -- ver
adminprop-back/docs/runbooks/RUNBOOK-LOCAL-001-backend.md §2.6) para no
tener que lidiar con `SET LOCAL app.current_tenant_id` (RLS) desde un
script standalone.

Credenciales/nombres sembrados: ver tests/e2e/support/seed-data.ts
(archivo hermano en TypeScript -- los valores literales de ambos archivos
deben mantenerse en sync a mano, no hay generación cross-lenguaje).

Password hashing: bcrypt cost 12, igual que
adminprop-back/src/adminprop/shared/auth/passwords.py.

Roles/permisos: mirror de
adminprop-back/src/adminprop/modules/superadmin/provisioning.py
(ALL_PERMISSIONS / OWNER_PERMISSIONS / ADMIN_PERMISSIONS /
MAINTENANCE_PERMISSIONS / ROLE_DEFINITIONS / DEFAULT_ORGANIZATION_SETTINGS)
-- copiados literalmente, no importados (repos separados). Si
provisioning.py cambia, actualizar acá también.

Idempotente: se puede correr múltiples veces sobre la misma base (usa
ON CONFLICT / SELECT-then-INSERT / resets explícitos de las filas que un
E2E anterior pudo haber mutado -- rent_periods, charge_entries,
settlements) sin duplicar filas ni romper por violación de UNIQUE.

Uso:
    SEED_DATABASE_URL=postgresql://adminprop:adminprop@localhost:5432/adminprop \\
        python tests/e2e/seed/seed.py
"""

from __future__ import annotations

import os
from datetime import date

import bcrypt
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get(
    "SEED_DATABASE_URL",
    "postgresql://adminprop:adminprop@localhost:5432/adminprop",
)

# ─── Mirror de provisioning.py (adminprop-back) ─────────────────────────
ALL_PERMISSIONS = (
    "landlord:read",
    "landlord:manage",
    "landlord:set-commission",
    "renter:read",
    "renter:manage",
    "property:read",
    "property:manage",
    "contract:read",
    "contract:manage",
    "adjustment:apply",
    "rent-period:read",
    "payment:create",
    "payment:void",
    "charge:manage",
    "settlement:read",
    "settlement:generate",
    "settlement:issue",
    "work-order:read",
    "work-order:create",
    "work-order:quote",
    "work-order:approve",
    "work-order:close",
    "work-order:cancel",
    "attachment:manage",
    "user:manage",
    "role:read",
    "organization:configure",
    "audit:read",
    "notification:read",
)
_ADMIN_EXCLUDED_PERMISSIONS = frozenset(
    {"user:manage", "role:read", "organization:configure", "landlord:set-commission"}
)
OWNER_PERMISSIONS = ALL_PERMISSIONS
ADMIN_PERMISSIONS = tuple(p for p in ALL_PERMISSIONS if p not in _ADMIN_EXCLUDED_PERMISSIONS)
MAINTENANCE_PERMISSIONS = (
    "work-order:read",
    "work-order:quote",
    "work-order:close",
    "attachment:manage",
    "notification:read",
)
ROLE_DEFINITIONS = (
    ("owner", OWNER_PERMISSIONS),
    ("admin", ADMIN_PERMISSIONS),
    ("maintenance", MAINTENANCE_PERMISSIONS),
)
DEFAULT_ORGANIZATION_SETTINGS = {"grace_day": 10, "contract_expiry_notice_days": 60}

# ─── Fixtures -- mirror de tests/e2e/support/seed-data.ts ───────────────
ORG_SLUG = "e2e-org"
ORG_NAME = "Organización E2E"

OWNER_EMAIL = "owner.e2e@adminprop.local"
OWNER_PASSWORD = "E2eOwner1234!"
OWNER_FULL_NAME = "Owner E2E"

ADMIN_EMAIL = "admin.e2e@adminprop.local"
ADMIN_PASSWORD = "E2eAdmin1234!"
ADMIN_FULL_NAME = "Admin E2E"

CONTRACTS_LANDLORD_NAME = "Landlord Contratos E2E"
CONTRACTS_PROPERTY_ADDRESS = "Av. Siempre Viva 742, CABA"
CONTRACTS_RENTER_NAME = "Inquilino E2E"

PAYMENTS_LANDLORD_NAME = "Landlord Cobranzas E2E"
PAYMENTS_PROPERTY_ADDRESS = "Corrientes 1234, CABA"
PAYMENTS_RENTER_NAME = "Inquilino Moroso E2E"
PAYMENTS_AMOUNT_DUE = "100000.00"
PAYMENTS_DAILY_LATE_FEE_PCT = "1.0000"

SETTLEMENTS_LANDLORD_NAME = "Landlord Liquidaciones E2E"
SETTLEMENTS_PROPERTY_ADDRESS = "Belgrano 500, CABA"
SETTLEMENTS_CHARGE_LABEL = "Expensas"


def _hash_password(plain: str) -> str:
    """bcrypt cost 12 -- igual que shared/auth/passwords.py (adminprop-back)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def _months_ago_first_day(months: int, today: date | None = None) -> date:
    today = today or date.today()
    year = today.year
    month = today.month - months
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


def seed_organization(cur) -> str:
    cur.execute(
        """
        INSERT INTO organizations (slug, name, status, settings)
        VALUES (%(slug)s, %(name)s, 'active', %(settings)s)
        ON CONFLICT (slug) DO UPDATE
            SET status = 'active', name = EXCLUDED.name, settings = EXCLUDED.settings
        RETURNING id
        """,
        {
            "slug": ORG_SLUG,
            "name": ORG_NAME,
            "settings": psycopg2.extras.Json(DEFAULT_ORGANIZATION_SETTINGS),
        },
    )
    return cur.fetchone()[0]


def seed_roles(cur, organization_id: str) -> dict[str, str]:
    role_ids: dict[str, str] = {}
    for role_name, permissions in ROLE_DEFINITIONS:
        cur.execute(
            """
            INSERT INTO roles (organization_id, name, permissions, is_system_role)
            VALUES (%(organization_id)s, %(name)s, %(permissions)s, TRUE)
            ON CONFLICT (organization_id, name) DO UPDATE
                SET permissions = EXCLUDED.permissions
            RETURNING id
            """,
            {
                "organization_id": organization_id,
                "name": role_name,
                "permissions": psycopg2.extras.Json(list(permissions)),
            },
        )
        role_ids[role_name] = cur.fetchone()[0]
    return role_ids


def seed_user(cur, *, email: str, password: str, full_name: str) -> str:
    cur.execute(
        """
        INSERT INTO users (email, password_hash, full_name, is_super_admin)
        VALUES (%(email)s, %(password_hash)s, %(full_name)s, FALSE)
        ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
        RETURNING id
        """,
        {"email": email, "password_hash": _hash_password(password), "full_name": full_name},
    )
    return cur.fetchone()[0]


def seed_membership(cur, *, organization_id: str, user_id: str, role_id: str) -> None:
    cur.execute(
        """
        INSERT INTO organization_members (organization_id, user_id, role_id, status)
        VALUES (%(organization_id)s, %(user_id)s, %(role_id)s, 'active')
        ON CONFLICT (organization_id, user_id) DO UPDATE
            SET role_id = EXCLUDED.role_id, status = 'active'
        """,
        {"organization_id": organization_id, "user_id": user_id, "role_id": role_id},
    )


def seed_landlord(cur, *, organization_id: str, name: str) -> str:
    cur.execute(
        "SELECT id FROM landlords WHERE organization_id = %s AND name = %s AND deleted_at IS NULL",
        (organization_id, name),
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        """
        INSERT INTO landlords (organization_id, name, commission_pct)
        VALUES (%s, %s, 10)
        RETURNING id
        """,
        (organization_id, name),
    )
    return cur.fetchone()[0]


def seed_renter(cur, *, organization_id: str, name: str) -> str:
    cur.execute(
        "SELECT id FROM renters WHERE organization_id = %s AND name = %s AND deleted_at IS NULL",
        (organization_id, name),
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO renters (organization_id, name) VALUES (%s, %s) RETURNING id",
        (organization_id, name),
    )
    return cur.fetchone()[0]


def seed_property(cur, *, organization_id: str, landlord_id: str, address: str, status: str) -> str:
    cur.execute(
        "SELECT id FROM properties WHERE organization_id = %s AND address = %s AND deleted_at IS NULL",
        (organization_id, address),
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE properties SET status = %s WHERE id = %s", (status, row[0]))
        return row[0]
    cur.execute(
        """
        INSERT INTO properties (organization_id, landlord_id, address, status)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (organization_id, landlord_id, address, status),
    )
    return cur.fetchone()[0]


def seed_active_contract(
    cur,
    *,
    organization_id: str,
    property_id: str,
    renter_id: str,
    amount: str,
    daily_late_fee_pct: str,
) -> str:
    """Contrato ya `active` para el fixture de cobranzas -- el fixture de
    "alta de contrato" (contracts.spec.ts) crea el SUYO desde cero vía UI,
    éste es sólo el soporte del rent_period vencido."""
    cur.execute(
        "SELECT id FROM contracts WHERE organization_id = %s AND property_id = %s "
        "AND renter_id = %s AND status = 'active' AND deleted_at IS NULL",
        (organization_id, property_id, renter_id),
    )
    row = cur.fetchone()
    if row:
        return row[0]
    start_date = _months_ago_first_day(6)
    end_date = date(start_date.year + 2, start_date.month, 1)
    cur.execute(
        """
        INSERT INTO contracts (
            organization_id, property_id, renter_id, currency,
            initial_amount, current_amount, start_date, end_date,
            daily_late_fee_pct, status
        )
        VALUES (%s, %s, %s, 'ARS', %s, %s, %s, %s, %s, 'active')
        RETURNING id
        """,
        (
            organization_id,
            property_id,
            renter_id,
            amount,
            amount,
            start_date,
            end_date,
            daily_late_fee_pct,
        ),
    )
    return cur.fetchone()[0]


def seed_overdue_rent_period(cur, *, organization_id: str, contract_id: str, amount: str) -> str:
    """Resetea (o crea) el rent_period vencido a `pending`/`paid_total=0`
    en cada corrida -- así el E2E de "cobro con mora perdonada" es
    re-ejecutable en un Postgres local persistente sin quedar `paid` de
    una corrida anterior."""
    period = _months_ago_first_day(2)
    cur.execute(
        """
        INSERT INTO rent_periods (organization_id, contract_id, period, amount_due, currency, status, paid_total)
        VALUES (%(organization_id)s, %(contract_id)s, %(period)s, %(amount)s, 'ARS', 'pending', 0)
        ON CONFLICT (contract_id, period) DO UPDATE
            SET status = 'pending', paid_total = 0, amount_due = EXCLUDED.amount_due
        RETURNING id
        """,
        {
            "organization_id": organization_id,
            "contract_id": contract_id,
            "period": period,
            "amount": amount,
        },
    )
    return cur.fetchone()[0]


def seed_recurring_charge(cur, *, organization_id: str, property_id: str, label: str) -> str:
    cur.execute(
        "SELECT id FROM recurring_charges WHERE organization_id = %s AND property_id = %s "
        "AND label = %s AND deleted_at IS NULL",
        (organization_id, property_id, label),
    )
    row = cur.fetchone()
    if row:
        recurring_charge_id = row[0]
    else:
        cur.execute(
            """
            INSERT INTO recurring_charges (organization_id, property_id, charge_type, label, is_active)
            VALUES (%s, %s, 'otro', %s, TRUE)
            RETURNING id
            """,
            (organization_id, property_id, label),
        )
        recurring_charge_id = cur.fetchone()[0]

    # Limpieza del período actual -- deja el checklist "sin cargar" en
    # cada corrida (el wizard E2E lo carga él mismo), así una corrida
    # local repetida no choca con el UNIQUE (recurring_charge_id, period).
    cur.execute(
        "DELETE FROM charge_entries WHERE recurring_charge_id = %s "
        "AND period = date_trunc('month', CURRENT_DATE)::date",
        (recurring_charge_id,),
    )
    return recurring_charge_id


def reset_contracts_fixture(cur, *, organization_id: str, property_id: str) -> None:
    """Borra cualquier contrato de una corrida anterior sobre la propiedad
    de contracts.spec.ts -- ese E2E crea uno nuevo cada vez (RF-02); sin
    este reset, la segunda corrida local (Postgres persistente) choca con
    `contracts_no_overlap` (RN-C01) contra el contrato `active` que la
    corrida anterior dejó, y el test nunca encuentra una fila `Borrador`
    nueva. Contratos borrados de este fixture también arrastran sus
    `contract_adjustments` (FK sin ON DELETE CASCADE)."""
    cur.execute(
        "SELECT id FROM contracts WHERE organization_id = %s AND property_id = %s",
        (organization_id, property_id),
    )
    ids = [row[0] for row in cur.fetchall()]
    if not ids:
        return
    cur.execute("DELETE FROM contract_adjustments WHERE contract_id = ANY(%s::uuid[])", (ids,))
    cur.execute("DELETE FROM rent_periods WHERE contract_id = ANY(%s::uuid[])", (ids,))
    cur.execute("DELETE FROM contracts WHERE id = ANY(%s::uuid[])", (ids,))


def reset_settlement(cur, *, organization_id: str, landlord_id: str) -> None:
    """Borra cualquier liquidación del mes actual para este landlord de
    una corrida anterior -- UNIQUE (landlord_id, period) rompería el
    `POST /settlements/generate` del wizard E2E si no se limpia."""
    cur.execute(
        "SELECT id FROM settlements WHERE organization_id = %s AND landlord_id = %s "
        "AND period = date_trunc('month', CURRENT_DATE)::date",
        (organization_id, landlord_id),
    )
    ids = [row[0] for row in cur.fetchall()]
    if not ids:
        return
    cur.execute("DELETE FROM settlement_line_items WHERE settlement_id = ANY(%s::uuid[])", (ids,))
    cur.execute("DELETE FROM settlements WHERE id = ANY(%s::uuid[])", (ids,))


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn:
            with conn.cursor() as cur:
                organization_id = seed_organization(cur)
                role_ids = seed_roles(cur, organization_id)

                owner_user_id = seed_user(
                    cur, email=OWNER_EMAIL, password=OWNER_PASSWORD, full_name=OWNER_FULL_NAME
                )
                seed_membership(
                    cur,
                    organization_id=organization_id,
                    user_id=owner_user_id,
                    role_id=role_ids["owner"],
                )

                admin_user_id = seed_user(
                    cur, email=ADMIN_EMAIL, password=ADMIN_PASSWORD, full_name=ADMIN_FULL_NAME
                )
                seed_membership(
                    cur,
                    organization_id=organization_id,
                    user_id=admin_user_id,
                    role_id=role_ids["admin"],
                )

                # ── Fixture 1: alta de contrato (contracts.spec.ts) ──────
                contracts_landlord_id = seed_landlord(
                    cur, organization_id=organization_id, name=CONTRACTS_LANDLORD_NAME
                )
                contracts_property_id = seed_property(
                    cur,
                    organization_id=organization_id,
                    landlord_id=contracts_landlord_id,
                    address=CONTRACTS_PROPERTY_ADDRESS,
                    status="available",
                )
                seed_renter(cur, organization_id=organization_id, name=CONTRACTS_RENTER_NAME)
                reset_contracts_fixture(
                    cur, organization_id=organization_id, property_id=contracts_property_id
                )

                # ── Fixture 2: cobro con mora perdonada (payments.spec.ts) ──
                payments_landlord_id = seed_landlord(
                    cur, organization_id=organization_id, name=PAYMENTS_LANDLORD_NAME
                )
                payments_property_id = seed_property(
                    cur,
                    organization_id=organization_id,
                    landlord_id=payments_landlord_id,
                    address=PAYMENTS_PROPERTY_ADDRESS,
                    status="rented",
                )
                payments_renter_id = seed_renter(
                    cur, organization_id=organization_id, name=PAYMENTS_RENTER_NAME
                )
                payments_contract_id = seed_active_contract(
                    cur,
                    organization_id=organization_id,
                    property_id=payments_property_id,
                    renter_id=payments_renter_id,
                    amount=PAYMENTS_AMOUNT_DUE,
                    daily_late_fee_pct=PAYMENTS_DAILY_LATE_FEE_PCT,
                )
                seed_overdue_rent_period(
                    cur,
                    organization_id=organization_id,
                    contract_id=payments_contract_id,
                    amount=PAYMENTS_AMOUNT_DUE,
                )

                # ── Fixture 3: wizard de liquidación (settlements.spec.ts) ──
                settlements_landlord_id = seed_landlord(
                    cur, organization_id=organization_id, name=SETTLEMENTS_LANDLORD_NAME
                )
                settlements_property_id = seed_property(
                    cur,
                    organization_id=organization_id,
                    landlord_id=settlements_landlord_id,
                    address=SETTLEMENTS_PROPERTY_ADDRESS,
                    status="available",
                )
                seed_recurring_charge(
                    cur,
                    organization_id=organization_id,
                    property_id=settlements_property_id,
                    label=SETTLEMENTS_CHARGE_LABEL,
                )
                reset_settlement(
                    cur, organization_id=organization_id, landlord_id=settlements_landlord_id
                )

        print(f"✓ Seed E2E OK -- organization_id={organization_id}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
