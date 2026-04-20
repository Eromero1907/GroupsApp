import { Injectable, HttpException, Logger } from '@nestjs/common';
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

  private handleError(error: any, url: string): never {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;
      throw new HttpException(data?.message || 'Error en servicio externo', status);
    }
    this.logger.warn(`⚠️ Servicio no disponible: ${url}`);
    throw new HttpException('Servicio no disponible temporalmente', 503);
  }
}