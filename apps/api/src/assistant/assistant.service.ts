import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AnalyticsService } from '../analytics/analytics.service';
import { DataQualityService } from '../data-quality/data-quality.service';
import { ASSISTANT_TOOLS } from './assistant.tools';

const DEFAULT_MODEL = 'gpt-4.1';

const SYSTEM_PROMPT = `Ты senior finance analyst по портфелю вилл (management company). Пиши по-русски, живо и по делу, как для CFO на созвоне — unless the user writes in English.

Правила:
1. Цифры только из tool results; если данных не хватило — скажи прямо и назови, какой tool нужен.
2. Структура ответа: краткий вывод (1–2 предложения) → ключевые цифры с IDR → что это значит для owner / для компании → риски данных и cash vs accrual, если релевантно → 1–2 практичных next step.
3. Различай начисление (gross/net по датам проживания) и cash (payment_date). Owner balance — оценка, не баланс счёта.
4. При сомнительных данных (FX, V999, дубли, overlaps) — явно снижай confidence и объясняй, что исключено из KPI.
5. Не выдумывай брони, выплаты и ставки; не используй markdown-таблицы шире 4 колонок.`;

@Injectable()
export class AssistantService {
  private readonly log = new Logger(AssistantService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly dataQuality: DataQualityService,
  ) {
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  async chat(input: {
    message: string;
    from?: string;
    to?: string;
    propertyId?: string;
    locale?: string;
  }) {
    const defaults = await this.analytics.resolveFilters({
      propertyId: input.propertyId,
      from: input.from,
      to: input.to,
    });

    const replyLocale = input.locale === 'en' ? 'en' : 'ru';

    if (!this.openai) {
      return this.offlineExplain(input.message, defaults, replyLocale);
    }

    try {
      return await this.chatWithOpenAi(input.message, defaults, replyLocale);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.warn(`OpenAI assistant failed, falling back to offline: ${msg}`);
      const offline = await this.offlineExplain(input.message, defaults, replyLocale);
      const prefix =
        replyLocale === 'en'
          ? `_OpenAI unavailable (${msg}). Offline summary:_\n\n`
          : `_OpenAI недоступен (${msg}). Offline-сводка:_\n\n`;
      return { ...offline, mode: 'offline' as const, reply: prefix + offline.reply };
    }
  }

  private async chatWithOpenAi(
    message: string,
    defaults: { from: string; to: string; propertyId?: string },
    replyLocale: 'ru' | 'en',
  ) {
    const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    const localeHint =
      replyLocale === 'en'
        ? 'Respond in English.'
        : 'Отвечай по-русски.';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${localeHint}` },
      {
        role: 'user',
        content: `Context filters: from=${defaults.from}, to=${defaults.to}, propertyId=${defaults.propertyId ?? 'all'}.\n\nUser: ${message}`,
      },
    ];

    const toolCallsLog: { name: string; args: unknown }[] = [];
    for (let step = 0; step < 5; step++) {
      const completion = await this.openai!.chat.completions.create({
        model,
        messages,
        tools: ASSISTANT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.35,
        max_tokens: 2500,
      });

      const msg = completion.choices[0]?.message;
      if (!msg) break;

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          if (call.type !== 'function') continue;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
          } catch {
            args = {};
          }
          const result = await this.runTool(call.function.name, args, defaults);
          toolCallsLog.push({ name: call.function.name, args });
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return {
        mode: 'openai',
        reply: msg.content ?? '',
        toolCalls: toolCallsLog,
      };
    }

    return {
      mode: 'openai',
      reply: 'Не удалось завершить цепочку tool calls.',
      toolCalls: toolCallsLog,
    };
  }

  private async runTool(
    name: string,
    args: Record<string, unknown>,
    defaults: { from: string; to: string; propertyId?: string },
  ) {
    const propertyId = args.propertyId
      ? String(args.propertyId)
      : defaults.propertyId;
    const range = {
      propertyId,
      from: args.from ? String(args.from) : undefined,
      to: args.to ? String(args.to) : undefined,
    };

    switch (name) {
      case 'get_financial_summary':
        return this.analytics.getSummary(range);
      case 'get_timeseries':
        return this.analytics.getTimeseries(range);
      case 'get_property_breakdown':
        return this.analytics.getPropertyBreakdown(range);
      case 'get_channel_breakdown':
        return this.analytics.getChannelBreakdown(range);
      case 'get_data_quality_issues':
        return this.dataQuality.listIssues();
      case 'list_properties':
        return this.analytics.listProperties();
      default:
        return { error: `Unknown tool ${name}` };
    }
  }

  /** No API key: run summary + DQ and template explanation. */
  private async offlineExplain(
    message: string,
    defaults: { from: string; to: string; propertyId?: string },
    replyLocale: 'ru' | 'en',
  ) {
    const summary = await this.analytics.getSummary(defaults);
    const dq = await this.dataQuality.listIssues();
    const topProps = (await this.analytics.getPropertyBreakdown(defaults)).slice(0, 5);
    const channels = await this.analytics.getChannelBreakdown(defaults);

    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

    const scope =
      replyLocale === 'en'
        ? defaults.propertyId
          ? `property **${defaults.propertyId}**`
          : 'the **whole portfolio**'
        : defaults.propertyId
          ? `объект **${defaults.propertyId}**`
          : '**весь портфель**';

    const period = `**${defaults.from} — ${defaults.to}**`;
    const q = message.toLowerCase();

    const lead = this.offlineLead({
      q,
      replyLocale,
      scope,
      summary,
      fmt,
      dqTotal: dq.total,
    });

    const kpiBlock =
      replyLocale === 'en'
        ? [
            '**Key figures**',
            `- Gross bookings: **${fmt(summary.grossBookings)}**`,
            `- OTA fees: **${fmt(summary.otaFees)}**`,
            `- Management fees: **${fmt(summary.managementFees)}**`,
            `- Opex (paid): **${fmt(summary.operationalExpenses)}**`,
            `- Owner balance (estimate): **${fmt(summary.ownerBalanceEstimate)}**`,
            `- Cash **${fmt(summary.cashReceived)}** · accrual net **${fmt(summary.accrualNetBooking)}** · gap **${fmt(summary.cashVsAccrualGap)}**`,
          ]
        : [
            '**Ключевые цифры**',
            `- Gross bookings: **${fmt(summary.grossBookings)}**`,
            `- OTA fees: **${fmt(summary.otaFees)}**`,
            `- Management fees: **${fmt(summary.managementFees)}**`,
            `- Opex (paid): **${fmt(summary.operationalExpenses)}**`,
            `- Owner balance (оценка): **${fmt(summary.ownerBalanceEstimate)}**`,
            `- Cash **${fmt(summary.cashReceived)}** · accrual net **${fmt(summary.accrualNetBooking)}** · разрыв **${fmt(summary.cashVsAccrualGap)}**`,
          ];

    const showBreakdown = !this.offlineTopic(q, 'cash') && topProps.length > 0;
    const topBlock = showBreakdown
      ? [
          replyLocale === 'en' ? '**Top villas (gross)**' : '**Топ вилл (gross)**',
          ...topProps.map(
            (p) =>
              `- **${p.propertyId}** (${p.cluster}): gross ${fmt(p.grossBookings)}, owner est. ${fmt(p.ownerBalanceEstimate)}`,
          ),
        ]
      : [];

    const channelBlock =
      channels.length > 0 && !this.offlineTopic(q, 'owner')
        ? [
            replyLocale === 'en' ? '**Channels**' : '**Каналы**',
            ...channels.map(
              (c) =>
                `- **${c.channel}**: ${c.bookingCount} ${replyLocale === 'en' ? 'bookings' : 'броней'}, gross ${fmt(c.grossBookings)}`,
            ),
          ]
        : [];

    const reply = [
      lead,
      '',
      replyLocale === 'en' ? `Period ${period}, ${scope}.` : `Период ${period}, ${scope}.`,
      '',
      ...kpiBlock,
      ...(topBlock.length ? ['', ...topBlock] : []),
      ...(channelBlock.length ? ['', ...channelBlock] : []),
      ...(dq.total > 0
        ? [
            '',
            replyLocale === 'en'
              ? `**Data quality:** ${dq.total} open issues — see the Data tab before trusting edge cases.`
              : `**Качество данных:** ${dq.total} замечаний — детали во вкладке «Данные».`,
          ]
        : []),
    ].join('\n');

    return {
      mode: 'offline' as const,
      reply,
      toolCalls: [
        { name: 'get_financial_summary', args: defaults },
        { name: 'get_property_breakdown', args: defaults },
        { name: 'get_channel_breakdown', args: defaults },
        { name: 'get_data_quality_issues', args: {} },
      ],
    };
  }

  private offlineTopic(q: string, topic: 'owner' | 'cash' | 'data' | 'villa'): boolean {
    if (topic === 'owner') {
      return /owner|баланс|владел/.test(q);
    }
    if (topic === 'cash') {
      return /cash|accrual|сход|разрыв|расхож|начисл|оплат/.test(q);
    }
    if (topic === 'data') {
      return /data|качеств|довер|issue|ошиб|проблем/.test(q);
    }
    return /villa|вилл|gross|топ|больше/.test(q);
  }

  private offlineLead(input: {
    q: string;
    replyLocale: 'ru' | 'en';
    scope: string;
    summary: Awaited<ReturnType<AnalyticsService['getSummary']>>;
    fmt: (n: number) => string;
    dqTotal: number;
  }): string {
    const { q, replyLocale, scope, summary, fmt, dqTotal } = input;
    const gap = summary.cashVsAccrualGap;

    if (this.offlineTopic(q, 'owner')) {
      return replyLocale === 'en'
        ? `**Owner balance (estimate)** for ${scope} is **${fmt(summary.ownerBalanceEstimate)}**. It is accrual-based: net booking after OTA, minus management fee and **paid** opex — not the bank balance.`
        : `**Owner balance (оценка)** для ${scope}: **${fmt(summary.ownerBalanceEstimate)}**. Считается по начислениям: net booking после OTA, минус management fee и **оплаченный** opex — это не остаток на счёте.`;
    }

    if (this.offlineTopic(q, 'cash')) {
      return replyLocale === 'en'
        ? `Cash (**${fmt(summary.cashReceived)}**) and accrual net (**${fmt(summary.accrualNetBooking)}**) differ by **${fmt(gap)}**. That is normal: **payment_date** drives cash, stay dates drive accrual; refunds and cancellations widen the gap.`
        : `Cash (**${fmt(summary.cashReceived)}**) и accrual net (**${fmt(summary.accrualNetBooking)}**) расходятся на **${fmt(gap)}**. Это ожидаемо: cash — по **payment_date**, начисления — по датам проживания; refunds и отмены увеличивают разрыв.`;
    }

    if (this.offlineTopic(q, 'data')) {
      return replyLocale === 'en'
        ? `There are **${dqTotal}** data-quality flags in the CSV/DB scan. KPIs already exclude some rows (FX, unknown properties); yellow items need manual review.`
        : `В данных **${dqTotal}** замечаний по качеству. Часть строк уже исключена из KPI (FX, неизвестные объекты); жёлтые кейсы стоит проверить вручную.`;
    }

    if (this.offlineTopic(q, 'villa')) {
      return replyLocale === 'en'
        ? `Largest **gross** in this slice is **${fmt(summary.grossBookings)}** total${summary.ownerBalanceEstimate ? `; owner balance estimate **${fmt(summary.ownerBalanceEstimate)}**.` : '.'}`
        : `Максимальный **gross** в выборке — **${fmt(summary.grossBookings)}**${summary.ownerBalanceEstimate ? `; owner balance (оценка) **${fmt(summary.ownerBalanceEstimate)}**.` : '.'}`;
    }

    return replyLocale === 'en'
      ? `Snapshot for ${scope} from the database (template reply without OpenAI).`
      : `Сводка по ${scope} из базы (шаблонный ответ без OpenAI).`;
  }
}
