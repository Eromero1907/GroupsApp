import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import axios from 'axios';
import * as client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'groupsapp_' });

async function registerConsul(name: string, port: number) {
  const consulUrl = process.env.CONSUL_URL || 'http://consul:8500';
  const host = process.env.HOSTNAME || 'localhost';
  try {
    await axios.put(`${consulUrl}/v1/agent/service/register`, {
      ID: `${name}-${host}`, Name: name, Tags: ['nestjs'],
      Address: host, Port: port,
      Check: { HTTP: `http://${host}:${port}/health`, Interval: '10s', Timeout: '5s', DeregisterCriticalServiceAfter: '30s' },
    });
    console.log(`✅ [Consul] ${name} registrado`);
  } catch (e) { console.warn(`⚠️ [Consul] No se pudo registrar ${name}: ${e.message}`); }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.getHttpAdapter().get('/health', (req, res) => res.json({ status: 'ok', service: 'media-service' }));
  app.getHttpAdapter().get('/metrics', async (req, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });
  const port = Number(process.env.PORT ?? 3004);
  await app.listen(port);
  console.log(`📁 Media Service corriendo en http://localhost:${port}`);
  await registerConsul('media-service', port);
}
bootstrap();