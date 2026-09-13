export type RosterRow = {
  rut: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  role: string;
  companyNumber?: number;
  operativeNumber?: number;
};

const HEADER_ALIASES: Record<string, keyof RosterRow | 'companyRaw' | 'operativeRaw'> = {
  rut: 'rut',
  nombres: 'firstName',
  nombre: 'firstName',
  firstname: 'firstName',
  apellidos: 'lastName',
  apellido: 'lastName',
  lastname: 'lastName',
  correo: 'email',
  email: 'email',
  mail: 'email',
  telefono: 'phone',
  telefono_movil: 'phone',
  phone: 'phone',
  celular: 'phone',
  movil: 'phone',
  contrasena: 'password',
  password: 'password',
  clave: 'password',
  rol: 'role',
  role: 'role',
  roles: 'role',
  cargos: 'role',
  compania: 'companyRaw',
  company: 'companyRaw',
  cia: 'companyRaw',
  n_operativo: 'operativeRaw',
  operativo: 'operativeRaw',
  numero_operativo: 'operativeRaw',
};

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      out.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current.trim());
  return out;
}

function parseCompanyNumber(raw?: string) {
  const value = (raw ?? '').trim();
  if (!value || /sin\s*compa/i.test(value)) return undefined;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ordinals: Record<string, number> = {
    primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6,
    septima: 7, octava: 8, novena: 9, decima: 10,
  };
  for (const [name, num] of Object.entries(ordinals)) {
    if (key.includes(name)) return num;
  }
  const match = key.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function slugEmailPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function toRow(values: Partial<RosterRow> & { companyRaw?: string; operativeRaw?: string }): RosterRow | null {
  const rut = values.rut?.trim() ?? '';
  const firstName = values.firstName?.trim() ?? '';
  const lastName = values.lastName?.trim() ?? '';
  if (!rut || !firstName || !lastName) return null;
  const opRaw = values.operativeNumber ?? (values.operativeRaw ? Number(values.operativeRaw) : undefined);
  const operativeNumber = Number.isFinite(opRaw as number) ? Number(opRaw) : undefined;
  const email = values.email?.trim()
    || `${slugEmailPart(firstName)}.${slugEmailPart(lastName)}${operativeNumber ? `.${operativeNumber}` : ''}@bomberosparral.cl`;
  return {
    rut,
    firstName,
    lastName,
    email,
    phone: values.phone?.trim() || undefined,
    password: values.password || undefined,
    role: values.role?.trim() || 'BOMBERO',
    companyNumber: values.companyNumber ?? parseCompanyNumber(values.companyRaw),
    operativeNumber,
  };
}

export function parseRoster(text: string): RosterRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  const firstCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const hasHeader = firstCells.some((cell) => cell === 'rut' || cell === 'nombres' || cell === 'correo' || cell === 'email');

  if (hasHeader) {
    const index = firstCells.map((cell) => HEADER_ALIASES[cell]);
    return lines.slice(1).map((line) => {
      const cells = splitCsvLine(line);
      const values: Record<string, string> = {};
      index.forEach((key, i) => {
        if (key && cells[i]) values[key] = cells[i];
      });
      return toRow(values);
    }).filter((row): row is RosterRow => !!row);
  }

  return lines.map((line) => {
    const [rut, firstName, lastName, email, password, role, companyNumber, operativeNumber] = splitCsvLine(line);
    return toRow({
      rut,
      firstName,
      lastName,
      email,
      password,
      role,
      companyRaw: companyNumber,
      operativeRaw: operativeNumber,
    });
  }).filter((row): row is RosterRow => !!row);
}
