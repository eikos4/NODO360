import { useEffect, useState } from 'react';
import { Bell, Calendar, ChevronLeft, MapPin, Megaphone, User } from 'lucide-react';
import { api } from './lib/api';

export type MobileAnnouncement = {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  imageUrl?: string | null;
  attachments?: string[];
  publishedAt: string;
  publisher?: { firstName: string; lastName: string };
};

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: 'Anuncio',
  OFFICIAL: 'Oficial',
  EVENT: 'Evento',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

function author(item: MobileAnnouncement) {
  const name = `${item.publisher?.firstName ?? ''} ${item.publisher?.lastName ?? ''}`.trim();
  return name || 'Cuerpo';
}

export function AnnouncementsScreen({ onCount }: { onCount?: (n: number) => void }) {
  const [items, setItems] = useState<MobileAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MobileAnnouncement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.get<MobileAnnouncement[]>('/announcements')
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data);
        onCount?.(data.length);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [onCount]);

  if (selected) {
    return (
      <article className="announce-detail">
        <button type="button" className="announce-back" onClick={() => setSelected(null)}>
          <ChevronLeft /> Volver al tablón
        </button>
        {selected.imageUrl && <img src={selected.imageUrl} alt="" className="announce-hero" />}
        <div className="announce-meta">
          <b className={selected.priority === 'URGENT' ? 'hot' : ''}>{PRIORITY_LABELS[selected.priority]}</b>
          <span>{TYPE_LABELS[selected.type]}</span>
        </div>
        <h2>{selected.title}</h2>
        <p className="announce-body">{selected.content}</p>
        {(selected.eventDate || selected.eventLocation) && (
          <div className="announce-event">
            {selected.eventDate && <span><Calendar /> {fmt(selected.eventDate)}</span>}
            {selected.eventLocation && <span><MapPin /> {selected.eventLocation}</span>}
          </div>
        )}
        {selected.attachments?.length ? (
          <div className="announce-gallery">
            {selected.attachments.map((url) => <img key={url} src={url} alt="" />)}
          </div>
        ) : null}
        <small><User /> {author(selected)} · {fmt(selected.publishedAt)}</small>
      </article>
    );
  }

  if (loading) return <p className="empty">Cargando comunicados…</p>;

  if (!items.length) {
    return (
      <section className="standby radio-idle">
        <span><Megaphone /></span>
        <h2>No hay comunicados vigentes</h2>
        <p>El tablón se actualiza cuando el comando publica un aviso oficial o un evento.</p>
      </section>
    );
  }

  return (
    <section className="announce-list">
      <header className="announce-head">
        <Megaphone />
        <div>
          <b>Comunicados</b>
          <small>{items.length} vigente{items.length === 1 ? '' : 's'}</small>
        </div>
      </header>
      {items.map((item) => (
        <button key={item.id} type="button" className="announce-card" onClick={() => setSelected(item)}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" />
          ) : (
            <i>{item.type === 'EVENT' ? <Calendar /> : item.type === 'OFFICIAL' ? <Megaphone /> : <Bell />}</i>
          )}
          <span>
            <em className={item.priority === 'URGENT' ? 'hot' : ''}>{PRIORITY_LABELS[item.priority]} · {TYPE_LABELS[item.type]}</em>
            <b>{item.title}</b>
            <small>{item.content}</small>
          </span>
        </button>
      ))}
    </section>
  );
}
