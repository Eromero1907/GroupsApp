#!/bin/bash
# =============================================
# GroupsApp Microservices - Setup Script
# Copia los .env.example a .env en cada servicio
# Uso: bash setup.sh
# =============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 GroupsApp Microservices - Setup${NC}"
echo "============================================"

SERVICES=(
  "api-gateway"
  "services/groups-service"
  "services/messaging-service"
  "services/media-service"
  "services/presence-service"
)

# Copiar .env.example → .env en cada servicio
for svc in "${SERVICES[@]}"; do
  if [ -f "$svc/.env.example" ]; then
    if [ ! -f "$svc/.env" ]; then
      cp "$svc/.env.example" "$svc/.env"
      echo -e "  ✅ $svc/.env creado"
    else
      echo -e "  ${YELLOW}⚠️  $svc/.env ya existe, se omite${NC}"
    fi
  fi
done

# Copiar .env.example raíz
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo -e "  ✅ .env raíz creado"
fi

echo ""
echo -e "${GREEN}✅ Setup completo.${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. Revisar y ajustar los archivos .env si es necesario"
echo "  2. docker compose up --build"
echo "  3. Probar en http://localhost:3000"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Cambiar JWT_SECRET en .env antes de producción${NC}"
