import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { type?: string; priority?: string; targetAudience?: string }) {
    const where: any = { isActive: true };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.targetAudience) {
      where.targetAudience = filters.targetAudience;
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    return announcements;
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Anuncio no encontrado');
    }

    return announcement;
  }

  async create(dto: CreateAnnouncementDto, publishedBy: string) {
    return this.prisma.announcement.create({
      data: {
        ...dto,
        publishedBy,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.announcement.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
