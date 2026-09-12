import { roleInfo } from '../lib/roles';

type Props = {
  role?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  /** En sala pública: degradado del cargo y letras blancas. */
  contrast?: boolean;
};

const SIZE = {
  xs: { wrap: 'gap-0.5 text-[9px]', icon: 'w-3 h-3', pill: 'px-1.5 py-0.5' },
  sm: { wrap: 'gap-1 text-[10px]', icon: 'w-3.5 h-3.5', pill: 'px-2 py-0.5' },
  md: { wrap: 'gap-1.5 text-xs', icon: 'w-4 h-4', pill: 'px-2.5 py-1' },
};

/** Icono + etiqueta del tipo de bombero / rol (sala de máquinas, personal, etc.) */
export default function RoleBadge({ role, size = 'sm', showLabel = true, className = '', contrast = false }: Props) {
  const meta = roleInfo(role);
  const Icon = meta.icon;
  const s = SIZE[size];

  return (
    <span
      className={`inline-flex items-center ${s.wrap} ${s.pill} rounded-lg border font-semibold ${
        contrast
          ? `bg-gradient-to-r ${meta.color} border-transparent !text-white shadow-sm`
          : meta.badge
      } ${className}`}
      title={meta.label}
    >
      <Icon className={`${s.icon} shrink-0 ${contrast ? 'text-white' : meta.iconClass}`} />
      {showLabel && <span className={`truncate ${contrast ? '!text-white' : ''}`}>{meta.short}</span>}
    </span>
  );
}
