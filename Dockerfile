FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# `next build` statically evaluates route handler modules while "Collecting
# page data" — src/lib/backend.ts throws at module scope if BACKEND_URL is
# unset, so the build needs *a* value present. This placeholder never ships:
# it's build-arg only, not copied/redeclared in the runner stage below, so
# the real BACKEND_URL must be passed at `docker run`/compose time, same as
# any other server-only runtime config.
ARG BACKEND_URL=http://localhost:3000/api
ENV BACKEND_URL=$BACKEND_URL

RUN npm run build

FROM node:22-slim AS runner

USER node

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# `output: "standalone"` (next.config.ts) produces a self-contained server.js
# plus a pruned node_modules — but it does NOT bundle public/ or .next/static,
# those have to be copied in separately (Next's own standalone-output docs).
COPY --chown=node:node --from=builder /app/public ./public/
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static/

EXPOSE 3001

CMD ["node", "server.js"]
