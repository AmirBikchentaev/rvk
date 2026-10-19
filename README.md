# Villa Finance — recruitment prototype

Монорепо для тестового задания **Senior Business Systems Engineer (Finance & Automation)**: dashboard по портфелю вилл, финансовые расчёты, диагностика качества данных, docker-compose для быстрого деплоя.

**Стек:** pnpm workspaces · Next.js (App Router) · NestJS · PostgreSQL · TypeORM · React Query · JWT refresh · nginx.

**Инструменты при разработке:** Cursor / AI для каркаса; формулы и DQ-правила сверены скриптом `scripts/analyze_data.py` и ручной выборкой строк CSV.

## Быстрый старт (локально)

```bash
pnpm install
pnpm --filter @villa/shared build

# PostgreSQL на 5434 (reflexive на этом же сервере/ПК часто занимает 127.0.0.1:5433)
docker run --name villa-finance-postgres -e POSTGRES_PASSWORD=villa_secret -e POSTGRES_USER=villa -e POSTGRES_DB=villa_finance -p 127.0.0.1:5434:5432 -d postgres:16-alpine

cp .env.example .env
# DATABASE_URL=postgresql://villa:villa_secret@127.0.0.1:5434/villa_finance
# DATA_DIR=./data

pnpm --filter @villa/api dev    # :4000
pnpm --filter @villa/web dev -- -p 3002   # :3002 — не пересекается с reflexive :3000
```

Фронт ходит на **тот же origin** (`/api/...`); в dev Next проксирует на `:4000` (см. `API_PROXY_TARGET`).

Dashboard: http://localhost:3002 (RU), http://localhost:3002/en (EN).

**404 на `/api/analytics/by-property` или `/timeseries`:** на `:4000` часто висит **старый** процесс API (остался только `/analytics/summary` с обязательными `from`/`to`). Остановите его, пересоберите и запустите заново:

```bash
pnpm --filter @villa/shared build
pnpm --filter @villa/api build
pnpm --filter @villa/api dev
```

Проверка: `GET http://127.0.0.1:4000/api/analytics` → JSON с `routes: ["summary","timeseries","by-property","by-channel"]`. Даты в query **необязательны** (период = все данные в БД).

Демо-логин (создаётся при старте API): `demo@villa.local` / `demo1234`.

## Безопасность (демо)

- Авторизация **не обязательна** для dashboard API (`/auth/login` опционален).
- **Validation:** DTO whitelist, `propertyId` только `V###` и существующий в БД, лимиты на login/assistant, helmet, CORS, Throttler.

## Docker Compose (сервер)

```bash
cp .env.example .env
# На сервере в .env:
#   NEXT_PUBLIC_API_URL=http://<IP>:4002/api
#   CORS_ORIGIN=http://<IP>:8080
#   API_PORT=4002  (открыть в firewall)
# UI: :8080 (nginx → web), API: :4002 напрямую (nginx /api можно не трогать)

docker compose up --build -d

# Вариант B: один nginx (reflexive) — без контейнера villa-finance-nginx:
docker compose -f docker-compose.yml -f docker-compose.behind-proxy.yml up --build -d
# В nginx reflexive проксируй на 127.0.0.1:3002 (web) и 127.0.0.1:4002 (/api/ → API)
```

Открыть **http://your-server:8080** (вариант A) или свой subdomain/path через reflexive nginx (вариант B).

### Рядом с reflexive на одном VPS

| | reflexive | villa-finance (тест) |
|---|-----------|----------------------|
| Web | `:3000` | nginx **`:8080`** |
| API | `:3001` | хост **`:4002`** → контейнер `:4000` |
| Postgres (host) | `127.0.0.1:5433` | `127.0.0.1:5434` |
| Имена контейнеров | `reflexive-*` | `villa-finance-*` |
| Compose project | `reflexive` | `villa-finance` |

Стеки не делят порты и volume. Reflexive: `cd reflexive && docker compose up -d`. Тест: `cd "test t" && docker compose up -d`.

Данные монтируются из `./data` в API (`DATA_DIR=/app/data`). При каждом старте API выполняется полный re-import CSV (прототип; в prod — upsert по ключам).

## API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/properties` | Список объектов |
| GET | `/api/analytics/summary?from=&to=&propertyId=` | KPI по фильтрам |
| GET | `/api/data-quality/issues` | Проблемы в исходных CSV |
| GET | `/api/analytics/timeseries` | Помесячный gross / cash / mgmt / opex |
| GET | `/api/analytics/by-property` | Разрез по виллам |
| GET | `/api/analytics/by-channel` | OTA vs Direct |
| POST | `/api/assistant/chat` | AI-аналитик (function calling по БД) |
| POST | `/api/auth/login` | Access + refresh JWT |

**AI:** задайте `OPENAI_API_KEY` в `.env` — модель вызывает те же расчёты, что dashboard. Без ключа — автоматический offline-отчёт из БД.

## Финансовая методология

### Период и фильтр объекта

- Бронирование попадает в период, если **хотя бы одна ночь** проживания пересекается с `[from, to]` (check-out exclusive).
- `propertyId` опционален — иначе агрегат по портфелю.

### Accrual (начисления)

| Показатель | Формула | Примечания |
|------------|---------|------------|
| **Gross bookings** | Σ `effective_gross` | `effective_gross = max(0, gross_booking_value - refund_amount)` для `confirmed` и `modified`; для `cancelled` → 0 |
| **OTA fees** | Σ `ota_fee` | Только non-cancelled; отрицательные OTA **исключаются** (review) |
| **Management fee** | Σ `gross_effective × rate` | `rate` из `commission_rules` на дату `check_in`, basis = `gross_booking_value`; OTA отдельно (см. note в rules) |
| **Net booking (accrual)** | Gross − OTA | Без management fee |
| **Operational expenses** | Σ expenses | Только `payment_status=paid`, дата `expense_date` в периоде |
| **Owner balance (оценка)** | Net booking − management fee − paid opex | **Не** банковский баланс; без выплат владельцам, налогов, FX |

### Cash (денежный поток)

| Показатель | Формула |
|------------|---------|
| **Cash received** | Σ payments где `status=received`, `payment_date` в периоде |
| **Cash − accrual gap** | Cash received − Net booking (accrual) |

Разница ожидаема: поступления привязаны к дате оплаты, начисления — к периоду проживания; частичные refunds (R0072), нулевые платежи по отменам, дубликаты в CSV.

### Отмены, modified, refunds

- **cancelled:** не дают gross/OTA в KPI; `refund_amount` в данных часто = full gross — для P&amp;L gross=0.
- **modified:** учитываются как активные брони (вероятная финальная версия); пересечения дат с `confirmed` → **review**, не auto-merge.
- **Дубликат `reservation_id`:** оставляем запись с max(`updated_at`); при равенстве — последняя в файле (R0015).

### Валюта

Все объекты в IDR, кроме **R0061 (USD)** — исключена из сумм до таблицы FX (review).

## Качество данных (найденное)

| Код | Пример | Действие |
|-----|--------|----------|
| DUPLICATE_RESERVATION_ID | R0015 (2 строки) | Dedupe по `updated_at` |
| UNKNOWN_PROPERTY | R0034 → V999, E0017 → V777, P0017 | **exclude** из агрегатов |
| FOREIGN_CURRENCY | R0061 USD | **review**, exclude без FX |
| NEGATIVE_OTA_FEE | R0102 | **review**, exclude из OTA sum |
| DUPLICATE_PAYMENT_ID | P0075 ×2 | Одна строка в cash |
| OVERLAPPING_STAY | 74 пары confirmed/modified | **review** (double booking / версии) |
| PARTIAL_REFUND | R0072 refund &lt; gross | **review** |

Полный список: `GET /api/data-quality/issues`.

## Ограничения прототипа

- `synchronize: true` вместо миграций; re-import затирает таблицы фактов.
- Redis в compose только в profile `full`, не используется в коде.
- Публичный demo API; опциональный JWT через `/auth/login`.
- Нет owner statements, FX, payout ledger.

## Следующие 3 шага

1. Staging + upsert importers, `import_runs` и audit log изменений строк.
2. Явная модель **owner statement** (accrual period vs cash calendar) и reconciliation UI.
3. RBAC по `owner_id`, интеграция банка / OTA webhooks вместо CSV.

## Вопросы CFO

1. Management fee на partial refund (R0072): от gross до или после refund?
2. Modified vs confirmed при overlap — какая запись каноническая?
3. OTA fee на Direct channel: ошибка или скрытая комиссия?
4. Курс USD→IDR: дата check-in или payment?
5. Expenses `pending` — accrue in P&amp;L or only when paid?

## Структура

```
apps/api      NestJS
apps/web      Next.js dashboard
packages/shared  типы, finance.ts, data-quality.ts
data/         исходные CSV
docs/architecture.md
docker-compose.yml
```

Схема системы: [docs/architecture.md](./docs/architecture.md).

## Автор

- Репозиторий автора: [AmirBikchentaev/rvk](https://github.com/AmirBikchentaev/rvk) (GitHub)
- Telegram: [@sefrwea](https://t.me/sefrwea)
