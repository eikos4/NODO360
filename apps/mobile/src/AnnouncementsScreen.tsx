import { useEffect, useState } from 'react';
import { Calendar, Check, ChevronLeft, MapPin, Megaphone, User } from 'lucide-react';
import { announcementKind, announcementPriorityLabel } from '@nodo360/shared';
import { api, errorMessage } from './lib/api';

export type MobileAnnouncement = {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  requireAck?: boolean;
  imageUrl?: string | null;
  attachments?: string[];
  publishedAt: string;
  publisher?: { firstName: string; lastName: string };
  mine?: { read: boolean; acked: boolean; voteIndex: number | null };
  poll?: {
    question: string;
    options: string[];
    closed?: boolean;
    results: number[];
    totalVotes: number;
  } | null;
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const { data } = await api.get<MobileAnnouncement[]>('/announcements');
    setItems(data);
    onCount?.(data.length);
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    void load()
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [onCount]);

  const open = async (item: MobileAnnouncement) => {
    setSelected(item);
    try {
      await api.post(`/announcements/${item.id}/read`);
      const { data } = await api.get<MobileAnnouncement>(`/announcements/${item.id}`);
      setSelected(data);
      setItems((list) => list.map((row) => (row.id === data.id ? data : row)));
    } catch {
      /* still show the card */
    }
  };

  const ack = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/announcements/${selected.id}/ack`);
      const { data } = await api.get<MobileAnnouncement>(`/announcements/${selected.id}`);
      setSelected(data);
      setItems((list) => list.map((row) => (row.id === data.id ? data : row)));
      setNotice('Confirmado');
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
      window.setTimeout(() => setNotice(''), 2500);
    }
  };

  const vote = async (optionIndex: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.post<MobileAnnouncement>(`/announcements/${selected.id}/vote`, { optionIndex });
      setSelected(data);
      setItems((list) => list.map((row) => (row.id === data.id ? data : row)));
    } catch (error) {
      setNotice(errorMessage(error));
      window.setTimeout(() => setNotice(''), 2500);
    } finally {
      setBusy(false);
    }
  };

  if (selected) {
    const kind = announcementKind(selected.type);
    return (
      <article className="announce-detail">
        <button type="button" className="announce-back" onClick={() => setSelected(null)}>
          <ChevronLeft /> Volver al tablón
        </button>
        {selected.imageUrl && <img src={selected.imageUrl} alt="" className="announce-hero" />}
        <div className="announce-meta">
          <b className={selected.priority === 'URGENT' ? 'hot' : ''}>{announcementPriorityLabel(selected.priority)}</b>
          <span>{kind.icon} {kind.label}</span>
        </div>
        <h2>{selected.title}</h2>
        <p className="announce-body">{selected.content}</p>
        {(selected.eventDate || selected.eventLocation) && (
          <div className="announce-event">
            {selected.eventDate && <span><Calendar /> {fmt(selected.eventDate)}</span>}
            {selected.eventLocation && <span><MapPin /> {selected.eventLocation}</span>}
          </div>
        )}
        {selected.poll && (
          <div className="announce-event" style={{ display: 'block' }}>
            <b>{selected.poll.question}</b>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {selected.poll.options.map((option, index) => {
                const mine = selected.mine?.voteIndex === index;
                const total = selected.poll?.totalVotes || 0;
                const count = selected.poll?.results[index] ?? 0;
                const show = selected.mine?.voteIndex != null || selected.poll?.closed;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={busy || selected.poll?.closed}
                    onClick={() => void vote(index)}
                    className="announce-poll-opt"
                  >
                    <span>{mine ? <Check /> : null} {option}</span>
                    {show ? <small>{count}{total ? ` / ${total}` : ''}</small> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {selected.requireAck && (
          <button type="button" className="primary" disabled={busy || selected.mine?.acked} onClick={() => void ack()}>
            <Check /> {selected.mine?.acked ? 'Confirmado' : 'Confirmar lectura'}
          </button>
        )}
        {selected.attachments?.length ? (
          <div className="announce-gallery">
            {selected.attachments.map((url) => <img key={url} src={url} alt="" />)}
          </div>
        ) : null}
        {notice ? <p className="empty">{notice}</p> : null}
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
        <p>El tablón se actualiza cuando Central o el comando publica un aviso.</p>
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
      {items.map((item) => {
        const kind = announcementKind(item.type);
        return (
          <button key={item.id} type="button" className="announce-card" onClick={() => void open(item)}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <i>{kind.icon}</i>
            )}
            <span>
              <em className={item.priority === 'URGENT' ? 'hot' : ''}>{announcementPriorityLabel(item.priority)} · {kind.icon} {kind.label}</em>
              <b>{item.title}</b>
              <small>{item.content}</small>
            </span>
          </button>
        );
      })}
    </section>
  );
}
