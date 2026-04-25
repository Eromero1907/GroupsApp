# Build con contexto = raíz del monorepo:
#   docker build -f api-gateway/Dockerfile -t <ECR_URI> .
FROM node:20-alpine AS builder
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm install
COPY api-gateway/ ./
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs
CMD ["node", "dist/main"]
