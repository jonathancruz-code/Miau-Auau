import type { AppDatabase, PerfilUsuario, Tutor, Usuario } from '../types';

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Erro ao comunicar com o servidor.';
    throw new Error(message);
  }
  return payload as T;
}

export async function apiLogin(
  email: string,
  senha: string,
  perfil: PerfilUsuario
): Promise<Usuario> {
  const res = await requestJson<{ user: Usuario }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha, perfil }),
  });
  return res.user;
}

export async function apiGetCurrentUser(): Promise<Usuario | null> {
  const res = await requestJson<{ user: Usuario | null }>('/api/auth/me');
  return res.user;
}

export async function apiLogout(): Promise<void> {
  await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function apiGetBootstrap(): Promise<AppDatabase> {
  return requestJson<AppDatabase>('/api/dados');
}

export async function apiCreateTutorPet(payload: {
  tutor?: Omit<Tutor, 'id'>;
  reusedTutorId?: string | null;
  pet: Record<string, unknown>;
}): Promise<{ pet: AppDatabase['pets'][number]; data: AppDatabase }> {
  return requestJson('/api/tutores-pets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateTutorPet(
  petId: string,
  payload: { tutor: Omit<Tutor, 'id'>; pet: Record<string, unknown> }
): Promise<{ pet: AppDatabase['pets'][number]; data: AppDatabase }> {
  return requestJson(`/api/tutores-pets/${encodeURIComponent(petId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function apiCreateAtendimento(payload: {
  petId: string;
  servicoIds: string[];
  observacoesTutor: string;
  pulgas: boolean;
  embaracados: boolean;
  machucados: boolean;
  autorizaPerfumeLaco: boolean;
  funcionarioResponsavel: string;
  agendamentoId?: string | null;
}): Promise<{ data: AppDatabase }> {
  return requestJson('/api/atendimentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiFinalizarRetirada(
  atendimentoId: string,
  autorizadoId: string,
  documentoConferido: boolean
): Promise<{ atendimento: AppDatabase['atendimentos'][number]; data: AppDatabase }> {
  return requestJson(`/api/atendimentos/${encodeURIComponent(atendimentoId)}/retirada`, {
    method: 'POST',
    body: JSON.stringify({ autorizadoId, documentoConferido }),
  });
}

export async function apiCreateAgendamento(payload: {
  petNome: string;
  tutorNome: string;
  servicos: string[];
  data: string;
  hora: string;
}): Promise<{ data: AppDatabase }> {
  return requestJson('/api/agendamentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiCancelAgendamento(id: string): Promise<{ data: AppDatabase }> {
  return requestJson(`/api/agendamentos/${encodeURIComponent(id)}/cancelar`, {
    method: 'POST',
  });
}

export async function apiSaveServicePrices(
  valores: Record<string, number>
): Promise<{ data: AppDatabase }> {
  return requestJson('/api/servicos/valores', {
    method: 'PUT',
    body: JSON.stringify({ valores }),
  });
}

export async function apiCreateFuncionario(payload: {
  nome: string;
  email: string;
  senha: string;
}): Promise<{ data: AppDatabase }> {
  return requestJson('/api/funcionarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiRemoveFuncionario(id: string): Promise<{ data: AppDatabase }> {
  return requestJson(`/api/funcionarios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
