import { Injectable, HttpException, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

@Injectable()
export class HttpClientService {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.get<T>(url, config);
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.post<T>(url, data, config);
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.put<T>(url, data, config);
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.delete<T>(url, config);
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios.patch<T>(url, data, config);
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  /** Forward de multipart/form-data al microservicio */
  async postForm<T>(url: string, form: any): Promise<T> {
    try {
      const response = await axios.post<T>(url, form, {
        headers: form.getHeaders ? form.getHeaders() : { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) { this.handleError(error); }
  }

  private handleError(error: any): never {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data as any;
      throw new HttpException(data?.message || data || 'Error en microservicio', status);
    }
    if (axiosError.request) throw new HttpException('Servicio no disponible temporalmente', 503);
    throw new InternalServerErrorException('Error interno del gateway');
  }
}
