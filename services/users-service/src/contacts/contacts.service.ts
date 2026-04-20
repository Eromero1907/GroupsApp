import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactStatus } from './entities/contact.entity';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(Contact)
    private contactsRepository: Repository<Contact>,
  ) {}

  /** Enviar solicitud de contacto */
  async addContact(ownerId: string, contactId: string, nickname?: string) {
    if (ownerId === contactId) {
      throw new BadRequestException('No puedes agregarte a ti mismo como contacto');
    }

    const existing = await this.contactsRepository.findOne({
      where: { ownerId, contactId },
    });
    if (existing) {
      if (existing.status === ContactStatus.BLOCKED) {
        throw new ConflictException('Este contacto está bloqueado');
      }
      throw new ConflictException('Este contacto ya existe');
    }

    const contact = this.contactsRepository.create({
      ownerId,
      contactId,
      nickname: nickname || null,
      status: ContactStatus.PENDING,
    });
    const saved = await this.contactsRepository.save(contact);
    this.logger.log(`Solicitud de contacto: ${ownerId} → ${contactId}`);
    return saved;
  }

  /** Aceptar solicitud de contacto entrante */
  async acceptContact(ownerId: string, contactId: string) {
    // La solicitud viene del contactId hacia mí (ownerId)
    const request = await this.contactsRepository.findOne({
      where: { ownerId: contactId, contactId: ownerId, status: ContactStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Solicitud de contacto no encontrada');

    request.status = ContactStatus.ACCEPTED;
    await this.contactsRepository.save(request);

    // Crear la relación recíproca
    const reciprocal = await this.contactsRepository.findOne({
      where: { ownerId, contactId },
    });
    if (!reciprocal) {
      await this.contactsRepository.save(
        this.contactsRepository.create({ ownerId, contactId, status: ContactStatus.ACCEPTED }),
      );
    } else {
      reciprocal.status = ContactStatus.ACCEPTED;
      await this.contactsRepository.save(reciprocal);
    }

    this.logger.log(`Contacto aceptado: ${ownerId} ↔ ${contactId}`);
    return { message: 'Contacto aceptado', ownerId, contactId };
  }

  /** Rechazar solicitud de contacto entrante */
  async rejectContact(ownerId: string, contactId: string) {
    // La solicitud viene del contactId hacia mí (ownerId)
    const request = await this.contactsRepository.findOne({
      where: { ownerId: contactId, contactId: ownerId, status: ContactStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Solicitud de contacto no encontrada');

    // Eliminar la solicitud pendiente
    await this.contactsRepository.remove(request);
    this.logger.log(`Solicitud de contacto rechazada: ${contactId} → ${ownerId}`);
    return { message: 'Solicitud rechazada' };
  }

  /** Listar mis contactos (aceptados) */
  async getContacts(ownerId: string, status?: ContactStatus) {
    const where: any = { ownerId };
    if (status) where.status = status;
    return this.contactsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  /** Solicitudes de contacto pendientes hacia mí */
  async getPendingRequests(userId: string) {
    return this.contactsRepository.find({
      where: { contactId: userId, status: ContactStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  /** Bloquear o actualizar estado de un contacto */
  async updateContact(ownerId: string, contactId: string, status?: ContactStatus, nickname?: string) {
    const contact = await this.contactsRepository.findOne({ where: { ownerId, contactId } });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    if (status !== undefined) contact.status = status;
    if (nickname !== undefined) contact.nickname = nickname;
    return this.contactsRepository.save(contact);
  }

  /** Eliminar un contacto (bidireccional - elimina ambas relaciones) */
  async removeContact(ownerId: string, contactId: string) {
    const contact = await this.contactsRepository.findOne({ where: { ownerId, contactId } });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    await this.contactsRepository.remove(contact);

    // Eliminar también la relación recíproca
    const reciprocal = await this.contactsRepository.findOne({ where: { ownerId: contactId, contactId: ownerId } });
    if (reciprocal) {
      await this.contactsRepository.remove(reciprocal);
    }

    this.logger.log(`Contacto eliminado bidireccional: ${ownerId} ↔ ${contactId}`);
    return { message: 'Contacto eliminado' };
  }

  /** Verificar si dos usuarios son contactos */
  async areContacts(userA: string, userB: string): Promise<boolean> {
    const contact = await this.contactsRepository.findOne({
      where: { ownerId: userA, contactId: userB, status: ContactStatus.ACCEPTED },
    });
    return !!contact;
  }
}
