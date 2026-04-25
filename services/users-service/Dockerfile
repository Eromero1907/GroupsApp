# Build con contexto = raíz del monorepo:
#   docker build -f services/users-service/Dockerfile -t <ECR_URI> .
FROM node:20-alpine AS builder
WORKDIR /app
COPY services/users-service/package*.json ./
RUN npm install
RUN npm install prom-client axios
COPY services/users-service/ ./
COPY proto/ /app/proto/
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY services/users-service/package*.json ./
RUN npm install --omit=dev
RUN npm install prom-client axios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs
CMD ["node", "dist/main"]
