import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { AddContactDto, UpdateContactDto } from './dto/contact.dto';
import { ContactStatus } from './entities/contact.entity';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /** Enviar solicitud de contacto */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addContact(@Body() dto: AddContactDto) {
    return this.contactsService.addContact(dto.ownerId, dto.contactId, dto.nickname);
  }

  /** Mis contactos aceptados (o filtrar por status) */
  @Get(':ownerId')
  async getContacts(
    @Param('ownerId') ownerId: string,
    @Query('status') status?: ContactStatus,
  ) {
    return this.contactsService.getContacts(ownerId, status);
  }

  /** Solicitudes pendientes hacia mí */
  @Get(':userId/pending')
  async getPendingRequests(@Param('userId') userId: string) {
    return this.contactsService.getPendingRequests(userId);
  }

  /** Aceptar solicitud de contacto */
  @Post(':ownerId/accept/:contactId')
  @HttpCode(HttpStatus.OK)
  async acceptContact(
    @Param('ownerId') ownerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.acceptContact(ownerId, contactId);
  }

  /** Rechazar solicitud de contacto */
  @Post(':ownerId/reject/:contactId')
  @HttpCode(HttpStatus.OK)
  async rejectContact(
    @Param('ownerId') ownerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.rejectContact(ownerId, contactId);
  }

  /** Actualizar contacto (estado / nickname) */
  @Put(':ownerId/:contactId')
  async updateContact(
    @Param('ownerId') ownerId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(ownerId, contactId, dto.status, dto.nickname);
  }

  /** Eliminar contacto */
  @Delete(':ownerId/:contactId')
  async removeContact(
    @Param('ownerId') ownerId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.removeContact(ownerId, contactId);
  }

  /** Verificar si dos usuarios son contactos (uso interno) */
  @Get(':userA/check/:userB')
  async areContacts(
    @Param('userA') userA: string,
    @Param('userB') userB: string,
  ) {
    const result = await this.contactsService.areContacts(userA, userB);
    return { areContacts: result };
  }
}
