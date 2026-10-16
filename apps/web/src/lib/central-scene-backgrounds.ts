import { useEffect, useRef, useState } from 'react';

export const CENTRAL_SCENE_BACKGROUNDS = [
  '/llamados/comando-anochecer.png',
  '/llamados/comando-mando.png',
  '/llamados/comando-nodo360.png',
] as const;

export function pickCentralSceneBackground(exclude?: string | null) {
  const pool = CENTRAL_SCENE_BACKGROUNDS.filter((src) => src !== exclude);
  const list = pool.length ? pool : CENTRAL_SCENE_BACKGROUNDS;
  return list[Math.floor(Math.random() * list.length)];
}

/** Elige un fondo al azar y lo cambia cada cierto tiempo para rotar las 3 fotos. */
export function useCentralSceneBackground(enabled = true, rotateMs = 40_000) {
  const [src, setSrc] = useState(() => pickCentralSceneBackground());
  const wasEnabled = useRef(enabled);

  useEffect(() => {
    if (enabled && !wasEnabled.current) {
      setSrc((current) => pickCentralSceneBackground(current));
    }
    wasEnabled.current = enabled;
    if (!enabled) return;
    const t = window.setInterval(() => {
      setSrc((current) => pickCentralSceneBackground(current));
    }, rotateMs);
    return () => window.clearInterval(t);
  }, [enabled, rotateMs]);

  return src;
}
