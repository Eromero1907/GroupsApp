/**
 * consul-registration.ts
 * Registra el microservicio en Consul al arrancar y lo desregistra al cerrar.
 * Uso: llamar registerService() en el bootstrap() de cada main.ts
 * 
 * Consul UI: http://localhost:8500
 */

import axios from 'axios';

const CONSUL_URL = process.env.CONSUL_URL || 'http://consul:8500';

export interface ConsulServiceConfig {
  name: string;       // e.g. 'auth-service'
  id?: string;        // default: name + hostname
  port: number;
  tags?: string[];
  healthPath?: string; // default: /health
  interval?: string;   // default: 10s
}

export async function registerService(config: ConsulServiceConfig): Promise<void> {
  const host = process.env.HOSTNAME || 'localhost';
  const serviceId = config.id || `${config.name}-${host}`;
  const healthPath = config.healthPath || '/health';

  const payload = {
    ID: serviceId,
    Name: config.name,
    Tags: config.tags || ['nestjs'],
    Address: host,
    Port: config.port,
    Check: {
      HTTP: `http://${host}:${config.port}${healthPath}`,
      Interval: config.interval || '10s',
      Timeout: '5s',
      DeregisterCriticalServiceAfter: '30s',
    },
  };

  try {
    await axios.put(`${CONSUL_URL}/v1/agent/service/register`, payload);
    console.log(`✅ [Consul] Servicio '${config.name}' registrado (id: ${serviceId})`);

    // Desregistrar al cerrar
    const deregister = async () => {
      try {
        await axios.put(`${CONSUL_URL}/v1/agent/service/deregister/${serviceId}`);
        console.log(`🔴 [Consul] Servicio '${serviceId}' desregistrado`);
      } catch { /* silent */ }
    };
    process.on('SIGTERM', deregister);
    process.on('SIGINT', deregister);
  } catch (err) {
    // No crashear si Consul no está disponible
    console.warn(`⚠️  [Consul] No se pudo registrar '${config.name}': ${err.message}`);
  }
}

export async function discoverService(serviceName: string): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `${CONSUL_URL}/v1/health/service/${serviceName}?passing=true`
    );
    if (data?.length > 0) {
      const { Service } = data[0];
      return `http://${Service.Address}:${Service.Port}`;
    }
    return null;
  } catch {
    return null;
  }
}