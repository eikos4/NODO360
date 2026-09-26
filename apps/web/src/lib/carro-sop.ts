import { vehicleTypeAbbrev } from './vehicle-types';

/** SOP corto por material mayor — cabina NodoTrack */
export function carroSopForType(type?: string): { title: string; steps: string[] } {
  const code = vehicleTypeAbbrev(type);
  if (code === 'BF' || code === 'F') {
    return {
      title: 'Forestal / pastizal (BF·F)',
      steps: [
        'Confirmar viento y accesos antes de atacar.',
        'Establecer línea de agua y zona segura de personal.',
        'Vigilancia de rebrotes al controlado / regreso.',
      ],
    };
  }
  if (code === 'Q') {
    return {
      title: 'Escala / altura (Q)',
      steps: [
        'Estabilizar el carro en terreno firme.',
        'Coordinar rescate / ventilación con mando.',
        'No operar brazo cerca de tendido eléctrico.',
      ],
    };
  }
  if (code === 'R' || code === 'RX') {
    return {
      title: 'Rescate (R)',
      steps: [
        'Asegurar escena y tráfico con Carabineros si hace falta.',
        'Estabilizar vehículo siniestrado antes de cortar.',
        'Priorizar vía aérea / extricación con SAMU.',
      ],
    };
  }
  if (code === 'S') {
    return {
      title: 'Ambulancia / salud (S)',
      steps: [
        'Ubicar cerca del paciente sin bloquear acceso.',
        'Coordinar con SAMU / hospital receptor.',
        'Registrar traslado en bitácora al salir.',
      ],
    };
  }
  if (code === 'Z') {
    return {
      title: 'Aljibe / agua (Z)',
      steps: [
        'Confirmar punto de carga (hidrante / noria).',
        'Mantener presión y comunicación con ataque.',
        'Avisar nivel bajo de estanque a mando.',
      ],
    };
  }
  if (code === 'H') {
    return {
      title: 'HazMat (H)',
      steps: [
        'Aproximación viento a favor / zona caliente.',
        'Identificar sustancia antes de intervenir.',
        'Pedir apoyo especializado si no está identificado.',
      ],
    };
  }
  if (code === 'K' || code === 'J') {
    return {
      title: 'Apoyo / comando (K·J)',
      steps: [
        'Estacionar como puesto de mando visible.',
        'Canalizar radio y bitácora del incidente.',
        'Coordinar apoyos (SAMU, Carabineros, 2ª).',
      ],
    };
  }
  return {
    title: 'Bomba / estructural (B)',
    steps: [
      'Ubicar hidrante o abastecimiento al llegar.',
      'Ataque con reconocimiento y seguridad de dotación.',
      'Marcar En el lugar / Controlado / Regreso en NodoTrack.',
    ],
  };
}
