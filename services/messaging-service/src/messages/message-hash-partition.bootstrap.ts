import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

const TABLES: readonly string[] = [
  'messages',
  'direct_messages',
  'message_status',
];

@Injectable()
export class MessageHashPartitionBootstrap implements OnApplicationBootstrap {
  private readonly log = new Logger(MessageHashPartitionBootstrap.name);

  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    if (process.env.MESSAGING_DISABLE_PARTITION_MIGRATION === '1') {
      this.log.warn('Migración de particiones desactivada (MESSAGING_DISABLE_PARTITION_MIGRATION=1)');
      return;
    }
    for (const table of TABLES) {
      await this.ensureHashPartitioned(table);
    }
  }

  private async ensureHashPartitioned(table: string) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    try {
      const rows: { relkind: string }[] = await qr.query(
        `SELECT c.relkind::text as relkind
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = $1`,
        [table],
      );
      if (!rows.length) {
        this.log.warn(`No existe public.${table}; se omite particionado (¿arrancó el sync de TypeORM?)`);
        return;
      }
      if (rows[0].relkind === 'p') {
        this.log.log(`public.${table} ya es tabla particionada`);
        return;
      }
      if (rows[0].relkind !== 'r') {
        this.log.warn(`public.${table} relkind=${rows[0].relkind} — se omite`);
        return;
      }

      const tmp = `${table}_ptmp`;

      await qr.startTransaction();
      try {
        for (let i = 0; i < 4; i++) {
          await qr.query(`DROP TABLE IF EXISTS public.${tmp}_p${i} CASCADE`);
        }
        await qr.query(`DROP TABLE IF EXISTS public.${tmp} CASCADE`);
        await qr.query(
          `CREATE TABLE public.${tmp} (LIKE public.${table} INCLUDING ALL) PARTITION BY HASH (id)`,
        );
        for (let i = 0; i < 4; i++) {
          await qr.query(
            `CREATE TABLE public.${tmp}_p${i} PARTITION OF public.${tmp} FOR VALUES WITH (MODULUS 4, REMAINDER ${i})`,
          );
        }
        await qr.query(`INSERT INTO public.${tmp} SELECT * FROM public.${table}`);
        await qr.query(`DROP TABLE public.${table} CASCADE`);
        await qr.query(`ALTER TABLE public.${tmp} RENAME TO ${table}`);
        await qr.commitTransaction();
        this.log.log(
          `public.${table} migrada a particiones HASH(id), MODULUS 4 (PostgreSQL)`,
        );
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      }
    } catch (e) {
      this.log.error(`Error particionando ${table}: ${(e as Error).message}`);
      throw e;
    } finally {
      await qr.release();
    }
  }
}
