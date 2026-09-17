import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { Actor, assertCompanyAccess, companyIdWhere, companyIdsForActor, isPlatformOwner } from '../common/cuerpo-scope';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private async scopedWhere(actor: Actor, companyId?: string) {
    const ids = await companyIdsForActor(this.prisma, actor, companyId);
    return companyIdWhere(ids);
  }

  private async assertDocAccess(id: string, actor: Actor) {
    const doc = await this.findById(id);
    if (doc.companyId) await assertCompanyAccess(this.prisma, actor, doc.companyId);
    else if (!isPlatformOwner(actor.role, actor.roles)) {
      throw new ForbiddenException('Sin permiso para este documento');
    }
    return doc;
  }

  async findAll(actor: Actor, companyId?: string, category?: string) {
    return this.prisma.document.findMany({
      where: {
        ...(await this.scopedWhere(actor, companyId)),
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

  async findByIdAuthorized(id: string, actor: Actor) {
    return this.assertDocAccess(id, actor);
  }

  async create(dto: CreateDocumentDto, actor: Actor) {
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);
    else if (actor.companyId) dto.companyId = actor.companyId;
    return this.prisma.document.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateDocumentDto>, actor: Actor) {
    await this.assertDocAccess(id, actor);
    if (dto.companyId) await assertCompanyAccess(this.prisma, actor, dto.companyId);
    return this.prisma.document.update({ where: { id }, data: dto });
  }

  async delete(id: string, actor: Actor) {
    await this.assertDocAccess(id, actor);
    return this.prisma.document.delete({ where: { id } });
  }

  async getExpiring(actor: Actor) {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const scope = await this.scopedWhere(actor);
    return {
      expired: await this.prisma.document.findMany({
        where: { ...scope, expiresAt: { lt: now } },
        orderBy: { expiresAt: 'asc' },
      }),
      expiringSoon: await this.prisma.document.findMany({
        where: { ...scope, expiresAt: { gte: now, lte: in30 } },
        orderBy: { expiresAt: 'asc' },
      }),
    };
  }
}
