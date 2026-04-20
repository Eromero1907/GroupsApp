// src/auth/auth-gateway.controller.ts
// Rutas públicas (sin JWT): register y login
// Delega al auth-service en :3001

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { HttpClientService } from '../http/http.service';

const AUTH_URL = () => process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

@Controller('auth')
export class AuthGatewayController {
  constructor(private readonly http: HttpClientService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    return this.http.post(`${AUTH_URL()}/auth/register`, body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    return this.http.post(`${AUTH_URL()}/auth/login`, body);
  }
}
