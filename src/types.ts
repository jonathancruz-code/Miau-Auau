export type PerfilUsuario = 'funcionario' | 'gerente';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export interface Tutor {
  id: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  contatoEmergenciaNome: string;
  contatoEmergenciaTelefone: string;
}

export interface SaudePet {
  alergias: string;
  nenhumaAlergia: boolean;
  doencas: string;
  medicamentos: string;
  problemasPele: string;
  mobilidadeReduzida: boolean;
  agressivo: boolean;
  morde: boolean;
  aceitaSecador: boolean;
  aceitaMaquina: boolean;
  restricoes: string;
}

export interface PessoaAutorizada {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  parentesco: string;
  ehTutor: boolean;
}

export type EspeciePet = 'Cão' | 'Gato';
export type SexoPet = 'Macho' | 'Fêmea';
export type PortePet = 'Pequeno' | 'Médio' | 'Grande';

export interface Pet {
  id: string;
  tutorId: string;
  nome: string;
  especie: EspeciePet;
  raca: string;
  sexo: SexoPet;
  dataNascimento: string; // YYYY-MM-DD
  pesoKg: number;
  porte: PortePet;
  pelagem: string;
  castrado: boolean;
  vacinasEmDia: boolean;
  antipulgas: boolean;
  saude: SaudePet;
  pessoasAutorizadas: PessoaAutorizada[];
}

export interface Servico {
  id: string;
  nome: string;
  valor: number;
}

export interface AtendimentoItem {
  servicoId: string;
  nome: string;
  valor: number;
}

export type StatusAtendimento = 'Em posse' | 'Finalizado';

export interface Atendimento {
  id: string;
  petId: string;
  tutorId: string;
  itens: AtendimentoItem[];
  valorTotal: number;
  entradaEm: string; // ISO string
  saidaEm: string | null; // ISO string or null
  status: StatusAtendimento;
  observacoesTutor: string;
  pulgas: boolean;
  embaracados: boolean;
  machucados: boolean;
  autorizaPerfumeLaco: boolean;
  funcionarioResponsavel: string;
  retiradoPor: string | null;
}

export type StatusAgendamento = 'Agendado' | 'Recebido' | 'Cancelado';

export interface Agendamento {
  id: string;
  petNome: string;
  tutorNome: string;
  servicos: string[];
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  status: StatusAgendamento;
}

export interface AppDatabase {
  usuarios: Usuario[];
  tutores: Tutor[];
  pets: Pet[];
  servicos: Servico[];
  atendimentos: Atendimento[];
  agendamentos: Agendamento[];
}

export type TelaAtiva =
  | 'login'
  | 'inicio'
  | 'pets'
  | 'cadastro'
  | 'novo-atendimento'
  | 'retirada'
  | 'agenda'
  | 'administracao';
