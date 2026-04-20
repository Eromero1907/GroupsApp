import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { HttpClientService } from '../http/http.service';
import { JwtAuthGuard } from '../guards/jwt.guard';

const USERS_URL = () => process.env.USERS_SERVICE_URL || 'http://localhost:3002';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersGatewayController {
  constructor(private readonly http: HttpClientService) {}

  @Get()
  async findAll() { return this.http.get(`${USERS_URL()}/users`); }

  @Get(':id')
  async findById(@Param('id') id: string) { return this.http.get(`${USERS_URL()}/users/${id}`); }

  @Put(':id')
  async updateProfile(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (req.user.sub !== id) return { error: 'Unauthorized' };
    return this.http.put(`${USERS_URL()}/users/${id}`, body);
  }

  // ── Contactos ─────────────────────────────────────────────────

  /** Enviar solicitud de contacto */
  @Post('contacts')
  @HttpCode(HttpStatus.CREATED)
  async addContact(@Body() body: any, @Request() req: any) {
    return this.http.post(`${USERS_URL()}/contacts`, { ...body, ownerId: req.user.sub });
  }

  /** Mis contactos */
  @Get('contacts/me')
  async getMyContacts(@Request() req: any, @Query('status') status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.http.get(`${USERS_URL()}/contacts/${req.user.sub}${qs}`);
  }

  /** Solicitudes pendientes hacia mí */
  @Get('contacts/pending')
  async getPendingRequests(@Request() req: any) {
    return this.http.get(`${USERS_URL()}/contacts/${req.user.sub}/pending`);
  }

  /** Aceptar solicitud */
  @Post('contacts/accept/:contactId')
  @HttpCode(HttpStatus.OK)
  async acceptContact(@Param('contactId') contactId: string, @Request() req: any) {
    return this.http.post(`${USERS_URL()}/contacts/${req.user.sub}/accept/${contactId}`, {});
  }

  /** Actualizar (bloquear / alias) */
  @Put('contacts/:contactId')
  async updateContact(@Param('contactId') contactId: string, @Body() body: any, @Request() req: any) {
    return this.http.put(`${USERS_URL()}/contacts/${req.user.sub}/${contactId}`, body);
  }

  /** Eliminar contacto */
  @Delete('contacts/:contactId')
  async removeContact(@Param('contactId') contactId: string, @Request() req: any) {
    return this.http.delete(`${USERS_URL()}/contacts/${req.user.sub}/${contactId}`);
  }
}
