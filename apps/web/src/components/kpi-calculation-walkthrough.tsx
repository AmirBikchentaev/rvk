'use client';

import type { KpiBreakdown } from '@villa/shared';
import type { Dictionary } from '@/lib/i18n/dictionaries';

function fmtIdr(intlLocale: string, n: number) {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

function exclusionLabel(code: KpiBreakdown['exclusions'][0]['code'], t: Dictionary): string {
  switch (code) {
    case 'DUPLICATE_ROW':
      return t.kpiBreakExclDuplicate;
    case 'OUTSIDE_PERIOD':
      return t.kpiBreakExclOutsidePeriod;
    case 'UNKNOWN_PROPERTY':
      return t.kpiBreakExclUnknownProperty;
    case 'FOREIGN_CURRENCY':
      return t.kpiBreakExclFx;
    case 'NEGATIVE_OTA':
      return t.kpiBreakExclNegativeOta;
    case 'CANCELLED_ZERO':
      return t.kpiBreakExclCancelled;
    default:
      return code;
  }
}

function CalcStep({
  title,
  formula,
  detail,
}: {
  title: string;
  formula: string;
  detail?: string;
}) {
  return (
    <div className="vf-formula-card vf-formula-card--accrual">
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
      <div className="vf-formula-expr mt-2 text-left text-sm">{formula}</div>
      {detail ? <p className="mt-2 text-xs text-[var(--text-muted)]">{detail}</p> : null}
    </div>
  );
}

export function KpiCalculationWalkthrough({
  breakdown,
  t,
  intlLocale,
  propertyLabel,
  embedded = false,
}: {
  breakdown: KpiBreakdown;
  t: Dictionary;
  intlLocale: string;
  propertyLabel: string;
  /** Without outer panel/title when opened from KPI collapse control */
  embedded?: boolean;
}) {
  const s = breakdown.summary;
  const f = breakdown.filters;
  const c = breakdown.counts;
  const idr = (n: number) => fmtIdr(intlLocale, n);

  return (
    <section className={embedded ? 'space-y-4' : 'vf-panel space-y-4 p-5'}>
      {!embedded ? (
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{t.kpiBreakTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{t.kpiBreakLead}</p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{t.kpiBreakLead}</p>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <p>
          <span className="font-medium text-[var(--text-primary)]">{t.kpiBreakScope}: </span>
          {propertyLabel} · {f.from} — {f.to}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
          <li>
            {t.kpiBreakReservationsDb
              .replace('{raw}', String(c.reservationsRaw))
              .replace('{deduped}', String(c.reservationsDeduped))}
          </li>
          <li>
            {t.kpiBreakReservationsPeriod.replace('{n}', String(c.reservationsOverlapPeriod))}
          </li>
          <li>{t.kpiBreakReservationsSum.replace('{n}', String(c.reservationsInAccrualSum))}</li>
          <li>{t.kpiBreakPayments.replace('{n}', String(c.paymentsCashLines))}</li>
          <li>{t.kpiBreakExpenses.replace('{n}', String(c.expensesOpexLines))}</li>
        </ul>
      </div>

      {breakdown.exclusions.length > 0 ? (
        <div className="text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">{t.kpiBreakExclusionsTitle}</p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {breakdown.exclusions.map((e) => (
              <li key={e.code}>
                {exclusionLabel(e.code, t)}: {e.count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <CalcStep
          title={t.grossBookings}
          formula={`Gross = ${idr(s.grossBookings)}`}
          detail={t.kpiBreakGrossDetail.replace('{n}', String(c.reservationsInAccrualSum))}
        />
        <CalcStep
          title={t.otaFees}
          formula={`OTA = ${idr(s.otaFees)}`}
          detail={t.kpiBreakOtaDetail}
        />
        <CalcStep
          title={t.accrualNet}
          formula={`Net = Gross − OTA = ${idr(s.grossBookings)} − ${idr(s.otaFees)} = ${idr(s.accrualNetBooking)}`}
        />
        <CalcStep
          title={t.managementFees}
          formula={`Mgmt fee = ${idr(s.managementFees)}`}
          detail={t.kpiBreakMgmtDetail}
        />
        <CalcStep
          title={t.opex}
          formula={`Opex = ${idr(s.operationalExpenses)}`}
          detail={t.kpiBreakOpexDetail.replace('{n}', String(c.expensesOpexLines))}
        />
        <CalcStep
          title={t.ownerBalance}
          formula={`Owner ≈ Net − Mgmt − Opex\n= ${idr(s.accrualNetBooking)} − ${idr(s.managementFees)} − ${idr(s.operationalExpenses)}\n= ${idr(s.ownerBalanceEstimate)}`}
          detail={t.kpiBreakOwnerDetail}
        />
        <CalcStep
          title={t.cashReceived}
          formula={`Cash = ${idr(s.cashReceived)}`}
          detail={t.kpiBreakCashDetail.replace('{n}', String(c.paymentsCashLines))}
        />
        <CalcStep
          title={t.cashGap}
          formula={`Gap = Cash − Net = ${idr(s.cashReceived)} − ${idr(s.accrualNetBooking)} = ${idr(s.cashVsAccrualGap)}`}
          detail={t.kpiBreakGapDetail}
        />
      </div>

      {breakdown.topReservations.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">{t.kpiBreakTopTitle}</p>
          <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="px-2 py-2 font-medium">ID</th>
                <th className="px-2 py-2 font-medium">{t.property}</th>
                <th className="px-2 py-2 font-medium">{t.kpiBreakColStay}</th>
                <th className="px-2 py-2 font-medium">{t.kpiBreakColStatus}</th>
                <th className="px-2 py-2 font-medium text-right">{t.kpiBreakColGross}</th>
                <th className="px-2 py-2 font-medium text-right">OTA</th>
                <th className="px-2 py-2 font-medium text-right">Mgmt</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.topReservations.map((r) => (
                <tr key={r.reservationId} className="border-b border-[var(--border)]/70">
                  <td className="px-2 py-2 font-mono">{r.reservationId}</td>
                  <td className="px-2 py-2">{r.propertyId}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">
                    {r.checkIn} → {r.checkOut}
                    <span className="ml-1 text-[var(--text-muted)]">({r.channel})</span>
                  </td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className="px-2 py-2 text-right font-medium">{idr(r.effectiveGross)}</td>
                  <td className="px-2 py-2 text-right">{idr(r.otaFee)}</td>
                  <td className="px-2 py-2 text-right">{idr(r.managementFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{t.kpiBreakTopFootnote}</p>
        </div>
      ) : null}
    </section>
  );
}
