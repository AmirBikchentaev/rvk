import type { Locale } from '@/lib/i18n/locale';

export type DeliverablesSection = {
  id: string;
  title: string;
  lead?: string;
  paragraphs: string[];
  paragraphsAfterTable?: string[];
  bullets?: string[];
  table?: { headers: [string, string, string]; rows: [string, string, string][] };
  diagram?: string[];
};

export type DeliverablesDoc = {
  pageTitle: string;
  pageLead: string;
  sections: DeliverablesSection[];
  cfoTitle: string;
  cfoQuestions: string[];
};

const ru: DeliverablesDoc = {
  pageTitle: 'Отчёт по тестовому заданию',
  pageLead:
    'Это отчёт по тестовому заданию Senior Business Systems Engineer (Finance & Automation): dashboard (§1), методология (§2 + вкладка «Методология»), качество данных (§3), архитектура с re-import/audit/RBAC (§4).',
  sections: [
    {
      id: 'prototype',
      title: '1. Dashboard — работающий прототип',
      lead: 'Соответствие формулировке задания (фильтры + KPI + accrual vs cash)',
      paragraphs: [
        'Минимальный dashboard на вкладке KPI: фильтры объекта и периода управляют `GET /analytics/summary` (и графиками). Период по умолчанию — весь диапазон дат в БД; опционально «Свой период (from / to)».',
        'Разница начислений и денег: карточки Accrual net booking, Cash received и Cash − accrual (cash минус net booking). Owner balance подписан как оценка; при допущениях — баннер «Расчёт оценочный».',
      ],
      table: {
        headers: ['Требование задания', 'Где в прототипе', 'Как считается'],
        rows: [
          ['Фильтр по объекту', 'Блок «Фильтры» + KPI', 'propertyId → summary API'],
          ['Фильтр по периоду', 'Авто period-bounds + опционально from/to', 'Ночи проживания / payment_date / expense_date'],
          ['Gross bookings', 'Карточка KPI', 'Σ effective_gross (accrual)'],
          ['OTA fees', 'Карточка KPI', 'Σ ota_fee, non-cancelled'],
          ['Management fees', 'Карточка KPI', 'commission_rules × gross на check_in'],
          ['Операционные расходы', 'Карточка KPI (paid)', 'expenses payment_status=paid'],
          ['Owner balance (примерный)', 'Карточка + disclaimer', 'net − fee − paid opex, оценка'],
          ['Начисления vs cash', 'Cash received · Accrual net · Cash − accrual', 'Разные календари → вкладка «Методология»'],
        ],
      },
      paragraphsAfterTable: [
        'Стек: pnpm monorepo, NestJS + Postgres, Next.js; формулы в `@villa/shared`. Деплой: Docker Compose (UI :8080, API :4002). Проверка: KPI не пустые, фильтр объектов, `/api/health` → propertyCount > 0.',
      ],
      diagram: [
        'Браузер',
        '   │  /        → Next.js (apps/web)',
        '   │  /api/*   → NestJS (apps/api)',
        '   ▼',
        'nginx :8080  ──→  web:3000',
        '              └──→  api:4000  ──→  PostgreSQL',
        '                         ▲',
        '              ImportBootstrap: data/*.csv → facts',
        '              AnalyticsService ← @villa/shared finance.ts',
        '              Assistant → tools → Analytics + DataQuality',
      ],
      bullets: [
        'shared: типы, finance.ts (KPI/агрегаты), data-quality.ts (коды exclude/review)',
        'REST: GET `/properties`, `/analytics/summary|timeseries|by-property|by-channel|period-bounds`, GET `/data-quality/issues`, POST `/assistant/chat`, GET `/health`',
        'CSV-импорт: properties, reservations, payments, expenses, commission_rules',
        'Защита ввода: ValidationPipe whitelist, propertyId V### + exists; Throttler, helmet, CORS; JWT опционален',
        'Стек: TypeORM, Postgres 16, Recharts, TanStack Query, Nest 11 / Next 15',
      ],
    },
    {
      id: 'finance',
      title: '2. Финансовая логика',
      lead: 'Accrual vs cash, период, owner balance — подробно во вкладке «Методология»',
      paragraphs: [
        'Ниже — те же формулы, что на вкладке «Методология» (и в `packages/shared/finance.ts`). Подробнее про отмены, refunds и пробелы для точного owner balance — там же.',
      ],
      table: {
        headers: ['Показатель', 'Источник', 'Правило'],
        rows: [
          ['Gross bookings', 'reservations', 'effective_gross, без cancelled'],
          ['Management fee', 'reservations + rules', 'rate на дату check_in'],
          ['Cash received', 'payments', 'received + payment_date в периоде'],
          ['Owner balance', 'расчёт', 'accrual net − fee − paid opex'],
        ],
      },
    },
    {
      id: 'errors',
      title: '3. Найденные ошибки и риски в данных',
      lead: 'Скан исходных CSV; полный список — вкладка «Данные»',
      paragraphs: [
        'Число на бейджe «Данные» — это проблемные кейсы (exclude/review), а не количество всех строк CSV. Дубликаты reservation_id дедуплицируются по max(updated_at) перед агрегатами.',
      ],
      table: {
        headers: ['Код', 'Пример', 'Действие в прототипе'],
        rows: [
          ['DUPLICATE_RESERVATION_ID', 'R0015', 'Одна строка в KPI'],
          ['UNKNOWN_PROPERTY', 'V999, V777', 'exclude из агрегатов'],
          ['FOREIGN_CURRENCY', 'R0061 USD', 'exclude без таблицы FX'],
          ['NEGATIVE_OTA_FEE', 'R0102', 'exclude из суммы OTA'],
          ['DUPLICATE_PAYMENT_ID', 'P0075', 'Один платёж в cash'],
          ['OVERLAPPING_STAY', '74 пары', 'review, без auto-merge'],
          ['PARTIAL_REFUND', 'R0072', 'review политики refund'],
        ],
      },
    },
    {
      id: 'architecture',
      title: '4. Архитектура — целевая система',
      lead: 'Схема потока данных и три обязательных механизма: re-import, audit, доступ',
      paragraphs: [
        'Целевой контур по формулировке задания: источники → загрузка → проверка и хранение → расчёты → Dashboard. Ниже — схема; таблица отвечает на повторный импорт без дублей, аудит изменений и разграничение доступа.',
        'Сейчас (прототип): CSV в образе API → ImportBootstrap → PostgreSQL → AnalyticsService / `@villa/shared` → Next.js dashboard. Упрощённо: без staging, без полного audit ledger и без prod RBAC.',
      ],
      diagram: [
        '① Источники данных',
        '   PMS / OTA exports · банк / payouts · операционные расходы',
        '        ↓',
        '② Загрузка',
        '   Webhooks · SFTP · CSV/API importers · очередь (outbox)',
        '        ↓',
        '③ Проверка и хранение',
        '   Validation & DQ → staging (raw) → merge → canonical PostgreSQL',
        '        ↘ audit log / import_runs',
        '        ↓',
        '④ Расчёты',
        '   Accrual & cash engines (shared finance.ts) → read-models / snapshots',
        '        ↓',
        '⑤ Dashboard',
        '   NestJS REST (+ RBAC) → Next.js · owner portal · exports',
      ],
      table: {
        headers: ['Требование задания', 'Целевое решение (prod)', 'В прототипе'],
        rows: [
          [
            'Повторный импорт без дублей',
            'Natural keys (reservation_id+updated_at, payment_id, expense_id); upsert staging→canonical в одной TX; import_runs (file hash, counts, diff); идempotent workers',
            'Dedupe reservation_id по max(updated_at); duplicate payment_id — один cash; полный reload CSV при старте API',
          ],
          [
            'Аудит изменений',
            'Append-only financial_events; row-level diff per import_run; кто/когда/что изменил; freeze accounting periods',
            'Логи import в API; DQ-флаги; нет immutable ledger — задел под import_runs + event table',
          ],
          [
            'Разграничение доступа',
            'RBAC: owner / finance / ops; RLS в PG по owner_id; scoped API keys; SSO в prod',
            'Демо API без обязательной auth; validation propertyId; опциональный JWT / demo user',
          ],
        ],
      },
      paragraphsAfterTable: [
        'Масштабирование: materialized views для KPI, read replica, Redis-invalidation после import, schema contracts на OTA-файлы. Подробнее: docs/architecture.md. В UI — эта же §4 на вкладке «Отчёт по тестовому заданию».',
      ],
      bullets: [
        'Сбой DQ gate → rollback import_run, canonical не меняется',
        'Owner видит только свой portfolio; finance — весь портфель',
        'KPI drill-down до reservation_id / payment_id',
      ],
    },
  ],
  cfoTitle: 'Вопросы к CFO (не решены в прототипе)',
  cfoQuestions: [
    'Management fee на partial refund (R0072): от gross до или после refund?',
    'Modified vs confirmed при overlap — какая запись каноническая?',
    'OTA fee на Direct channel: ошибка или скрытая комиссия?',
    'Курс USD→IDR: дата check-in или payment?',
    'Expenses pending — начислять в P&L или только при paid?',
  ],
};

const en: DeliverablesDoc = {
  pageTitle: 'Test assignment report',
  pageLead:
    'Test assignment report: dashboard (§1), methodology (§2 + Methodology tab), data quality (§3), architecture with re-import/audit/RBAC (§4).',
  sections: [
    {
      id: 'prototype',
      title: '1. Dashboard — working prototype',
      lead: 'Assignment checklist: filters, KPIs, accrual vs cash',
      paragraphs: [
        'Minimal dashboard on the KPI tab: property and period filters drive `GET /analytics/summary`. Default period = full DB span; optional custom from/to.',
        'Accrual vs cash: Accrual net booking, Cash received, and Cash − accrual cards. Owner balance labeled as estimate; yellow banner when assumptions apply.',
      ],
      table: {
        headers: ['Assignment requirement', 'In the UI', 'Calculation'],
        rows: [
          ['Property filter', 'Filters panel + KPI', 'propertyId → summary API'],
          ['Period filter', 'Auto period-bounds + optional from/to', 'Stay nights / payment_date / expense_date'],
          ['Gross bookings', 'KPI card', 'Σ effective_gross (accrual)'],
          ['OTA fees', 'KPI card', 'Σ ota_fee, non-cancelled'],
          ['Management fees', 'KPI card', 'commission_rules × gross on check_in'],
          ['Operational expenses', 'KPI card (paid)', 'expenses payment_status=paid'],
          ['Owner balance (estimate)', 'KPI card + disclaimer', 'net − fee − paid opex'],
          ['Accrual vs cash', 'Cash · Accrual net · Cash − accrual', 'Separate calendars → Methodology tab'],
        ],
      },
      paragraphsAfterTable: [
        'Stack: pnpm monorepo, NestJS + Postgres, Next.js; formulas in `@villa/shared`. Deploy: Docker (UI :8080, API :4002). Verify: non-empty KPIs, property dropdown, `/api/health` propertyCount > 0.',
      ],
      diagram: [
        'Browser',
        '   │  /        → Next.js (apps/web)',
        '   │  /api/*   → NestJS (apps/api)',
        '   ▼',
        'nginx :8080  ──→  web:3000',
        '              └──→  api:4000  ──→  PostgreSQL',
        '                         ▲',
        '              ImportBootstrap: data/*.csv → facts',
        '              AnalyticsService ← @villa/shared finance.ts',
        '              Assistant → tools → Analytics + DataQuality',
      ],
      bullets: [
        'shared: types, finance.ts (KPI/aggregates), data-quality.ts (exclude/review codes)',
        'REST: GET `/properties`, `/analytics/summary|timeseries|by-property|by-channel|period-bounds`, GET `/data-quality/issues`, POST `/assistant/chat`, GET `/health`',
        'CSV import: properties, reservations, payments, expenses, commission_rules',
        'Input hardening: ValidationPipe whitelist, propertyId V### + exists; Throttler, helmet, CORS; JWT optional',
        'Stack: TypeORM, Postgres 16, Recharts, TanStack Query, Nest 11 / Next 15',
      ],
    },
    {
      id: 'finance',
      title: '2. Financial logic',
      lead: 'Accrual vs cash, period, owner balance — full detail on Methodology tab',
      paragraphs: [
        'Same formulas as the Methodology tab (and `packages/shared/finance.ts`). Cancellations, refunds, and gaps for an exact owner balance — there in full.',
      ],
      table: {
        headers: ['Metric', 'Source', 'Rule'],
        rows: [
          ['Gross bookings', 'reservations', 'effective_gross, no cancelled'],
          ['Management fee', 'reservations + rules', 'rate on check_in date'],
          ['Cash received', 'payments', 'received + payment_date in period'],
          ['Owner balance', 'derived', 'accrual net − fee − paid opex'],
        ],
      },
    },
    {
      id: 'errors',
      title: '3. Data errors and risks found',
      lead: 'Source CSV scan; full list on the Data quality tab',
      paragraphs: [
        'The badge on Data is flagged cases (exclude/review), not total CSV row count. Duplicate reservation_id rows are deduped by max(updated_at) before aggregates.',
      ],
      table: {
        headers: ['Code', 'Example', 'Prototype action'],
        rows: [
          ['DUPLICATE_RESERVATION_ID', 'R0015', 'Single row in KPIs'],
          ['UNKNOWN_PROPERTY', 'V999, V777', 'exclude from aggregates'],
          ['FOREIGN_CURRENCY', 'R0061 USD', 'exclude without FX table'],
          ['NEGATIVE_OTA_FEE', 'R0102', 'exclude from OTA sum'],
          ['DUPLICATE_PAYMENT_ID', 'P0075', 'One payment in cash'],
          ['OVERLAPPING_STAY', '74 pairs', 'review, no auto-merge'],
          ['PARTIAL_REFUND', 'R0072', 'review refund policy'],
        ],
      },
    },
    {
      id: 'architecture',
      title: '4. Architecture — target system',
      lead: 'Data-flow schema plus re-import, audit, and access control',
      paragraphs: [
        'Assignment pipeline: sources → ingestion → validation & storage → calculations → Dashboard. Diagram below; table covers idempotent re-import, change audit, and access boundaries.',
        'Today (prototype): CSV in API image → ImportBootstrap → PostgreSQL → AnalyticsService / `@villa/shared` → Next.js. Simplified: no staging, no full audit ledger, no production RBAC.',
      ],
      diagram: [
        '① Data sources',
        '   PMS / OTA · bank / payouts · operational expenses',
        '        ↓',
        '② Ingestion',
        '   Webhooks · SFTP · CSV/API importers · queue (outbox)',
        '        ↓',
        '③ Validation & storage',
        '   DQ rules → staging → merge → canonical PostgreSQL',
        '        ↘ audit log / import_runs',
        '        ↓',
        '④ Calculations',
        '   Accrual & cash engines (shared finance.ts) → read-models',
        '        ↓',
        '⑤ Dashboard',
        '   NestJS REST (+ RBAC) → Next.js · owner portal · exports',
      ],
      table: {
        headers: ['Assignment topic', 'Production design', 'In prototype'],
        rows: [
          [
            'Re-import without duplicates',
            'Natural keys; staging→canonical upsert in one TX; import_runs (hash, counts, diff); idempotent workers',
            'Dedupe reservation_id by max(updated_at); one cash row per payment_id; full CSV reload on API start',
          ],
          [
            'Change audit',
            'Append-only financial_events; per-import row diff; actor + timestamp; closed accounting periods',
            'Import logs; DQ flags; no immutable ledger yet — import_runs + events planned',
          ],
          [
            'Access control',
            'RBAC owner/finance/ops; PG RLS on owner_id; integration API keys; SSO',
            'Open demo API; propertyId validation; optional JWT / demo user',
          ],
        ],
      },
      paragraphsAfterTable: [
        'Scale path: materialized KPI views, read replicas, Redis cache invalidation, OTA schema contracts, AI via typed tools only. See docs/architecture.md in the repo.',
      ],
      bullets: [
        'Failed DQ gate → rollback import_run',
        'Owners see own portfolio; finance sees all',
        'KPI drill-down to source rows',
      ],
    },
  ],
  cfoTitle: 'Open CFO questions (not resolved in prototype)',
  cfoQuestions: [
    'Management fee on partial refund (R0072): on gross before or after refund?',
    'Modified vs confirmed overlap — which row is canonical?',
    'OTA fee on Direct channel: data error or hidden commission?',
    'USD→IDR rate: check-in date or payment date?',
    'Pending expenses: accrue in P&L or only when paid?',
  ],
};

export function getDeliverablesDoc(locale: Locale): DeliverablesDoc {
  return locale === 'en' ? en : ru;
}
