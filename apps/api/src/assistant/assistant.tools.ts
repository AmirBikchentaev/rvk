export const ASSISTANT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_financial_summary',
      description:
        'KPI totals for a date range: gross bookings, OTA fees, management fees, opex, owner balance estimate, cash vs accrual.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD; omit for full dataset range' },
          to: { type: 'string', description: 'YYYY-MM-DD; omit for full dataset range' },
          propertyId: { type: 'string', description: 'Optional property id e.g. V001' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_timeseries',
      description: 'Monthly gross, cash, management fees and opex for charts.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          propertyId: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_property_breakdown',
      description: 'Per-villa ranking by gross and owner balance estimate.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          propertyId: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_channel_breakdown',
      description: 'OTA vs Direct gross split.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          propertyId: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_data_quality_issues',
      description: 'List data quality problems in CSV (duplicates, bad IDs, overlaps).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_properties',
      description: 'All villas with cluster and owner.',
      parameters: { type: 'object', properties: {} },
    },
  },
];
