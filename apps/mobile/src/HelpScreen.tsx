import {
  BellRing, Building2, ChevronLeft, ChevronRight, ExternalLink, Flame, HelpCircle, Radio, Siren, Truck,
} from 'lucide-react';

const KODESK_WEB = 'https://www.kodesk.cl';
const KODESK_MAIL = 'mailto:nodo360@kodesk.cl';

export function HelpMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="help-menu" onClick={onOpen}>
      <span className="help-menu-icon"><HelpCircle /></span>
      <span>
        <b>Ayuda · Cómo funciona Nodo360</b>
        <small>Bomberos, emergencias y crédito de Kodesk</small>
      </span>
      <ChevronRight />
    </button>
  );
}

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <article className="help-screen">
      <button type="button" className="announce-back" onClick={onBack}>
        <ChevronLeft /> Volver
      </button>

      <header className="help-hero">
        <HelpCircle />
        <div>
          <small>Ayuda</small>
          <b>Cómo funciona Nodo360</b>
          <em>Bomberos · Emergencias · Esta app</em>
        </div>
      </header>

      <section className="help-card">
        <h2><Building2 /> En el cuartel</h2>
        <p>
          Nodo360 es la plataforma operativa del Cuerpo: personal, disponibilidad, flota y comunicados en un solo lugar.
        </p>
        <ul>
          <li>Marcas disponibilidad en sala de máquinas con tu N° operativo.</li>
          <li>La compañía ve quién está en el cuartel, maquinistas y material mayor.</li>
          <li>Los comunicados oficiales llegan al tablón de la app.</li>
        </ul>
      </section>

      <section className="help-card">
        <h2><Siren /> En emergencia</h2>
        <p>
          Cuando Central despacha, el teléfono avisa con tono y voz. Tú solo confirmas tu respuesta.
        </p>
        <ol>
          <li>
            <Flame />
            <span>Entra la alarma 10-X (incendio, TC, rescate u otra clave).</span>
          </li>
          <li>
            <BellRing />
            <span>El celular suena y anuncia el tipo de emergencia.</span>
          </li>
          <li>
            <Truck />
            <span>Confirmas: En camino, En el lugar, No asisto o No disponible.</span>
          </li>
          <li>
            <Radio />
            <span>Usas Radio para coordinar con la compañía mientras vas o estás en el lugar.</span>
          </li>
        </ol>
      </section>

      <section className="help-card">
        <h2><HelpCircle /> Esta aplicación</h2>
        <ul>
          <li><b>Alarmas:</b> emergencias activas y tu respuesta.</li>
          <li><b>Radio:</b> canal de la compañía durante el servicio.</li>
          <li><b>Historial:</b> despachos recientes.</li>
          <li><b>Perfil:</b> tu ficha y alertas del teléfono.</li>
          <li><b>Ayuda:</b> esta guía de Nodo360 y Kodesk.</li>
        </ul>
        <p className="help-note">
          En Configuraciones revisa notificaciones, No molestar y batería para que la alarma suene aunque el celular esté bloqueado.
        </p>
      </section>

      <section className="help-kodesk">
        <small>Plataforma creada por</small>
        <b>Kodesk</b>
        <p>
          Nodo360 es un desarrollo de <a href={KODESK_WEB} target="_blank" rel="noopener noreferrer">www.kodesk.cl</a>.
          Tecnología para Cuerpos de Bomberos de Chile.
        </p>
        <div className="help-kodesk-links">
          <a href={KODESK_WEB} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> www.kodesk.cl
          </a>
          <a href={KODESK_MAIL}>nodo360@kodesk.cl</a>
        </div>
      </section>
    </article>
  );
}
