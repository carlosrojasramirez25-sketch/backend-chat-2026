import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbUrl = new URL(process.env.DATABASE_URL ?? 'mysql://build:build@localhost:3306/build');
    const adapter = new PrismaMariaDb({
      host: dbUrl.hostname,
      port: Number(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.substring(1),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}

// En Prisma v7 los accesores de modelos están en el interface, no en la clase.
// Este merge hace que TypeScript los vea en PrismaService.
export interface PrismaService extends PrismaClient {}
