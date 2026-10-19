'use client';

import type { ChannelBreakdownRow, PropertyBreakdownRow, TimeseriesPoint } from '@villa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { buildAnalyticsQuery } from '@/lib/analytics-query';
import { apiFetch } from '@/lib/api/client';

const CHART_LIGHT = {
  pie: ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'],
  gross: '#0ea5e9',
  cash: '#10b981',
  mgmt: '#8b5cf6',
  owner: '#f59e0b',
  grid: '#e2e8f0',
  tick: '#64748b',
};

const CHART_DARK = {
  pie: ['#9a7b56', '#6b8f71', '#c4a574', '#787770'],
  gross: '#9a7b56',
  cash: '#6b8f71',
  mgmt: '#c4a574',
  owner: '#d4b896',
  grid: '#434347',
  tick: '#a8a7a2',
};
const CHART_H = 288;
const LOAD_STEPS = 3;

function fmtShort(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Measures its own column — do not reuse parent grid width (fixes pie chart offset). */
function ChartSlot({ children }: { children: (width: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-72 w-full min-w-0">
      {width < 40 ? (
        <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">…</div>
      ) : (
        children(width)
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-4 w-2/5 rounded-md bg-[var(--bg-hover)]" />
      <div className="h-72 rounded-lg bg-[var(--bg-hover)]" />
    </div>
  );
}

type StepStatus = 'pending' | 'loading' | 'ok' | 'error' | 'empty';

function stepFromQuery<T>(
  query: UseQueryResult<T>,
  hasRows: (data: T | undefined) => boolean,
): StepStatus {
  if (query.isPending) return 'loading';
  if (query.isError) return 'error';
  if (!hasRows(query.data)) return 'empty';
  return 'ok';
}

function StepDot({ status }: { status: StepStatus }) {
  const cls =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'error'
        ? 'bg-red-500'
        : status === 'empty'
          ? 'bg-amber-400'
          : status === 'loading'
            ? 'animate-pulse bg-[var(--accent)]'
            : 'bg-[var(--border)]';
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

export function AnalyticsCharts({
  propertyId,
  from,
  to,
  useCustomPeriod,
  labels,
}: {
  propertyId: string;
  from?: string;
  to?: string;
  useCustomPeriod?: boolean;
  labels: {
    timeseries: string;
    byProperty: string;
    byChannel: string;
    gross: string;
    cash: string;
    mgmt: string;
    timeseriesHint: string;
    chartsDateLogic: string;
    ownerEst: string;
    noData: string;
    noDataFiltered: string;
    loadError: string;
    loadingTitle: string;
    loadingHint: string;
    loadingStill: string;
    loadingProgress: string;
    statusReady: string;
    emptyTimeseries: string;
    emptyProperty: string;
    emptyChannel: string;
    retry: string;
  };
}) {
  const { theme } = useTheme();
  const chart = theme === 'dark' ? CHART_DARK : CHART_LIGHT;

  const [loadSeconds, setLoadSeconds] = useState(0);
  const loadStarted = useRef<number | null>(null);

  const suffix = buildAnalyticsQuery({
    propertyId,
    from,
    to,
    useCustomPeriod,
  });

  const timeseries = useQuery({
    queryKey: ['timeseries', propertyId, useCustomPeriod, from, to],
    queryFn: () => apiFetch<TimeseriesPoint[]>(`/analytics/timeseries${suffix}`),
  });

  const byProperty = useQuery({
    queryKey: ['by-property', propertyId, useCustomPeriod, from, to],
    queryFn: () => apiFetch<PropertyBreakdownRow[]>(`/analytics/by-property${suffix}`),
  });

  const byChannel = useQuery({
    queryKey: ['by-channel', propertyId, useCustomPeriod, from, to],
    queryFn: () => apiFetch<ChannelBreakdownRow[]>(`/analytics/by-channel${suffix}`),
  });

  const refetchAll = () => {
    void timeseries.refetch();
    void byProperty.refetch();
    void byChannel.refetch();
  };

  const topProps = (byProperty.data ?? [])
    .filter((p) => p.grossBookings > 0)
    .slice(0, 8)
    .map((p) => ({
      name: p.propertyId,
      gross: p.grossBookings,
      owner: p.ownerBalanceEstimate,
    }));

  const channelData = (byChannel.data ?? []).filter((c) => c.grossBookings > 0);
  const seriesData = timeseries.data ?? [];

  const hasSeries = (data: TimeseriesPoint[] | undefined) =>
    (data ?? []).some(
      (p) =>
        (p.grossBookings ?? 0) > 0 ||
        (p.cashReceived ?? 0) > 0 ||
        (p.managementFees ?? 0) > 0,
    );
  const hasProps = (data: PropertyBreakdownRow[] | undefined) =>
    (data ?? []).some((p) => p.grossBookings > 0);
  const hasChannels = (data: ChannelBreakdownRow[] | undefined) =>
    (data ?? []).some((c) => c.grossBookings > 0);

  const steps = [
    { id: 'timeseries', title: labels.timeseries, status: stepFromQuery(timeseries, hasSeries) },
    { id: 'property', title: labels.byProperty, status: stepFromQuery(byProperty, hasProps) },
    { id: 'channel', title: labels.byChannel, status: stepFromQuery(byChannel, hasChannels) },
  ] as const;

  const anyLoading = steps.some((s) => s.status === 'loading');
  const doneCount = steps.filter((s) => s.status !== 'loading' && s.status !== 'pending').length;
  const anyError = steps.some((s) => s.status === 'error');
  const hasAnyChart = steps.some((s) => s.status === 'ok');

  useEffect(() => {
    if (anyLoading) {
      if (loadStarted.current === null) loadStarted.current = Date.now();
      const id = window.setInterval(() => {
        if (loadStarted.current) {
          setLoadSeconds(Math.floor((Date.now() - loadStarted.current) / 1000));
        }
      }, 500);
      return () => window.clearInterval(id);
    }
    loadStarted.current = null;
    setLoadSeconds(0);
    return undefined;
  }, [anyLoading]);

  const progressPct = Math.round((doneCount / LOAD_STEPS) * 100);
  const progressLabel = labels.loadingProgress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(LOAD_STEPS));

  function panelBody(
    status: StepStatus,
    emptyText: string,
    chartContent: ReactNode,
  ): ReactNode {
    if (status === 'loading') return <ChartSkeleton />;
    if (status === 'error') {
      return (
        <div className="flex h-72 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-700">
          <p>{labels.loadError}</p>
          <button type="button" className="vf-link text-red-800" onClick={() => refetchAll()}>
            {labels.retry}
          </button>
        </div>
      );
    }
    if (status === 'empty') {
      return (
        <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
          {emptyText}
        </div>
      );
    }
    return chartContent;
  }

  return (
    <div className="space-y-4">
      <div
        className="vf-panel px-4 py-3"
        role="status"
        aria-live="polite"
        aria-busy={anyLoading}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {anyLoading ? labels.loadingTitle : labels.statusReady}
            {!anyLoading && hasAnyChart ? ` · ${progressLabel}` : null}
            {anyLoading ? ` · ${progressLabel}` : null}
            {anyLoading && loadSeconds > 0 ? ` (${loadSeconds}s)` : null}
          </p>
          {anyError && !anyLoading && (
            <button type="button" className="vf-link" onClick={() => refetchAll()}>
              {labels.retry}
            </button>
          )}
        </div>
        {anyLoading && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${anyLoading ? Math.max(progressPct, 8) : 100}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {anyLoading && loadSeconds >= 4 ? labels.loadingStill : labels.loadingHint}
        </p>
        <ul className="mt-2 space-y-1">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <StepDot status={s.status} />
              <span>{s.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{labels.chartsDateLogic}</p>

      {!anyLoading && !hasAnyChart && !anyError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] dark:text-[var(--text-primary)]">
          <p>{labels.noDataFiltered}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{labels.noData}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="vf-panel min-w-0 p-4 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">{labels.timeseries}</h3>
          {panelBody(
            steps[0].status,
            labels.emptyTimeseries,
            <ChartSlot>
              {(w) => (
                <LineChart width={w} height={CHART_H} data={seriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: chart.tick }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: chart.tick }} width={56} />
                  <Tooltip formatter={(v: number) => fmtShort(Number(v))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossBookings"
                    name={labels.gross}
                    stroke={chart.gross}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="cashReceived"
                    name={labels.cash}
                    stroke={chart.cash}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="managementFees"
                    name={labels.mgmt}
                    stroke={chart.mgmt}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              )}
            </ChartSlot>,
          )}
          {steps[0].status === 'ok' && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">{labels.timeseriesHint}</p>
          )}
        </div>

        <div className="vf-panel min-w-0 p-4">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">{labels.byProperty}</h3>
          {panelBody(
            steps[1].status,
            labels.emptyProperty,
            <ChartSlot>
              {(w) => (
                <BarChart width={w} height={CHART_H} data={topProps} layout="vertical" margin={{ left: 4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: chart.tick }} />
                  <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 11, fill: chart.tick }} />
                  <Tooltip formatter={(v: number) => fmtShort(Number(v))} />
                  <Legend />
                  <Bar dataKey="gross" name={labels.gross} fill={chart.gross} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="owner" name={labels.ownerEst} fill={chart.owner} radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ChartSlot>,
          )}
        </div>

        <div className="vf-panel flex min-w-0 flex-col p-4">
          <h3 className="mb-4 font-semibold text-[var(--text-primary)]">{labels.byChannel}</h3>
          {panelBody(
            steps[2].status,
            labels.emptyChannel,
            <ChartSlot>
              {(w) => {
                const chartSide = Math.min(w, CHART_H);
                const outerRadius = Math.max(48, chartSide * 0.34);
                const centerY = CHART_H / 2 - 12;
                return (
                  <PieChart
                    width={w}
                    height={CHART_H}
                    margin={{ top: 4, right: 4, bottom: 28, left: 4 }}
                  >
                    <Pie
                      data={channelData}
                      dataKey="grossBookings"
                      nameKey="channel"
                      cx={w / 2}
                      cy={centerY}
                      outerRadius={outerRadius}
                      label={false}
                    >
                      {channelData.map((_, i) => (
                        <Cell key={i} fill={chart.pie[i % chart.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtShort(Number(v))} />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                  </PieChart>
                );
              }}
            </ChartSlot>,
          )}
        </div>
      </div>
    </div>
  );
}
