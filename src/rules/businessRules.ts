import type {
  Agendamento,
  Atendimento,
  PerfilUsuario,
  Pet,
  Servico,
  Tutor,
  Usuario,
} from '../types';

export interface AuthUsuario extends Usuario {
  senha: string;
}

export function formatPerfilLabel(perfil: PerfilUsuario): string {
  return perfil === 'gerente' ? 'Gerente' : 'Funcionário';
}

export function generateClientId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCPF(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskPhone(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCurrencyBR(value: number): string {
  const fixed = value.toFixed(2).replace('.', ',');
  const [intPart, decPart] = fixed.split(',');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withThousands},${decPart}`;
}

export function parseCurrencyBR(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;
  // If user typed comma as decimal separator
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function formatCurrencyInputMask(raw: string): string {
  const digits = onlyDigits(raw);
  if (!digits) return 'R$ 0,00';
  const cents = parseInt(digits, 10);
  return formatCurrencyBR(cents / 100);
}

export function toLocalDateKey(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateInput(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

export function getTomorrowDateInput(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return toLocalDateKey(d);
}

export function formatDateBR(dateOrIso: Date | string): string {
  if (typeof dateOrIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso)) {
    const [y, m, d] = dateOrIso.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTimeBR(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTimeBR(dateOrIso: Date | string): string {
  return `${formatDateBR(dateOrIso)}, ${formatTimeBR(dateOrIso)}`;
}

const WEEKDAYS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function formatLongDateBR(date: Date = new Date()): string {
  const weekday = WEEKDAYS_PT[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_PT[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} de ${month} de ${year}`;
}

export function calculateAgeYears(birthDateStr: string, now: Date = new Date()): number {
  if (!birthDateStr) return 0;
  const parts = birthDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  const [year, month, day] = parts;
  let age = now.getFullYear() - year;
  const currentMonth = now.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && now.getDate() < day)) {
    age -= 1;
  }
  return Math.max(0, age);
}

// RN01: Autenticação
export function authenticateUser(
  usuarios: AuthUsuario[],
  email: string,
  senha: string,
  perfilSelecionado: PerfilUsuario
): { ok: true; user: AuthUsuario } | { ok: false; error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = usuarios.find(
    (u) => u.email.trim().toLowerCase() === normalizedEmail && u.senha === senha
  );
  if (!user) {
    return { ok: false, error: 'E-mail ou senha incorretos.' };
  }
  if (user.perfil !== perfilSelecionado) {
    return { ok: false, error: 'Este perfil não corresponde à conta.' };
  }
  return { ok: true, user };
}

// RN07: Alergias e alertas
export function hasAlergia(pet: Pet): boolean {
  return !pet.saude.nenhumaAlergia && pet.saude.alergias.trim().length > 0;
}

export function hasSafetyAlert(pet: Pet): boolean {
  return hasAlergia(pet) || pet.saude.agressivo || pet.saude.morde;
}

export function getPetAlertMessages(pet: Pet): string[] {
  const alerts: string[] = [];
  if (hasAlergia(pet)) {
    alerts.push(`Alergia a ${pet.saude.alergias.trim()}. Usar produto neutro.`);
  }
  if (pet.saude.agressivo || pet.saude.morde) {
    alerts.push('Atenção: pet agressivo ou que morde. Manusear com cuidado.');
  }
  return alerts;
}

// RN03 & RN04: Validação do Tutor
export interface TutorFormInput {
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
}

export function validateTutorForm(
  data: TutorFormInput,
  existingTutors: Tutor[],
  editingTutorId?: string | null
): { errors: Record<string, string>; duplicateCpfTutor: Tutor | null } {
  const errors: Record<string, string> = {};

  if (!data.nomeCompleto.trim()) {
    errors.tutorNomeCompleto = 'Informe o nome completo.';
  }

  const cpfDigits = onlyDigits(data.cpf);
  let duplicateCpfTutor: Tutor | null = null;
  if (cpfDigits.length !== 11) {
    errors.tutorCpf = 'Informe o CPF com 11 dígitos.';
  } else {
    const found = existingTutors.find(
      (t) => onlyDigits(t.cpf) === cpfDigits && t.id !== editingTutorId
    );
    if (found) {
      errors.tutorCpf = 'Já existe um tutor com este CPF.';
      duplicateCpfTutor = found;
    }
  }

  if (onlyDigits(data.telefone).length < 10) {
    errors.tutorTelefone = 'Informe o telefone ou WhatsApp.';
  }

  if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.tutorEmail = 'Informe um e-mail válido.';
  }

  if (!data.endereco.trim()) {
    errors.tutorEndereco = 'Informe o endereço.';
  }

  if (!data.contatoEmergenciaNome.trim()) {
    errors.tutorEmergenciaNome = 'Informe o contato de emergência.';
  }

  if (onlyDigits(data.contatoEmergenciaTelefone).length < 10) {
    errors.tutorEmergenciaTelefone = 'Informe o telefone do contato.';
  }

  return { errors, duplicateCpfTutor };
}

// RN05: Validação do Pet e Saúde
export interface PetFormInput {
  nome: string;
  especie: string;
  raca: string;
  sexo: string;
  dataNascimento: string;
  pesoKg: string;
  porte: string;
  alergias: string;
  nenhumaAlergia: boolean;
}

export function validatePetForm(data: PetFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.nome.trim()) {
    errors.petNome = 'Informe o nome do pet.';
  }
  if (!data.especie) {
    errors.petEspecie = 'Escolha a espécie.';
  }
  if (!data.raca.trim()) {
    errors.petRaca = 'Informe a raça.';
  }
  if (!data.sexo) {
    errors.petSexo = 'Informe o sexo.';
  }
  if (!data.dataNascimento) {
    errors.petDataNascimento = 'Informe a data de nascimento.';
  }
  const pesoNum = Number(String(data.pesoKg).replace(',', '.'));
  if (!data.pesoKg.trim() || !Number.isFinite(pesoNum) || pesoNum <= 0) {
    errors.petPeso = 'Informe um peso válido.';
  }
  if (!data.porte) {
    errors.petPorte = 'Escolha o porte.';
  }
  if (!data.nenhumaAlergia && !data.alergias.trim()) {
    errors.petAlergias = 'Informe as alergias ou marque "Nenhuma alergia".';
  }

  return errors;
}

// RN08, RN09, RN11: Atendimento
export function petHasActiveAtendimento(atendimentos: Atendimento[], petId: string): boolean {
  return atendimentos.some((a) => a.petId === petId && a.status === 'Em posse');
}

export function calculateServicesTotal(servicos: Servico[]): number {
  return servicos.reduce((sum, s) => sum + s.valor, 0);
}

export function validateNovoAtendimento(
  petId: string | null,
  selectedServiceIds: string[],
  atendimentos: Atendimento[]
): { ok: true } | { ok: false; error: string } {
  if (!petId) {
    return { ok: false, error: 'Escolha um pet para registrar a entrada.' };
  }
  if (petHasActiveAtendimento(atendimentos, petId)) {
    return { ok: false, error: 'Este pet já tem um atendimento em posse.' };
  }
  if (selectedServiceIds.length === 0) {
    return { ok: false, error: 'Escolha ao menos um serviço.' };
  }
  return { ok: true };
}

// RN12: Retirada
export function validateRetirada(
  selectedAutorizadoId: string | null,
  documentoConferido: boolean
): { ok: true } | { ok: false; error: string } {
  if (!selectedAutorizadoId || !documentoConferido) {
    return { ok: false, error: 'Escolha quem está retirando e confira o documento.' };
  }
  return { ok: true };
}

// RN15: Agendamento
export function getAvailableTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 8; hour <= 17; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

export function isTimeSlotOccupied(
  agendamentos: Agendamento[],
  data: string,
  hora: string
): boolean {
  return agendamentos.some(
    (a) => a.status === 'Agendado' && a.data === data && a.hora === hora
  );
}

export function validateAgendamento(
  input: {
    petNome: string;
    tutorNome: string;
    servicos: string[];
    data: string;
    hora: string;
  },
  existingAgendamentos: Agendamento[],
  todayStr: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.petNome.trim()) {
    errors.petNome = 'Informe o nome do pet.';
  }
  if (!input.tutorNome.trim()) {
    errors.tutorNome = 'Informe o nome do tutor.';
  }
  if (input.servicos.length === 0) {
    errors.servicos = 'Escolha ao menos um serviço.';
  }
  if (!input.data) {
    errors.data = 'Informe a data.';
  } else if (input.data < todayStr) {
    errors.data = 'A data não pode ser passada.';
  }
  if (!input.hora) {
    errors.hora = 'Escolha o horário.';
  } else if (input.data && isTimeSlotOccupied(existingAgendamentos, input.data, input.hora)) {
    errors.hora = 'Horário já ocupado.';
  }

  return errors;
}

// RN02: Administração
export function validateServicePrices(
  pricesById: Record<string, number>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [id, val] of Object.entries(pricesById)) {
    if (!Number.isFinite(val) || val <= 0) {
      errors[id] = 'Informe um valor maior que zero.';
    }
  }
  return errors;
}

export function validateNewFuncionario(
  input: { nome: string; email: string; senha: string },
  existingUsuarios: Usuario[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.nome.trim()) {
    errors.nome = 'Informe o nome.';
  }
  const emailTrim = input.email.trim().toLowerCase();
  if (!emailTrim) {
    errors.email = 'Informe o e-mail.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
    errors.email = 'Informe um e-mail válido.';
  } else if (existingUsuarios.some((u) => u.email.trim().toLowerCase() === emailTrim)) {
    errors.email = 'Já existe um usuário com este e-mail.';
  }
  if (!input.senha || input.senha.length < 6) {
    errors.senha = 'A senha deve ter ao menos 6 caracteres.';
  }
  return errors;
}

export function findPetForAgendamento(
  pets: Pet[],
  tutores: Tutor[],
  petNome: string,
  tutorNome: string
): Pet | null {
  const normPet = normalizeText(petNome);
  const normTutor = normalizeText(tutorNome);
  const matchingPets = pets.filter((p) => normalizeText(p.nome) === normPet);
  if (matchingPets.length === 0) return null;
  if (matchingPets.length === 1) {
    // Verify tutor matches if provided, or return the single match if tutor also matches partially
    const tutor = tutores.find((t) => t.id === matchingPets[0].tutorId);
    if (!normTutor || (tutor && normalizeText(tutor.nomeCompleto).includes(normTutor))) {
      return matchingPets[0];
    }
    return null;
  }
  // Multiple pets with same name (e.g., Thor): match by tutor name
  const withTutor = matchingPets.find((p) => {
    const t = tutores.find((tut) => tut.id === p.tutorId);
    return t && normalizeText(t.nomeCompleto).includes(normTutor);
  });
  return withTutor ?? null;
}
