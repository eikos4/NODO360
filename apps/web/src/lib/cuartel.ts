export type CuartelItem = {
  id: string;
  number: number;
  name: string;
  city: string;
  address: string;
  logoUrl?: string | null;
  dispatchSlug: string | null;
  dispatchPublicEnabled: boolean;
  dispatchAvailable: boolean;
  status: 'DISPONIBLE' | 'NO_DISPONIBLE' | 'OCULTA';
  roster: { total: number; available: number; unavailable: number };
  maquinistas: { total: number; available: number; unavailable: number };
  fleet: { total: number; operativo: number };
  activeEmergencies: number;
};
