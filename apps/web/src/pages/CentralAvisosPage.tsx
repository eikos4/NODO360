import AnnouncementsPage from './AnnouncementsPage';

/** Central usa el mismo tablón admin: avisos, fotos, comandancia, noticias y eventos. */
export default function CentralAvisosPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
      <AnnouncementsPage variant="central" />
    </div>
  );
}
