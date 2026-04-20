# GroupsApp 💬

Plataforma de mensajería grupal con arquitectura de microservicios. Proyecto universitario.

## Stack tecnológico

- **Frontend:** Next.js 15 + Tailwind CSS
- **Backend:** NestJS (6 microservicios + API Gateway)
- **Comunicaciones:** REST · Kafka (13 topics) · gRPC
- **Bases de datos:** PostgreSQL × 6 + Redis
- **Infraestructura:** Docker Compose · Consul · Prometheus · Grafana · Loki

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                  │
│                   localhost:3000                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────┐
│               API Gateway :4000                     │
└──┬──────┬──────┬──────┬──────┬──────────────────────┘
   │      │      │      │      │   REST
   ▼      ▼      ▼      ▼      ▼
Auth   Users  Groups  Msg   Media  Presence
:3001  :3002  :3003  :3005  :3004   :3006
  │      │      │      │               │
  └──────┴──────┴──────┴───────────────┘
              Kafka / gRPC / Redis
```

### Microservicios

| Servicio | Puerto HTTP | Puerto gRPC | Base de datos |
|---|---|---|---|
| auth-service | 3001 | — | postgres-auth |
| users-service | 3002 | 50052 | postgres-users |
| groups-service | 3003 | 50053 | postgres-groups |
| media-service | 3004 | — | postgres-media |
| messaging-service | 3005 | 50054 | postgres-messaging |
| presence-service | 3006 | — | Redis |
| api-gateway | 4000 | — | — |

## Requisitos

- Docker + Docker Compose
- Node.js 20+
- npm o pnpm

## Levantar el proyecto

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/GroupsApp.git
cd GroupsApp

# 2. Variables de entorno (opcional — hay defaults en docker-compose)
cp .env.example .env

# 3. Levantar toda la infraestructura
docker compose up --build

# 4. Frontend (en otra terminal)
npm install
npm run dev
```

La app estará disponible en **http://localhost:3000**

## Servicios de monitoreo

| Servicio | URL | Credenciales |
|---|---|---|
| Grafana | http://localhost:3100 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Consul | http://localhost:8500 | — |
| Kafka UI | http://localhost:8080 | — |

## Funcionalidades

- ✅ Registro y autenticación con JWT + bcrypt
- ✅ CRUD de grupos con visibilidad, políticas de unión y roles
- ✅ Contactos: agregar, aceptar, bloquear, mensajes directos
- ✅ Mensajería grupal con edición y eliminación de mensajes
- ✅ Mensajes directos 1-1 con historial
- ✅ Presencia en tiempo real con WebSocket (Socket.IO)
- ✅ Subida de archivos e imágenes inline en chat
- ✅ Paginación e historial recuperable
- ✅ Descubrimiento de servicios con Consul
- ✅ Métricas con Prometheus + dashboards en Grafana
- ✅ Logs centralizados con Loki + Promtail

## Estructura del proyecto

```
GroupsApp/
├── services/
│   ├── auth-service/
│   ├── users-service/
│   ├── groups-service/
│   ├── messaging-service/
│   ├── media-service/
│   └── presence-service/
├── api-gateway/
├── components/        # Componentes React compartidos
├── contexts/          # Context providers (auth, etc.)
├── hooks/             # Custom hooks
├── lib/               # Utilidades y cliente API
├── proto/             # Definiciones gRPC
├── monitoring/        # Configuración Prometheus, Grafana, Loki
└── docker-compose.yml
```

## Variables de entorno

Las variables con defaults funcionales están en `docker-compose.yml`. Para producción crear un `.env`:

```env
JWT_SECRET=tu-secreto-seguro-aqui
# AWS (para media-service en producción)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...
```