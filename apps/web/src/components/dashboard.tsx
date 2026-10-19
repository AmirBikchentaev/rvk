'use client';

import type { DataQualityIssue, FinancialSummary, KpiBreakdown, PropertyRow } from '@villa/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ensureDemoSession } from '@/lib/api/client';
import { buildAnalyticsQuery } from '@/lib/analytics-query';
import { AnalyticsCharts } from '@/components/analytics-charts';
import { FinanceAssistant } from '@/components/finance-assistant';
import { ClientOnboarding } from '@/components/client-onboarding';
import { FinanceMethodology, MethodologyTeaser } from '@/components/finance-methodology';
import { KpiAssignmentChecklist } from '@/components/kpi-assignment-checklist';
import { KpiCalculationWalkthrough } from '@/components/kpi-calculation-walkthrough';
import { DeliverablesReport } from '@/components/deliverables-report';
import { SiteFooter } from '@/components/site-footer';
import { DashboardNav, type DashboardSection } from '@/components/dashboard-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useLocale } from '@/components/locale-provider';
import { filterFieldClass, filterLabelClass } from '@/lib/form-styles';
import {
  formatDataQualityIssue,
  formatEstimateNote,
  formatSeverity,
} from '@/lib/i18n/format-system-messages';

type PeriodBounds = {
  datasetFrom: string;
  datasetTo: string;
  appliedFrom: string;
  appliedTo: string;
  usingCustomRange: boolean;
};

const SECTIONS_WITH_FILTERS: DashboardSection[] = ['overview', 'charts', 'assistant'];

type DqResponse = {
  issueCount?: number;
  total: number;
  scannedRows?: {
    properties: number;
    reservations: number;
    payments: number;
    expenses: number;
  };
  issues: DataQualityIssue[];
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="vf-panel p-4">
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function formatDqScanned(
  template: string,
  rows: NonNullable<DqResponse['scannedRows']>,
): string {
  return template
    .replace('{properties}', String(rows.properties))
    .replace('{reservations}', String(rows.reservations))
    .replace('{payments}', String(rows.payments))
    .replace('{expenses}', String(rows.expenses));
}

export function Dashboard() {
  const { t, intlLocale, locale } = useLocale();
  const [section, setSection] = useState<DashboardSection>('overview');
  const [kpiBreakdownOpen, setKpiBreakdownOpen] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [useCustomPeriod, setUseCustomPeriod] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const openOnboardingRef = useRef<(() => void) | null>(null);

  const analyticsSuffix = buildAnalyticsQuery({
    propertyId,
    from,
    to,
    useCustomPeriod,
  });

  useEffect(() => {
    void ensureDemoSession();
  }, []);

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch<PropertyRow[]>('/properties'),
  });

  const periodQuery = useQuery({
    queryKey: ['period-bounds', propertyId, useCustomPeriod, from, to],
    queryFn: () =>
      apiFetch<PeriodBounds>(
        `/analytics/period-bounds${buildAnalyticsQuery({ propertyId, from, to, useCustomPeriod })}`,
      ),
  });

  const summaryQuery = useQuery({
    queryKey: ['summary', propertyId, useCustomPeriod, from, to],
    queryFn: () => apiFetch<FinancialSummary>(`/analytics/summary${analyticsSuffix}`),
  });

  const kpiBreakdownQuery = useQuery({
    queryKey: ['kpi-breakdown', propertyId, useCustomPeriod, from, to],
    queryFn: () => apiFetch<KpiBreakdown>(`/analytics/kpi-breakdown${analyticsSuffix}`),
    enabled: section === 'overview' && kpiBreakdownOpen,
  });

  const dqQuery = useQuery({
    queryKey: ['dq'],
    queryFn: () => apiFetch<DqResponse>('/data-quality/issues'),
  });

  const summary = summaryQuery.data;
  const issues = dqQuery.data?.issues ?? [];
  const issueCount = dqQuery.data?.issueCount ?? dqQuery.data?.total ?? 0;

  const formatIdr = (n: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n);

  const chartLabels = {
    timeseries: t.chartTimeseries,
    byProperty: t.chartByProperty,
    byChannel: t.chartByChannel,
    gross: t.chartGross,
    cash: t.chartCash,
    mgmt: t.chartMgmt,
    timeseriesHint: t.chartTimeseriesHint,
    chartsDateLogic: t.periodChartsLogic,
    ownerEst: t.chartOwnerEst,
    noData: t.chartsNoData,
    noDataFiltered: t.chartsNoDataFiltered,
    loadError: t.chartsLoadError,
    loadingTitle: t.chartsLoadingTitle,
    loadingHint: t.chartsLoadingHint,
    loadingStill: t.chartsLoadingStill,
    loadingProgress: t.chartsLoadingProgress,
    statusReady: t.chartsStatusReady,
    emptyTimeseries: t.chartsEmptyTimeseries,
    emptyProperty: t.chartsEmptyProperty,
    emptyChannel: t.chartsEmptyChannel,
    retry: t.chartsRetry,
  };

  const appliedRange = periodQuery.data
    ? `${periodQuery.data.appliedFrom} — ${periodQuery.data.appliedTo}`
    : null;

  const showFilters = SECTIONS_WITH_FILTERS.includes(section);

  const selectedProperty = propertiesQuery.data?.find((p) => p.propertyId === propertyId);
  const propertyLabel = selectedProperty
    ? `${selectedProperty.propertyId} — ${selectedProperty.propertyName}`
    : propertyId || t.allProperties;

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 pb-10 pt-6">
      <ClientOnboarding t={t} onReplayRef={(fn) => { openOnboardingRef.current = fn; }} />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t.title}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <button
            type="button"
            className="vf-link"
            onClick={() => openOnboardingRef.current?.()}
          >
            {t.onboardingReplay}
          </button>
        </div>
      </header>

      <DashboardNav
        active={section}
        onChange={setSection}
        t={t}
        dataIssueCount={issueCount}
        dataIssueHint={`${issueCount} ${t.dqIssueLabel}`}
      />

      {showFilters ? (
      <section className="vf-panel-muted mb-4 mt-4 space-y-3 p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">{t.filters}</h2>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <label className={`${filterLabelClass} sm:col-span-2`}>
            <span>{t.property}</span>
            <select
              className={filterFieldClass}
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">{t.allProperties}</option>
              {(propertiesQuery.data ?? []).map((p) => (
                <option key={p.propertyId} value={p.propertyId}>
                  {p.propertyId} — {p.propertyName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="max-w-2xl space-y-2 text-sm text-[var(--text-secondary)]">
          <p>
            <span className="font-medium text-[var(--text-primary)]">{t.periodAutoTitle}: </span>
            {t.periodAutoBody}
          </p>
          {appliedRange && (
            <p>
              {t.periodApplied}:{' '}
              <span className="font-medium text-[var(--text-primary)]">{appliedRange}</span>
              {periodQuery.data?.usingCustomRange ? '' : ` (${t.periodAllData})`}
            </p>
          )}
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t.periodChartsLogic}</p>
        </div>

        <div className="max-w-2xl space-y-2 border-t border-[var(--border)] pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              className="rounded border-[var(--border)]"
              checked={useCustomPeriod}
              onChange={(e) => setUseCustomPeriod(e.target.checked)}
            />
            {t.periodCustomToggle}
          </label>
          {useCustomPeriod && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={filterLabelClass}>
                <span>{t.from}</span>
                <input
                  type="date"
                  className={filterFieldClass}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className={filterLabelClass}>
                <span>{t.to}</span>
                <input
                  type="date"
                  className={filterFieldClass}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="vf-link w-fit sm:col-span-2"
                onClick={() => {
                  setUseCustomPeriod(false);
                  setFrom('');
                  setTo('');
                }}
              >
                {t.periodCustomReset}
              </button>
            </div>
          )}
        </div>
      </section>
      ) : null}

      <div className={showFilters ? 'mt-2' : 'mt-4'}>
        {section === 'methodology' && <FinanceMethodology locale={locale} />}

        {section === 'overview' && (
          <div className="space-y-4">
            <KpiAssignmentChecklist t={t} />
            {summaryQuery.isLoading && <p className="text-[var(--text-secondary)]">{t.loading}</p>}
            {summaryQuery.isError && <p className="text-red-600">{t.error}</p>}
            {summary && (
              <>
                {summary.isEstimate && (
                  <div className="vf-estimate-banner">
                    <strong>{t.estimate}:</strong>{' '}
                    {summary.estimateNotes.map((n) => formatEstimateNote(n, t)).join(' ')}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label={t.grossBookings} value={formatIdr(summary.grossBookings)} />
                  <MetricCard label={t.otaFees} value={formatIdr(summary.otaFees)} />
                  <MetricCard label={t.managementFees} value={formatIdr(summary.managementFees)} />
                  <MetricCard label={t.opex} value={formatIdr(summary.operationalExpenses)} />
                  <MetricCard label={t.ownerBalance} value={formatIdr(summary.ownerBalanceEstimate)} />
                  <MetricCard label={t.cashReceived} value={formatIdr(summary.cashReceived)} />
                  <MetricCard label={t.accrualNet} value={formatIdr(summary.accrualNetBooking)} />
                  <MetricCard label={t.cashGap} value={formatIdr(summary.cashVsAccrualGap)} />
                </div>
                <div className="vf-panel-muted p-4">
                  {!kpiBreakdownOpen ? (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">{t.kpiBreakCollapsedHint}</p>
                      <button
                        type="button"
                        className="vf-btn-accent mt-3 text-sm"
                        onClick={() => setKpiBreakdownOpen(true)}
                      >
                        {t.kpiBreakShow}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{t.kpiBreakTitle}</p>
                        <button
                          type="button"
                          className="vf-link text-sm"
                          onClick={() => setKpiBreakdownOpen(false)}
                        >
                          {t.kpiBreakHide}
                        </button>
                      </div>
                      {kpiBreakdownQuery.isLoading && (
                        <p className="mt-3 text-sm text-[var(--text-muted)]">{t.kpiBreakLoading}</p>
                      )}
                      {kpiBreakdownQuery.isError && (
                        <p className="mt-3 text-sm text-red-600">{t.kpiBreakError}</p>
                      )}
                      {kpiBreakdownQuery.data ? (
                        <div className="mt-3">
                          <KpiCalculationWalkthrough
                            breakdown={kpiBreakdownQuery.data}
                            t={t}
                            intlLocale={intlLocale}
                            propertyLabel={propertyLabel}
                            embedded
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                <MethodologyTeaser
                  locale={locale}
                  onOpen={() => setSection('methodology')}
                  labels={{
                    title: t.methodologyTeaserTitle,
                    body: t.methodologyTeaserBody,
                    link: t.methodologyTeaserLink,
                  }}
                />
              </>
            )}
          </div>
        )}

        {section === 'charts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t.chartsTitle}</h2>
            <AnalyticsCharts
              propertyId={propertyId}
              from={from}
              to={to}
              useCustomPeriod={useCustomPeriod}
              labels={chartLabels}
            />
          </div>
        )}

        {section === 'assistant' && (
          <FinanceAssistant
            propertyId={propertyId}
            locale={locale}
            from={useCustomPeriod ? from : undefined}
            to={useCustomPeriod ? to : undefined}
          />
        )}

        {section === 'deliverables' && <DeliverablesReport locale={locale} />}

        {section === 'data' && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t.dataQuality}: {issueCount} {t.dqIssueLabel}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {t.dqIntro}
            </p>
            {dqQuery.data?.scannedRows && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {formatDqScanned(t.dqScannedRows, dqQuery.data.scannedRows)}
              </p>
            )}
            {dqQuery.isLoading && <p className="mt-2 text-[var(--text-secondary)]">{t.loading}</p>}
            <ul className="vf-panel mt-4 max-h-[70vh] divide-y divide-[var(--border)] overflow-y-auto">
              {issues.map((issue) => (
                <li key={`${issue.code}-${issue.entityId}`} className="px-4 py-3 text-sm">
                  <span
                    className={
                      issue.severity === 'exclude'
                        ? 'mr-2 rounded bg-red-100 px-2 py-0.5 text-red-800'
                        : 'mr-2 rounded bg-yellow-100 px-2 py-0.5 text-yellow-900'
                    }
                  >
                    {formatSeverity(issue.severity, t)}
                  </span>
                  <code className="text-[var(--text-secondary)]">{issue.code}</code> —{' '}
                  {formatDataQualityIssue(issue, t)}{' '}
                  <span className="text-[var(--text-muted)]">({issue.entityId})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
