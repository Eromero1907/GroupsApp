// src/common/http-client.service.ts
// Usado por groups-service para verificar que un userId existe
// llamando al users-service antes de agregar un miembro.

import {
  Injectable,
  HttpException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  async get<T>(url: string): Promise<T> {
    try {
      const response = await axios.get<T>(url, { timeout: 5000 });
      return response.data;
    } catch (error) {
      this.handleError(error, url);
    }
  }

  async post<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await axios.post<T>(url, data, { timeout: 5000 });
      return response.data;
    } catch (error) {
      this.handleError(error, url);
    }
  }

  private handleError(error: any, url: string): never {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;
      throw new HttpException(data?.message || 'Error en servicio externo', status);
    }
    if (axiosError.request) {
      this.logger.warn(`⚠️ Servicio no disponible: ${url}`);
      throw new HttpException('Servicio no disponible temporalmente', 503);
    }
    throw new HttpException('Error interno', 500);
  }
}
