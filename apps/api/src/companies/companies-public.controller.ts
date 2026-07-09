import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('companies/public')
export class CompaniesPublicController {
  constructor(private prisma: PrismaService) {}

  @Get(':slug')
  async getPublicProfile(@Param('slug') slug: string) {
    const company = await this.prisma.company.findFirst({
      where: { dispatchSlug: slug, isActive: true, dispatchPublicEnabled: true },
    });

    if (!company) throw new NotFoundException('Compañía no encontrada o sin perfil público');

    // Stats de emergencias del año actual
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    const [
      totalUsersCount,
      totalIncidentsYear,
      activeIncidentsCount,
      recentIncidents,
      vehiclesWithMaquinista,
      specialtyStats,
    ] = await Promise.all([
      this.prisma.user.count({ where: { companyId: company.id, isActive: true } }),

      this.prisma.incident.count({
        where: { companyId: company.id, dispatchedAt: { gte: startOfYear } },
      }),

      this.prisma.incident.count({
        where: { companyId: company.id, closedAt: null },
      }),

      this.prisma.incident.findMany({
        where: { companyId: company.id, closedAt: { not: null } },
        orderBy: { dispatchedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          type: true,
          address: true,
          dispatchedAt: true,
          closedAt: true,
          arrivedAt: true,
        },
      }),

      this.prisma.vehicle.findMany({
        where: { companyId: company.id },
        orderBy: { patent: 'asc' },
        select: {
          id: true,
          patent: true,
          brand: true,
          model: true,
          year: true,
          type: true,
          status: true,
          imageUrl: true,
          principalMaquinista: {
            select: { firstName: true, lastName: true, photoUrl: true },
          },
        },
      }),

      this.prisma.incident.groupBy({
        by: ['type'],
        where: { companyId: company.id },
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 5,
      }),
    ]);

    // Calcular tiempo promedio de respuesta (en minutos) para el año actual
    const incidentsWithArrival = await this.prisma.incident.findMany({
      where: {
        companyId: company.id,
        dispatchedAt: { gte: startOfYear },
        arrivedAt: { not: null },
      },
      select: { dispatchedAt: true, arrivedAt: true },
    });

    let avgResponseMinutes: number | null = null;
    if (incidentsWithArrival.length > 0) {
      const totalMs = incidentsWithArrival.reduce((sum, inc) => {
        return sum + (inc.arrivedAt!.getTime() - inc.dispatchedAt.getTime());
      }, 0);
      avgResponseMinutes = Math.round(totalMs / incidentsWithArrival.length / 60000);
    }

    return {
      id: company.id,
      slug: company.dispatchSlug,
      name: company.name,
      number: company.number,
      city: company.city,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logoUrl: company.logoUrl,
      headquartersImageUrl: company.headquartersImageUrl,
      stats: {
        totalVolunteers: totalUsersCount,
        incidentsThisYear: totalIncidentsYear,
        activeIncidents: activeIncidentsCount,
        avgResponseMinutes,
      },
      fleet: vehiclesWithMaquinista.map((v) => ({
        id: v.id,
        patent: v.patent,
        brand: v.brand,
        model: v.model,
        year: v.year,
        type: v.type,
        status: v.status,
        imageUrl: v.imageUrl,
        principalMaquinista: v.principalMaquinista
          ? {
              name: `${v.principalMaquinista.firstName} ${v.principalMaquinista.lastName}`,
              photoUrl: v.principalMaquinista.photoUrl,
            }
          : null,
      })),
      recentIncidents: recentIncidents.map((inc) => ({
        id: inc.id,
        code: inc.code,
        type: inc.type,
        address: inc.address,
        dispatchedAt: inc.dispatchedAt,
        closedAt: inc.closedAt,
        responseMinutes:
          inc.arrivedAt
            ? Math.round((inc.arrivedAt.getTime() - inc.dispatchedAt.getTime()) / 60000)
            : null,
      })),
      specialtyStats: specialtyStats.map((s) => ({
        type: s.type,
        count: s._count.type,
      })),
    };
  }
}
