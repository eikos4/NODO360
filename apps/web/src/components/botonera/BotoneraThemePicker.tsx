import { BOTONERA_THEME_LIST, type BotoneraThemeId } from '../../lib/botonera-themes';

type Props = {
  active: BotoneraThemeId;
  onChange: (id: BotoneraThemeId) => void;
};

export default function BotoneraThemePicker({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin shrink-0">
      {BOTONERA_THEME_LIST.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          title={t.description}
          className={`shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border-2 transition-all min-w-[100px] ${
            active === t.id
              ? 'border-white/40 bg-white/10 scale-[1.02]'
              : 'border-transparent bg-black/20 hover:bg-black/30'
          }`}
        >
          <div className={`w-full h-2 rounded-full border ${t.preview}`} />
          <span className="text-xs font-bold text-white">{t.label}</span>
          <span className="text-[9px] text-slate-500 leading-tight text-left line-clamp-2">{t.description}</span>
        </button>
      ))}
    </div>
  );
}
