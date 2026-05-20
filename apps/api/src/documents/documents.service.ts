import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: string, category?: string) {
    return this.prisma.document.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async create(dto: CreateDocumentDto) {
    return this.prisma.document.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateDocumentDto>) {
    await this.findById(id);
    return this.prisma.document.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.document.delete({ where: { id } });
  }

  async getExpiring() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      expired: await this.prisma.document.findMany({ where: { expiresAt: { lt: now } }, orderBy: { expiresAt: 'asc' } }),
      expiringSoon: await this.prisma.document.findMany({ where: { expiresAt: { gte: now, lte: in30 } }, orderBy: { expiresAt: 'asc' } }),
    };
  }
}
