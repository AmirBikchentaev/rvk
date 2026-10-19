import type { Locale } from '@/lib/i18n/locale';

export type DeliverablesSection = {
  id: string;
  title: string;
  lead?: string;
  paragraphs: string[];
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
    'От кандидата ожидались: работающий прототип, объяснение финансовой логики, найденные ошибки в данных и схема дальнейшей архитектуры. Ниже — краткая фиксация по каждому пункту.',
  sections: [
    {
      id: 'prototype',
      title: '1. Работающий прототип',
      lead: 'Что сдано и как проверить',
      paragraphs: [
        'Монорепо (pnpm): NestJS API + PostgreSQL, Next.js dashboard, общий пакет расчётов. Данные загружаются из CSV в `data/` при старте API; фильтры объекта и периода, KPI, три графика, блок качества данных, AI-аналитик (OpenAI function calling или offline-сводка из БД).',
        'Локально: API на :4000, web на :3002; в Docker — compose с nginx на :8080 (или за reverse-proxy reflexive). Dashboard RU/EN, светлая и тёмная тема.',
      ],
      bullets: [
        'Импорт: properties, reservations, payments, expenses, commission_rules',
        'API: `/analytics/*`, `/data-quality/issues`, `/properties`, `/assistant/chat`',
        'Валидация входа (формат propertyId, DTO whitelist); демо без обязательной авторизации',
      ],
    },
    {
      id: 'finance',
      title: '2. Финансовая логика',
      lead: 'Accrual vs cash, период, owner balance',
      paragraphs: [
        'Период: бронь попадает в расчёт, если хотя бы одна ночь пересекается с [from, to] (check-out exclusive). Без дат в query берётся полный диапазон в БД.',
        'Accrual: gross = effective_gross (confirmed/modified, cancelled → 0); OTA — только non-cancelled, отрицательные исключаются; management fee = gross_effective × rate из commission_rules на check_in; opex — только paid по expense_date; net booking = gross − OTA; owner balance (оценка) = net − mgmt fee − paid opex (не банковский остаток).',
        'Cash: сумма payments со status=received по payment_date в периоде. Cash − accrual показывает разрыв дат оплаты и проживания (ожидаемо при refunds, отменах, дублях).',
        'Графики: gross и management fee — по месяцу check-in; cash — по месяцу payment_date, чтобы не смешивать методологии.',
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
      title: '4. Схема дальнейшей архитектуры',
      lead: 'От CSV-прототипа к production finance stack',
      paragraphs: [
        'Следующие шаги: staging + идемпотентный upsert importers и таблица import_runs; явная модель owner statement (accrual period vs cash calendar) и reconciliation UI; RBAC по owner_id, webhooks OTA/банка вместо ручного CSV.',
        'Audit: immutable financial_events, лог изменений строк; row-level доступ owner vs finance.',
      ],
      diagram: [
        'PMS / OTA · Bank · Ops expenses',
        '        ↓',
        'CSV/API importers → Validation & DQ → Staging',
        '        ↓',
        'PostgreSQL ← Accrual & cash engines ← Audit log',
        '        ↓',
        'NestJS REST (+ RBAC) → Next.js dashboard',
      ],
      bullets: [
        'Natural keys: reservation_id+updated_at, payment_id, expense_id',
        'Upsert staging → merge в canonical tables в транзакции',
        'import_runs: hash файла, counts, diff summary',
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
  pageTitle: 'Assignment deliverables',
  pageLead:
    'Expected from the candidate: a working prototype, explanation of financial logic, data issues found, and a target architecture. Below is a concise summary for each.',
  sections: [
    {
      id: 'prototype',
      title: '1. Working prototype',
      lead: 'What is delivered and how to verify',
      paragraphs: [
        'pnpm monorepo: NestJS API + PostgreSQL, Next.js dashboard, shared finance package. CSV under `data/` is loaded on API startup; property and period filters, KPIs, three charts, data quality panel, AI analyst (OpenAI function calling or offline DB summary).',
        'Local: API :4000, web :3002; Docker Compose with nginx on :8080 (or behind reflexive reverse proxy). RU/EN UI, light and dark theme.',
      ],
      bullets: [
        'Import: properties, reservations, payments, expenses, commission_rules',
        'API: `/analytics/*`, `/data-quality/issues`, `/properties`, `/assistant/chat`',
        'Input validation (propertyId format, DTO whitelist); demo API without mandatory auth',
      ],
    },
    {
      id: 'finance',
      title: '2. Financial logic',
      lead: 'Accrual vs cash, period, owner balance',
      paragraphs: [
        'Period: a reservation counts if at least one night overlaps [from, to] (check-out exclusive). With no dates in query, the full DB span is used.',
        'Accrual: gross = effective_gross (confirmed/modified; cancelled → 0); OTA for non-cancelled only, negative fees excluded; management fee = gross_effective × rate from commission_rules on check_in; opex = paid only by expense_date; net booking = gross − OTA; owner balance (estimate) = net − mgmt fee − paid opex (not bank balance).',
        'Cash: sum of payments with status=received by payment_date in period. Cash − accrual reflects payment vs stay timing (expected with refunds, cancellations, duplicates).',
        'Charts: gross and management fee by check-in month; cash by payment_date month so methodologies are not mixed.',
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
      title: '4. Target architecture',
      lead: 'From CSV prototype to production finance stack',
      paragraphs: [
        'Next steps: staging + idempotent upsert importers and import_runs; explicit owner statement model (accrual period vs cash calendar) and reconciliation UI; RBAC by owner_id, OTA/bank webhooks instead of manual CSV.',
        'Audit: immutable financial_events, row change log; row-level owner vs finance access.',
      ],
      diagram: [
        'PMS / OTA · Bank · Ops expenses',
        '        ↓',
        'CSV/API importers → Validation & DQ → Staging',
        '        ↓',
        'PostgreSQL ← Accrual & cash engines ← Audit log',
        '        ↓',
        'NestJS REST (+ RBAC) → Next.js dashboard',
      ],
      bullets: [
        'Natural keys: reservation_id+updated_at, payment_id, expense_id',
        'Upsert staging → merge to canonical tables in one transaction',
        'import_runs: file hash, counts, diff summary',
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
