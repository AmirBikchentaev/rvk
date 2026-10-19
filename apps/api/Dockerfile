FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY packages ./packages
COPY apps ./apps
COPY data ./data
RUN pnpm install --frozen-lockfile --prefer-offline
RUN pnpm --filter @villa/shared build && pnpm --filter @villa/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./node_modules/@villa/shared/dist
COPY --from=build /app/packages/shared/package.json ./node_modules/@villa/shared/package.json
COPY data ./data
EXPOSE 4000
CMD ["node", "dist/main.js"]
