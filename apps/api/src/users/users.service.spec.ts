import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

const bombero = {
  id: 'user-bombero',
  rut: '11.111.111-1',
  firstName: 'Mario',
  lastName: 'González',
  email: 'mario@cia.cl',
  role: 'BOMBERO',
  companyId: 'cia-1',
  isActive: true,
  photoUrl: null,
  operativeNumber: 7,
  stationAvailable: false,
  stationAvailableAt: null,
  createdAt: new Date(),
  company: null,
  achievements: [],
};

function makeService(prisma: Record<string, unknown>) {
  return new UsersService(prisma as never);
}

describe('UsersService.create', () => {
  it('rejects a Comandante assigning Super Admin', async () => {
    const service = makeService({
      user: { findFirst: vi.fn() },
    });

    await expect(service.create({
      rut: '22.222.222-2',
      firstName: 'Admin',
      lastName: 'Cuerpo',
      email: 'admin@cuerpo.cl',
      password: 'Demo1234!',
      role: 'SUPER_ADMIN' as never,
      companyId: 'cia-1',
    }, { id: 'cmd', role: 'COMANDANTE', companyId: 'cia-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets Super Admin keep a platform number without a company', async () => {
    const created = { ...bombero, id: 'admin-1', role: 'SUPER_ADMIN', companyId: null, operativeNumber: 666 };
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const service = makeService(prisma);

    await expect(service.create({
      rut: '22.222.222-2',
      firstName: 'Admin',
      lastName: 'Cuerpo',
      email: 'admin@cuerpo.cl',
      password: 'Demo1234!',
      role: 'SUPER_ADMIN' as never,
      companyId: null,
      operativeNumber: 666,
    })).resolves.toMatchObject({ operativeNumber: 666, companyId: null });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        companyId: null,
        operativeNumber: 666,
        role: 'SUPER_ADMIN',
      }),
    }));
  });
});

describe('UsersService.remove', () => {
  it('rejects deleting a missing user', async () => {
    const service = makeService({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.remove('missing', { id: 'kodesk', role: 'KODESK' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deleting the current profile', async () => {
    const service = makeService({
      user: { findUnique: vi.fn().mockResolvedValue(bombero) },
    });

    await expect(service.remove(bombero.id, { id: bombero.id, role: 'KODESK' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects deleting a Kodesk profile', async () => {
    const service = makeService({
      user: { findUnique: vi.fn().mockResolvedValue({ ...bombero, role: 'KODESK' }) },
      company: { findUnique: vi.fn().mockResolvedValue({ id: 'cia-1', cuerpoId: 'c-1' }) },
      cuerpo: { findMany: vi.fn().mockResolvedValue([{ id: 'c-1' }]) },
    });

    await expect(service.remove(bombero.id, { id: 'admin', role: 'SUPER_ADMIN', companyId: 'cia-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a Super Admin deleting another Super Admin', async () => {
    const service = makeService({
      user: { findUnique: vi.fn().mockResolvedValue({ ...bombero, role: 'SUPER_ADMIN' }) },
      company: { findUnique: vi.fn().mockResolvedValue({ id: 'cia-1', cuerpoId: 'c-1' }) },
      cuerpo: { findMany: vi.fn().mockResolvedValue([{ id: 'c-1' }]) },
    });

    await expect(service.remove(bombero.id, { id: 'admin-2', role: 'SUPER_ADMIN', companyId: 'cia-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets Kodesk delete a firefighter and clears relations first', async () => {
    const tx = {
      vehicle: { updateMany: vi.fn() },
      guardLog: { updateMany: vi.fn() },
      inventoryAudit: { updateMany: vi.fn() },
      emergencyBitacoraEntry: { updateMany: vi.fn() },
      fleetLog: { updateMany: vi.fn(), deleteMany: vi.fn() },
      incidentParticipant: { deleteMany: vi.fn() },
      shift: { deleteMany: vi.fn() },
      socialContribution: { deleteMany: vi.fn() },
      guardLogEntry: { updateMany: vi.fn(), deleteMany: vi.fn() },
      guardHandover: { updateMany: vi.fn(), deleteMany: vi.fn() },
      user: { delete: vi.fn().mockResolvedValue(bombero) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(bombero) },
      $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    const service = makeService(prisma);

    await expect(service.remove(bombero.id, { id: 'kodesk', role: 'KODESK' }))
      .resolves.toEqual({
        ok: true,
        deleted: bombero.id,
        name: 'Mario González',
      });

    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: bombero.id } });
    expect(tx.fleetLog.updateMany).toHaveBeenCalledWith({
      where: { registeredById: bombero.id },
      data: { registeredById: 'kodesk' },
    });
  });
});
