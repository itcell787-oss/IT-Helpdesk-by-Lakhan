# Multi-stage Dockerfile for IT Helpdesk by Lakhan
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/tsconfig.json ./

# Ensure data directory exists for persistent database
RUN mkdir -p /app/data

# Data directory for file-backed JSON database
VOLUME ["/app/data"]

EXPOSE 3000

# Healthcheck to verify the server and database are healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })" || exit 1

CMD ["npx", "tsx", "server.ts"]
