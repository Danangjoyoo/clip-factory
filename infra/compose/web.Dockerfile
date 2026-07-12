FROM node:24.18.0-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && pnpm install --frozen-lockfile --config.minimum-release-age=0
COPY apps/web apps/web
COPY packages/config packages/config
COPY packages/contracts packages/contracts
EXPOSE 3000
CMD ["pnpm", "--filter", "@clip-factory/web", "exec", "next", "dev", "-H", "0.0.0.0"]
