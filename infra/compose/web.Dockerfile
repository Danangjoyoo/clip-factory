FROM node:24.18.0-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN corepack enable && pnpm install --frozen-lockfile --config.minimum-release-age=0
COPY apps/web apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@clip-factory/web", "start"]
