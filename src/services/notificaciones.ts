// Cliente HTTP de notificaciones e intervenciones (compartido por TopBar, Dashboard y AttendanceBoard).

export type TipoNotificacion = 'Riesgo' | 'Critico' | 'RegularidadAnual';

export interface Notificacion {
  id: number;
  id_alumno: number | null;
  nombre: string | null;
  apellido: string | null;
  tipo: TipoNotificacion;
  faltas: number;
  mensaje: string;
  estado: 'nueva' | 'gestionada';
  leida: number;
  created_at: string;
  gestionada_por_nombre: string | null;
  gestionada_at: string | null;
}

export interface AvisoPayload {
  id_alumno: number;
  id_notificacion: number | null;
  motivo?: string;
}

export type ResultadoAviso =
  | { ok: true }
  | { ok: false; yaGestionada: true; gestionada_por_nombre: string | null; gestionada_at: string | null }
  | { ok: false; yaGestionada: false; message: string };

const MOTIVO_AVISO = 'Aviso a la familia por riesgo de asistencias';

function headers(json = false): HeadersInit {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const res = await fetch('/api/notificaciones', { headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al listar notificaciones`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as Notificacion[]) : [];
}

export async function marcarLeida(id: number): Promise<void> {
  const res = await fetch(`/api/notificaciones/${id}/leida`, { method: 'PATCH', headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al marcar la notificación`);
}

export async function marcarTodasLeidas(): Promise<void> {
  const res = await fetch('/api/notificaciones/leidas', { method: 'PATCH', headers: headers() });
  if (!res.ok) throw new Error(`Error ${res.status} al marcar las notificaciones`);
}

export async function enviarAviso(p: AvisoPayload): Promise<ResultadoAviso> {
  try {
    const res = await fetch('/api/intervenciones', {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ motivo: MOTIVO_AVISO, ...p }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return {
        ok: false,
        yaGestionada: true,
        gestionada_por_nombre: body.gestionada_por_nombre ?? null,
        gestionada_at: body.gestionada_at ?? null,
      };
    }
    return { ok: false, yaGestionada: false, message: body.message ?? 'No se pudo registrar el aviso.' };
  } catch (e) {
    console.error('Error enviando aviso:', e);
    return { ok: false, yaGestionada: false, message: 'Error de conexión al registrar el aviso.' };
  }
}

/** "Gestionada por Juan Pérez · 14/10, 16:40" (omite lo que no se conozca). */
export function textoGestion(n: { gestionada_por_nombre: string | null; gestionada_at: string | null }): string {
  const partes = [n.gestionada_por_nombre ? `Gestionada por ${n.gestionada_por_nombre}` : 'Gestionada'];
  if (n.gestionada_at) {
    const fecha = new Date(n.gestionada_at);
    if (!Number.isNaN(fecha.getTime())) {
      partes.push(fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    }
  }
  return partes.join(' · ');
}
