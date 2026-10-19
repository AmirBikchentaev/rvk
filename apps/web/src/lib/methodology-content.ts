import type { Locale } from '@/lib/i18n/locale';

export type FormulaKind = 'accrual' | 'cash' | 'bridge' | 'period';

export type FormulaDef = {
  label: string;
  expression: string;
  note: string;
  kind?: FormulaKind;
};

export type MethodologyBlock = {
  title: string;
  paragraphs: string[];
  formulas?: FormulaDef[];
  bullets?: string[];
};

export type MethodologyDoc = {
  pageTitle: string;
  pageLead: string;
  accrualVsCashTitle: string;
  accrualVsCashBody: string[];
  blocks: MethodologyBlock[];
  estimateTitle: string;
  estimateBullets: string[];
  missingForExactTitle: string;
  missingForExactBullets: string[];
};

const ru: MethodologyDoc = {
  pageTitle: 'Финансовая методология и формулы',
  pageLead:
    'Ниже — как именно считаются KPI на dashboard. Логика реализована в `packages/shared/finance.ts` и совпадает с API. Accrual (начисления по проживанию) и cash (денежные поступления) разделены намеренно; owner balance — оценка, не банковский остаток.',
  accrualVsCashTitle: 'Почему accrual и cash не смешиваем',
  accrualVsCashBody: [
    'Accrual отвечает на вопрос «какую выручку/обязательства мы признаём за период проживания» — даты check-in/check-out, статус брони, комиссии по правилам.',
    'Cash отвечает «когда деньги реально пришли на счёт» — только payment_date и status=received.',
    'Сравнение cash − accrual — диагностика разрыва календарей (оплата раньше/позже заезда, refunds, отмены, дубли платежей), а не «ошибка одной цифры».',
    'На графиках gross/management fee группируются по месяцу check-in; cash — по месяцу payment_date (см. подсказку на вкладке «Графики»).',
  ],
  blocks: [
    {
      title: 'Период и фильтр объекта',
      paragraphs: [
        'propertyId опционален — иначе агрегат по всем валидным объектам (V### из справочника).',
        'Платежи и расходы фильтруются по своим датам (payment_date / expense_date) в том же [from, to]. Без дат в query API берёт полный диапазон в БД.',
      ],
      formulas: [
        {
          label: 'Попадание брони в период',
          expression: 'check_in < to  ∧  check_out > from\n[from, to) — check-out exclusive',
          note: 'Хотя бы одна ночь проживания пересекается с интервалом; ночь выезда не входит в stay.',
          kind: 'period',
        },
      ],
    },
    {
      title: 'Accrual — начисления (выручка и комиссии)',
      paragraphs: [
        'Перед агрегатами дубликаты reservation_id схлопываются: остаётся строка с max(updated_at).',
        'Строки с неизвестным property, FX ≠ IDR без таблицы курсов и отрицательной OTA в суммы не входят (флаги DQ / estimateNotes).',
      ],
      formulas: [
        {
          label: 'Gross bookings',
          expression: 'Gross = Σ effective_gross\neffective_gross = max(0, gross − refund)',
          note: 'confirmed / modified; cancelled → 0',
          kind: 'accrual',
        },
        {
          label: 'OTA fees',
          expression: 'OTA = Σ ota_fee\n(non-cancelled, ota_fee ≥ 0)',
          note: 'Отрицательные комиссии исключаются (review)',
          kind: 'accrual',
        },
        {
          label: 'Management fee',
          expression: 'Mgmt fee = Σ (effective_gross × rate)\nrate ← commission_rules @ check_in',
          note: 'База fee = gross_booking_value; OTA из базы не вычитается в прототипе',
          kind: 'accrual',
        },
        {
          label: 'Net booking (accrual)',
          expression: 'Net = Gross − OTA',
          note: 'Без management fee — база для сравнения с cash',
          kind: 'accrual',
        },
        {
          label: 'Operational expenses',
          expression: 'Opex = Σ amount\npaid ∧ expense_date ∈ [from, to]',
          note: 'Только IDR и известный property',
          kind: 'accrual',
        },
        {
          label: 'Owner balance (оценка)',
          expression: 'Owner ≈ Net − Mgmt fee − Opex',
          note: 'Не банковский остаток: без payout, налогов, FX',
          kind: 'accrual',
        },
      ],
    },
    {
      title: 'Cash — денежный поток',
      paragraphs: [
        'Cash не пересчитывает брони — только фактические поступления из payments.',
      ],
      formulas: [
        {
          label: 'Cash received',
          expression: 'Cash = Σ amount\nreceived ∧ payment_date ∈ [from, to]',
          note: 'Дубликаты payment_id — одна строка в cash',
          kind: 'cash',
        },
        {
          label: 'Cash − accrual',
          expression: 'Gap = Cash − Net',
          note: 'Разрыв календарей оплаты и проживания (refunds, отмены, дубли)',
          kind: 'bridge',
        },
      ],
    },
    {
      title: 'Отмены, modified, refunds',
      paragraphs: [
        'cancelled: gross и OTA в KPI = 0; refund_amount в CSV часто равен полному gross — для P&L после отмены выручка не начисляется.',
        'modified: учитываются как активные брони (вероятная финальная версия); пересечения дат с confirmed — review, без автоматического merge.',
        'partial refund (R0072): effective_gross уменьшается на refund_amount; политика fee на partial refund — открытый вопрос к CFO (см. отчёт).',
      ],
      bullets: [
        'Дубликат reservation_id → одна каноническая строка (updated_at)',
        'Дубликат payment_id → один платёж в cash',
        'USD (R0061) без FX → исключена из IDR-сумм',
      ],
    },
  ],
  estimateTitle: 'Когда результат помечен «оценочный»',
  estimateBullets: [
    'Бронь не в IDR — исключена из KPI (нет FX)',
    'Нет commission_rule на check_in — fee для строки = 0, в notes предупреждение',
    'Отрицательная OTA — строка не в сумме OTA',
    'Pending expenses не в opex — только paid',
    'Owner balance всегда с disclaimer: это не остаток на счёте',
  ],
  missingForExactTitle: 'Чего не хватает для «точного» owner balance',
  missingForExactBullets: [
    'Ledger выплат владельцам (payout) и удержаний',
    'Таблица FX и политика даты курса',
    'Закрытые accounting periods и каноническая строка при overlap modified/confirmed',
    'Management fee при partial refund — до или после refund',
    'Expenses pending: accrual vs cash basis для opex',
  ],
};

const en: MethodologyDoc = {
  pageTitle: 'Financial methodology and formulas',
  pageLead:
    'How dashboard KPIs are calculated. Logic lives in `packages/shared/finance.ts` and matches the API. Accrual (stay-based recognition) and cash (receipts) are intentionally separate; owner balance is an estimate, not bank balance.',
  accrualVsCashTitle: 'Why accrual and cash stay separate',
  accrualVsCashBody: [
    'Accrual: revenue/obligations for the stay period — check-in/out, booking status, commission rules.',
    'Cash: when money actually arrived — payment_date and status=received only.',
    'Cash − accrual is a calendar diagnostic (pay before/after stay, refunds, cancellations, duplicate payments), not a single “wrong total”.',
    'Charts group gross/management fee by check-in month; cash by payment_date month.',
  ],
  blocks: [
    {
      title: 'Period and property filter',
      paragraphs: [
        'Optional propertyId — otherwise aggregate all valid properties (V### in catalog).',
        'Payments and expenses use payment_date / expense_date in the same [from, to]. With no dates in query, the API uses the full DB span.',
      ],
      formulas: [
        {
          label: 'Booking in period',
          expression: 'check_in < to  ∧  check_out > from\n[from, to) — check-out exclusive',
          note: 'At least one stay night overlaps the interval; checkout night excluded.',
          kind: 'period',
        },
      ],
    },
    {
      title: 'Accrual — recognition',
      paragraphs: [
        'Duplicate reservation_id rows collapse to max(updated_at) before aggregates.',
        'Unknown property, non-IDR without FX, and negative OTA are excluded from sums (DQ / estimateNotes).',
      ],
      formulas: [
        {
          label: 'Gross bookings',
          expression: 'Gross = Σ effective_gross\neffective_gross = max(0, gross − refund)',
          note: 'confirmed / modified; cancelled → 0',
          kind: 'accrual',
        },
        {
          label: 'OTA fees',
          expression: 'OTA = Σ ota_fee\n(non-cancelled, ota_fee ≥ 0)',
          note: 'Negative fees excluded (review)',
          kind: 'accrual',
        },
        {
          label: 'Management fee',
          expression: 'Mgmt fee = Σ (effective_gross × rate)\nrate ← commission_rules @ check_in',
          note: 'Fee basis = gross_booking_value',
          kind: 'accrual',
        },
        {
          label: 'Net booking (accrual)',
          expression: 'Net = Gross − OTA',
          note: 'Excludes management fee — cash comparison base',
          kind: 'accrual',
        },
        {
          label: 'Operational expenses',
          expression: 'Opex = Σ amount\npaid ∧ expense_date ∈ [from, to]',
          note: 'IDR and known property only',
          kind: 'accrual',
        },
        {
          label: 'Owner balance (estimate)',
          expression: 'Owner ≈ Net − Mgmt fee − Opex',
          note: 'Not bank balance — no payouts, tax, FX',
          kind: 'accrual',
        },
      ],
    },
    {
      title: 'Cash — receipts',
      paragraphs: ['Cash uses payments only, not recomputed from bookings.'],
      formulas: [
        {
          label: 'Cash received',
          expression: 'Cash = Σ amount\nreceived ∧ payment_date ∈ [from, to]',
          note: 'Duplicate payment_id counted once',
          kind: 'cash',
        },
        {
          label: 'Cash − accrual',
          expression: 'Gap = Cash − Net',
          note: 'Payment vs stay timing (refunds, cancellations, duplicates)',
          kind: 'bridge',
        },
      ],
    },
    {
      title: 'Cancellations, modified, refunds',
      paragraphs: [
        'cancelled: gross/OTA = 0 in KPIs; refund_amount in CSV often equals full gross.',
        'modified: treated as active; overlaps with confirmed → review, no auto-merge.',
        'partial refund: effective_gross reduced; fee policy — open CFO question.',
      ],
      bullets: [
        'Duplicate reservation_id → one canonical row (updated_at)',
        'Duplicate payment_id → one cash row',
        'USD without FX → excluded from IDR totals',
      ],
    },
  ],
  estimateTitle: 'When KPIs are marked as estimates',
  estimateBullets: [
    'Non-IDR booking excluded (no FX table)',
    'Missing commission_rule on check_in — fee 0 + warning',
    'Negative OTA excluded from OTA sum',
    'Pending expenses not in opex — paid only',
    'Owner balance always includes “not bank balance” disclaimer',
  ],
  missingForExactTitle: 'Missing inputs for a “exact” owner balance',
  missingForExactBullets: [
    'Owner payout ledger and withholdings',
    'FX table and rate date policy',
    'Closed periods and canonical row for modified/confirmed overlaps',
    'Management fee on partial refund — before or after refund',
    'Pending expenses — accrual vs cash for opex',
  ],
};

export function getMethodologyDoc(locale: Locale): MethodologyDoc {
  return locale === 'en' ? en : ru;
}

/** All formula cards across blocks (Methodology tab + report §2). */
export function getMethodologyFormulas(locale: Locale): FormulaDef[] {
  const doc = getMethodologyDoc(locale);
  return doc.blocks.flatMap((b) => b.formulas ?? []);
}
