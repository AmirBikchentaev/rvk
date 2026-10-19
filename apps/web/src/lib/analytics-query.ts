export function buildAnalyticsQuery(params: {
  propertyId?: string;
  from?: string;
  to?: string;
  useCustomPeriod?: boolean;
}): string {
  const qs = new URLSearchParams();
  if (params.propertyId) qs.set('propertyId', params.propertyId);
  if (params.useCustomPeriod) {
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
  }
  const q = qs.toString();
  return q ? `?${q}` : '';
}
