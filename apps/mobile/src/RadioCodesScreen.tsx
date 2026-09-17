import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Radio, Search, X } from 'lucide-react';

/**
 * Claves radiales del Cuerpo de Bomberos de Parral (nomenclatura de Comandancia).
 * Solo lo que un bombero necesita saber al escuchar la VHF: qué significa cada clave.
 * No es un listado exhaustivo del documento; se dejaron fuera las claves de uso
 * exclusivo de Central de Comunicaciones (11-X) y las personales por compañía.
 */

type CodeRow = { code: string; label: string };
type CodeSection = {
  id: string;
  title: string;
  intro: string;
  rows: CodeRow[];
};

const SECTIONS: CodeSection[] = [
  {
    id: 'clave-0',
    title: 'Clave 0 · Instrucciones e información',
    intro: 'Lo que dice la central para ordenar el tráfico y a los carros.',
    rows: [
      { code: '0-0', label: 'Silenciar transmisiones (fin: “Fin clave 0-0”).' },
      { code: '0-1', label: 'Dar o ampliar pre-informe.' },
      { code: '0-2', label: 'Se consulta y se informa / Espere un momento.' },
      { code: '0-3', label: 'Repita el cambio.' },
      { code: '0-4', label: 'Se trata de…' },
      { code: '0-5', label: 'Indique ubicación.' },
      { code: '0-6', label: 'Diríjase al lugar con sistema de audio-alarmas.' },
      { code: '0-7', label: 'Llegar al lugar sin sistema de audio-alarmas.' },
      { code: '0-8', label: 'Material mayor fuera de servicio.' },
      { code: '0-9', label: 'Material mayor en servicio.' },
      { code: '0-10', label: 'Regrese a su cuartel.' },
      { code: '0-11', label: 'Guardia en cuartel.' },
      { code: '0-12', label: 'Diríjase al lugar sin alarma.' },
      { code: '0-13', label: 'Transmita por la base del carro.' },
    ],
  },
  {
    id: 'clave-1',
    title: 'Clave 1 · Se solicita al lugar',
    intro: 'Pedidos de apoyo externo o de personal específico.',
    rows: [
      { code: '1-0', label: 'Carabineros.' },
      { code: '1-1', label: 'Apoyo aéreo.' },
      { code: '1-2', label: 'Ambulancia SAMU (privada: especificar).' },
      { code: '1-3', label: 'Oficina de Emergencia Comunal.' },
      { code: '1-4', label: 'Empresa que se indica.' },
      { code: '1-5', label: 'CONAF.' },
      { code: '1-6', label: 'Comandante de guardia.' },
      { code: '1-7', label: 'Capitán (indicar compañía).' },
      { code: '1-8', label: 'Departamento de Estudios Técnicos.' },
      { code: '1-9', label: 'Grupo de Rescate.' },
      { code: '1-10', label: 'Grupo Químico.' },
      { code: '1-11', label: 'Apoyo bomberil que se indica.' },
      { code: '1-12', label: 'Apoyo externo.' },
      { code: '1-13', label: 'Que la persona que dio la alarma se acerque al carro.' },
    ],
  },
  {
    id: 'clave-2',
    title: 'Clave 2 · Despache al lugar',
    intro: 'Tipo de material que la central pide despachar.',
    rows: [
      { code: '2-0', label: 'Carro de agua o carro bomba.' },
      { code: '2-1', label: 'Portaescalas.' },
      { code: '2-2', label: 'Unidad de rescate vehicular.' },
      { code: '2-3', label: 'Ambulancia del Cuerpo.' },
      { code: '2-4', label: 'Carro cisterna.' },
      { code: '2-5', label: 'Carro Hazmat.' },
      { code: '2-6', label: 'Carro que se indica.' },
      { code: '2-7', label: 'Escala telescópica.' },
      { code: '2-8', label: 'Carro de transporte.' },
      { code: '2-9', label: 'Brazo articulado.' },
      { code: '2-10', label: 'Carro con motobomba.' },
      { code: '2-11', label: 'Carro con grupo electrógeno.' },
      { code: '2-12', label: 'Equipo compresor de aire o cascada.' },
    ],
  },
  {
    id: 'clave-3',
    title: 'Clave 3 · Comuníquese telefónicamente a',
    intro: 'La central pide llamar por teléfono, no por radio.',
    rows: [
      { code: '3-0', label: 'Central de Alarmas.' },
      { code: '3-1', label: 'Cuartel General.' },
      { code: '3-2', label: 'Cuartel de su compañía.' },
      { code: '3-3', label: 'Domicilio particular.' },
      { code: '3-4', label: 'Oficina.' },
      { code: '3-5', label: 'Al teléfono que se indica.' },
      { code: '3-6', label: 'Desocupar teléfono de cuartel.' },
      { code: '3-7', label: 'Teléfono móvil.' },
    ],
  },
  {
    id: 'clave-5',
    title: 'Clave 5 · Sintonice frecuencia',
    intro: 'Cambios de frecuencia en la radio VHF.',
    rows: [
      { code: '5-0', label: 'Frecuencia nacional de bomberos.' },
      { code: '5-1', label: 'Frecuencia 1: principal y despachos.' },
      { code: '5-2', label: 'Frecuencia 2: secundaria, trabajo en incendios y evaluación primaria.' },
      { code: '5-3', label: 'Frecuencia 3: comandancia.' },
      { code: '5-4', label: 'Frecuencia 4: interna de comandantes, uso privado.' },
      { code: '5-5', label: 'Pase a frecuencia repetidora.' },
      { code: '5-7', label: 'Frecuencia interna de compañías.' },
      { code: '5-8', label: 'Escucha únicamente con receptor.' },
    ],
  },
  {
    id: 'clave-6',
    title: 'Clave 6 · Procedimientos',
    intro: 'Estado del servicio: lo que más se habla en un despacho.',
    rows: [
      { code: '6-0', label: 'Dar conforme, persona a cargo y N° de voluntarios.' },
      { code: '6-1', label: 'Material mayor sin personal.' },
      { code: '6-2', label: 'Dirección exacta.' },
      { code: '6-3', label: 'Material mayor en el lugar de la alarma.' },
      { code: '6-4', label: 'Solicita instrucciones.' },
      { code: '6-5', label: 'Indique ubicación de grifos.' },
      { code: '6-6', label: 'Solicita más personal al lugar.' },
      { code: '6-7', label: 'Situación controlada.' },
      { code: '6-8', label: 'Material mayor disponible.' },
      { code: '6-9', label: 'Material mayor se retira.' },
      { code: '6-10', label: 'Material mayor en su cuartel.' },
      { code: '6-11', label: 'Material mayor en panne.' },
      { code: '6-12', label: 'Material mayor sufrió colisión.' },
      { code: '6-13', label: 'Material mayor se dirige a: eléctrico / mecánico / trámites de compañía.' },
      { code: '6-14', label: 'Material mayor se dirige a servicentro.' },
      { code: '6-15', label: 'Material mayor se dirige a centro asistencial que se indica.' },
      { code: '6-16', label: 'Falsa alarma.' },
      { code: '6-17', label: 'Material mayor en jurisdicción del Cuerpo.' },
      { code: '6-18', label: 'Alarma de vecindario.' },
      { code: '6-19', label: 'Retire personal de los cuarteles.' },
    ],
  },
  {
    id: 'clave-7',
    title: 'Clave 7 · Táctica en el lugar',
    intro: 'Lo que informa el oficial a cargo desde la emergencia.',
    rows: [
      { code: '7-0', label: 'Se establece puesto de mando e indica oficial a cargo.' },
      { code: '7-1', label: 'Indica hora del llamado, material concurrente y disponible.' },
      { code: '7-2', label: 'Indica ubicación, labor que realiza y oficial a cargo.' },
      { code: '7-3', label: 'Cadáver en el lugar.' },
      { code: '7-4', label: 'Artefacto explosivo o incendiario.' },
      { code: '7-5', label: 'Se sufre agresión.' },
      { code: '7-6', label: 'Solicita apoyo logístico.' },
      { code: '7-7', label: 'Informar a la prensa.' },
      { code: '7-8', label: 'Detenga el trabajo y proceda a evacuar inmediatamente.' },
      { code: '7-9', label: 'Evacuar moradores del inmueble.' },
      { code: '7-10', label: 'No se permite el trabajo de Bomberos e indica quién no lo permite.' },
    ],
  },
  {
    id: 'clave-8',
    title: 'Clave 8 · Uso exclusivo de comandantes',
    intro: 'Lo hablan los comandantes; el bombero solo escucha.',
    rows: [
      { code: '8-0', label: 'Comandante disponible.' },
      { code: '8-1', label: 'Comandante no disponible.' },
      { code: '8-2', label: 'Envíe K a cuartel.' },
      { code: '8-3', label: 'Envíe K a domicilio.' },
      { code: '8-4', label: 'Envíe K a oficina.' },
      { code: '8-5', label: 'Envíe K a…' },
      { code: '8-6', label: 'Me dirijo al lugar en…' },
      { code: '8-7', label: 'Concurrir todos los comandantes.' },
    ],
  },
  {
    id: 'clave-9',
    title: 'Clave 9-0 · Acuartelamiento general',
    intro: 'Grado del acuartelamiento cuando se declara.',
    rows: [
      { code: '9-0 Grado 1', label: 'Preventivo por compañías.' },
      { code: '9-0 Grado 2', label: 'Nocturno desde la hora indicada.' },
      { code: '9-0 Grado 3', label: 'General inmediato.' },
    ],
  },
  {
    id: 'clave-10',
    title: 'Clave 10 · Clasificación de emergencias',
    intro: 'Las mismas 10-X que usa la botonera y la alarma del teléfono.',
    rows: [
      { code: '10-0', label: 'Llamado estructural (casa, edificio, fábrica, población, depósito Hazmat / explosión).' },
      { code: '10-1', label: 'Fuego en vehículo.' },
      { code: '10-2', label: 'Pastizales o forestal.' },
      { code: '10-3', label: 'Salvamento de personas (básico, reforzado, aguas, altura, pozo, derrumbe, suicidio).' },
      { code: '10-4', label: 'Rescate vehicular (básico, transporte público, Hazmat, pesado).' },
      { code: '10-5', label: 'Incidente Hazmat.' },
      { code: '10-6', label: 'Emanación de gases.' },
      { code: '10-7', label: 'Llamado eléctrico.' },
      { code: '10-8', label: 'Llamado no clasificado.' },
      { code: '10-9', label: 'Llamado a otros servicios (no emergencia).' },
      { code: '10-10', label: 'Llamado a remoción de escombros o rebrote.' },
      { code: '10-11', label: 'Llamado a servicio aéreo.' },
      { code: '10-12', label: 'Llamado a apoyar a otros Cuerpos de Bomberos.' },
      { code: '10-13', label: 'Atentado terrorista.' },
      { code: '10-14', label: 'Avión que cayó o impactó estructura.' },
      { code: '10-15', label: 'Simulacro.' },
      { code: '10-16', label: 'Rescate acuático.' },
    ],
  },
  {
    id: 'clave-12',
    title: 'Clave 12 · Órdenes generales',
    intro: 'Instrucciones operativas fuera de la clasificación 10-X.',
    rows: [
      { code: '12-0', label: 'Diríjase al lugar sin alarma.' },
      { code: '12-1', label: 'Asigna cuarteles de reemplazo.' },
      { code: '12-2', label: 'Retira cuarteles de reemplazo.' },
      { code: '12-3', label: 'Diríjase con máxima precaución.' },
      { code: '12-4', label: 'Toque sirena de cuartel.' },
      { code: '12-5', label: 'Active inversor de voz.' },
      { code: '12-6', label: 'Material mayor y personal suficiente en el lugar.' },
      { code: '12-7', label: 'No armar.' },
      { code: '12-8', label: 'Capitán asume mando del Cuerpo.' },
      { code: '12-9', label: 'Citación a compañía.' },
      { code: '12-10', label: 'Solicita conductor para…' },
      { code: '12-11', label: 'Inicie procedimiento de evacuación en cuarteles.' },
      { code: '12-12', label: 'Indique situación jurisdiccional y capacidad operativa del Cuerpo.' },
    ],
  },
  {
    id: 'material',
    title: 'Material mayor · Letras',
    intro: 'Cómo se nombra el carro por radio (letra + N° de compañía).',
    rows: [
      { code: 'B', label: 'Carro bomba / carro de agua.' },
      { code: 'BX', label: 'Carro bomba de apoyo.' },
      { code: 'BT', label: 'Carro bomba tanque.' },
      { code: 'Q', label: 'Carro portaescalas y salvamento.' },
      { code: 'M', label: 'Escala telescópica.' },
      { code: 'MX', label: 'Brazo articulado.' },
      { code: 'R', label: 'Carro de rescate vehicular.' },
      { code: 'RX', label: 'Carro de rescate vehicular pesado.' },
      { code: 'RB', label: 'Carro de rescate vehicular con apoyo de agua.' },
      { code: 'RH', label: 'Carro de rescate urbano.' },
      { code: 'H', label: 'Carro Hazmat.' },
      { code: 'X', label: 'Puesto de mando y comunicaciones.' },
      { code: 'LT', label: 'Carro laboratorio técnico.' },
      { code: 'S', label: 'Ambulancia del Cuerpo.' },
      { code: 'K', label: 'Camioneta de comandancia.' },
      { code: 'KR', label: 'Camioneta de rescate.' },
      { code: 'Z', label: 'Carro cisterna.' },
      { code: 'UT', label: 'Unidad técnica de apoyo.' },
      { code: 'H-1', label: 'Unidad de recarga de tubos de aire comprimido.' },
      { code: 'J', label: 'Carro de transporte.' },
    ],
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function RadioCodesScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SECTIONS;
    return SECTIONS
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) => normalize(row.code).includes(q) || normalize(row.label).includes(q),
        ),
      }))
      .filter((section) => section.rows.length > 0);
  }, [query]);

  return (
    <article className="radio-codes-screen">
      <button type="button" className="announce-back" onClick={onBack}>
        <ChevronLeft /> Volver
      </button>

      <header className="help-hero">
        <Radio />
        <div>
          <small>Referencia</small>
          <b>Códigos radiales</b>
          <em>Nomenclatura del Cuerpo · lectura rápida</em>
        </div>
      </header>

      <div className="radio-codes-search">
        <Search />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar (ej. 6-7, apoyo, cisterna)"
          inputMode="search"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpiar">
            <X />
          </button>
        )}
      </div>

      <p className="radio-codes-hint">
        Basado en la nomenclatura de la Comandancia. Sirve para saber qué significa cada clave
        cuando la escuchas por radio; no reemplaza al oficial a cargo.
      </p>

      {filtered.length === 0 ? (
        <p className="radio-codes-empty">Nada coincide con “{query}”. Probá con el número (6-7) o una palabra (apoyo, cisterna).</p>
      ) : (
        filtered.map((section) => (
          <section key={section.id} className="radio-codes-card">
            <header>
              <h2>{section.title}</h2>
              <p>{section.intro}</p>
            </header>
            <ul>
              {section.rows.map((row) => (
                <li key={`${section.id}-${row.code}`}>
                  <span className="radio-codes-code">{row.code}</span>
                  <span className="radio-codes-label">{row.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </article>
  );
}

export function RadioCodesMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="help-menu" onClick={onOpen}>
      <span className="help-menu-icon"><Radio /></span>
      <span>
        <b>Códigos radiales</b>
        <small>Qué significa cada clave que escuchás por radio.</small>
      </span>
      <ChevronRight />
    </button>
  );
}
