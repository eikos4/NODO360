import { useState, useEffect } from 'react';
import { Building2, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { useSimpleDispatch } from '../hooks/useQuickDispatch';
import { useBotoneraTheme } from '../hooks/useBotoneraTheme';
import { BOTONERA_THEMES } from '../lib/botonera-themes';
import BotoneraThemePicker from '../components/botonera/BotoneraThemePicker';
import { renderBotoneraVariant } from '../components/botonera/BotoneraVariants';
import type { CuartelItem } from '../components/botonera/CuartelOverviewPanel';

export default function BotoneraShell() {
  const d = useSimpleDispatch();
  const { themeId, setThemeId } = useBotoneraTheme();
  const theme = BOTONERA_THEMES[themeId];
  const [showCuarteles, setShowCuarteles] = useState(themeId === 'institutional' || themeId === 'command');

  useEffect(() => {
    if (themeId === 'institutional' || themeId === 'command') setShowCuarteles(true);
  }, [themeId]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [ensuringId, setEnsuringId] = useState<string | null>(null);

  const cuarteles = (d.cuarteles ?? []) as CuartelItem[];

  const onToggleAvailable = (id: string, available: boolean) => {
    setUpdatingId(id);
    d.updateDispatchConfig.mutate(
      { companyId: id, data: { dispatchAvailable: available } },
      { onSettled: () => setUpdatingId(null) },
    );
  };

  const onTogglePublic = (id: string, enabled: boolean) => {
    setUpdatingId(id);
    d.updateDispatchConfig.mutate(
      { companyId: id, data: { dispatchPublicEnabled: enabled } },
      { onSettled: () => setUpdatingId(null) },
    );
  };

  const onEnsureSlug = (id: string) => {
    setEnsuringId(id);
    d.ensureSlug.mutate(id, { onSettled: () => setEnsuringId(null) });
  };

  return (
    <div className={`relative flex flex-col h-full min-h-0 w-full overflow-hidden ${theme.root}`}>
      {/* Barra de temas */}
      <div className={`shrink-0 border-b px-3 py-2 space-y-2 ${theme.header} ${theme.headerBorder}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutGrid className={`w-4 h-4 shrink-0 ${theme.accentText}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>
              Versión de botonera
            </span>
            <span className={`hidden sm:inline text-[10px] ${theme.textMuted}`}>
              — 5 diseños · lógica simplificada
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCuarteles((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${theme.panelBorder} ${theme.accentText}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Cuarteles ({cuarteles.length})
            {showCuarteles ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        <BotoneraThemePicker active={themeId} onChange={setThemeId} />
      </div>

      {/* Variante activa */}
      {renderBotoneraVariant({
        d,
        theme,
        cuarteles,
        showCuarteles,
        onToggleAvailable,
        onTogglePublic,
        onEnsureSlug,
        updatingId,
        ensuringId,
      })}
    </div>
  );
}
