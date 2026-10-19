# Architecture (target state)

```mermaid
flowchart LR
  subgraph sources [Sources]
    PMS[PMS / OTA exports]
    BANK[Bank & payouts]
    OPS[Ops expenses]
  end

  subgraph ingest [Ingestion]
    IMP[CSV/API importers]
    VAL[Validation & DQ rules]
    STG[(Staging tables)]
  end

  subgraph core [Core]
    PG[(PostgreSQL)]
    CALC[Accrual & cash engines]
    AUD[Audit log]
  end

  subgraph access [Access]
    API[NestJS REST]
    WEB[Next.js dashboard]
    RBAC[Roles: owner / finance / ops]
  end

  PMS --> IMP
  BANK --> IMP
  OPS --> IMP
  IMP --> VAL --> STG --> PG
  PG --> CALC --> API --> WEB
  VAL --> AUD
  PG --> AUD
  API --> RBAC
```

## Idempotent re-import

- Natural keys: `reservation_id + updated_at`, `payment_id`, `expense_id`.
- Upsert into staging, then merge into canonical tables in a transaction.
- `import_runs` table stores file hash, row counts, and diff summary.

## Audit & access

- Row-level `owner_id` on properties; finance sees all, owners see their portfolio.
- Immutable `financial_events` for posted management fees and owner statements.
- JWT + refresh tokens (prototype); production: SSO and scoped API keys for integrations.
