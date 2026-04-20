/**
 * metrics.middleware.ts
 * Expone métricas Prometheus en GET /metrics de cada servicio.
 * Incluye: http_requests_total, http_request_duration_seconds, nodejs_* defaults
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as client from 'prom-client';

// Registrar métricas por defecto (CPU, memoria, event loop, etc.)
client.collectDefaultMetrics({ prefix: 'groupsapp_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      const labels = { method: req.method, route, status: res.statusCode.toString() };
      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, duration);
    });
    next();
  }
}

/** Handler para GET /metrics — montar en app.getHttpAdapter() */
export async function metricsHandler(req: any, res: any) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}