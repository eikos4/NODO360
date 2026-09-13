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
    });

    await expect(service.remove(bombero.id, { id: 'admin', role: 'SUPER_ADMIN' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a Super Admin deleting another Super Admin', async () => {
    const service = makeService({
      user: { findUnique: vi.fn().mockResolvedValue({ ...bombero, role: 'SUPER_ADMIN' }) },
    });

    await expect(service.remove(bombero.id, { id: 'admin-2', role: 'SUPER_ADMIN' }))
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
