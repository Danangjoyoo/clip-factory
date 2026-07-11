FROM node:24.18.0-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN corepack enable && pnpm --config.minimum-release-age=0 install --frozen-lockfile
COPY apps/web apps/web
EXPOSE 3000
CMD ["pnpm", "--filter", "@clip-factory/web", "exec", "next", "dev", "-H", "0.0.0.0"]
