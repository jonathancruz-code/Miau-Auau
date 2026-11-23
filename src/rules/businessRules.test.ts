import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateUser,
  calculateAgeYears,
  calculateServicesTotal,
  findPetForAgendamento,
  formatCurrencyBR,
  formatDateBR,
  formatLongDateBR,
  getAvailableTimeSlots,
  getPetAlertMessages,
  isTimeSlotOccupied,
  maskCPF,
  maskPhone,
  normalizeText,
  parseCurrencyBR,
  validateAgendamento,
  validateNewFuncionario,
  validateNovoAtendimento,
  validatePetForm,
  validateRetirada,
  validateServicePrices,
  validateTutorForm,
} from './businessRules';
import type { Agendamento, Atendimento, Pet, Tutor } from '../types';
import type { AuthUsuario } from './businessRules';

const sampleUsers: AuthUsuario[] = [
  { id: 'u1', nome: 'Carla Mendes', email: 'carla@petshop.com', senha: 'gerente123', perfil: 'gerente' },
  { id: 'u2', nome: 'Pedro Alves', email: 'pedro@petshop.com', senha: 'func123', perfil: 'funcionario' },
];

test('RN01: autenticação valida credenciais e perfil', () => {
  const ok = authenticateUser(sampleUsers, 'carla@petshop.com', 'gerente123', 'gerente');
  assert.equal(ok.ok, true);

  const wrongRole = authenticateUser(sampleUsers, 'carla@petshop.com', 'gerente123', 'funcionario');
  assert.deepEqual(wrongRole, { ok: false, error: 'Este perfil não corresponde à conta.' });

  const wrongPass = authenticateUser(sampleUsers, 'carla@petshop.com', 'errada', 'gerente');
  assert.deepEqual(wrongPass, { ok: false, error: 'E-mail ou senha incorretos.' });
});

test('RN03 e RN04: validação de tutor exige obrigatórios e CPF único', () => {
  const existing: Tutor[] = [
    {
      id: 't1',
      nomeCompleto: 'Ricardo Santos',
      cpf: '111.111.111-11',
      telefone: '(71) 98888-1234',
      email: '',
      endereco: 'Rua A, 1',
      contatoEmergenciaNome: 'Júlia',
      contatoEmergenciaTelefone: '(71) 98888-5678',
    },
  ];

  const dup = validateTutorForm(
    {
      nomeCompleto: 'Outro Tutor',
      cpf: '111.111.111-11',
      telefone: '(71) 99999-0000',
      email: '',
      endereco: 'Rua B, 2',
      contatoEmergenciaNome: 'Ana',
      contatoEmergenciaTelefone: '(71) 98888-0000',
    },
    existing
  );
  assert.equal(dup.errors.tutorCpf, 'Já existe um tutor com este CPF.');
  assert.equal(dup.duplicateCpfTutor?.id, 't1');

  const validNoEmail = validateTutorForm(
    {
      nomeCompleto: 'Maria Silva',
      cpf: '999.888.777-66',
      telefone: '(71) 99999-0000',
      email: '',
      endereco: 'Rua B, 2',
      contatoEmergenciaNome: 'João',
      contatoEmergenciaTelefone: '(71) 98888-0000',
    },
    existing
  );
  assert.deepEqual(validNoEmail.errors, {});
});

test('RN05: validação de pet e alergia obrigatória ou nenhumaAlergia', () => {
  const missingAllergy = validatePetForm({
    nome: 'Mel',
    especie: 'Cão',
    raca: 'Shih Tzu',
    sexo: 'Fêmea',
    dataNascimento: '2020-05-10',
    pesoKg: '7',
    porte: 'Pequeno',
    alergias: '',
    nenhumaAlergia: false,
  });
  assert.ok(missingAllergy.petAlergias);

  const ok = validatePetForm({
    nome: 'Mel',
    especie: 'Cão',
    raca: 'Shih Tzu',
    sexo: 'Fêmea',
    dataNascimento: '2020-05-10',
    pesoKg: '7',
    porte: 'Pequeno',
    alergias: '',
    nenhumaAlergia: true,
  });
  assert.deepEqual(ok, {});
});

test('RN07: mensagens de alerta para alergia e agressividade/morde', () => {
  const pet: Pet = {
    id: 'p1',
    tutorId: 't1',
    nome: 'Mel',
    especie: 'Cão',
    raca: 'Shih Tzu',
    sexo: 'Fêmea',
    dataNascimento: '2020-01-01',
    pesoKg: 7,
    porte: 'Pequeno',
    pelagem: 'Branca',
    castrado: true,
    vacinasEmDia: true,
    antipulgas: true,
    saude: {
      alergias: 'shampoo com aveia',
      nenhumaAlergia: false,
      doencas: '',
      medicamentos: '',
      problemasPele: '',
      mobilidadeReduzida: false,
      agressivo: true,
      morde: false,
      aceitaSecador: true,
      aceitaMaquina: true,
      restricoes: '',
    },
    pessoasAutorizadas: [],
  };

  assert.deepEqual(getPetAlertMessages(pet), [
    'Alergia a shampoo com aveia. Usar produto neutro.',
    'Atenção: pet agressivo ou que morde. Manusear com cuidado.',
  ]);
});

test('RN08, RN09 e RN11: novo atendimento bloqueia duplicidade Em posse, exige serviço e soma total', () => {
  const atendimentos: Atendimento[] = [
    {
      id: 'a1',
      petId: 'p1',
      tutorId: 't1',
      itens: [{ servicoId: 's1', nome: 'Banho', valor: 50 }],
      valorTotal: 50,
      entradaEm: '2026-11-19T08:40:00.000Z',
      saidaEm: null,
      status: 'Em posse',
      observacoesTutor: '',
      pulgas: false,
      embaracados: false,
      machucados: false,
      autorizaPerfumeLaco: false,
      funcionarioResponsavel: 'Carla Mendes',
      retiradoPor: null,
    },
  ];

  assert.deepEqual(validateNovoAtendimento('p1', ['s1'], atendimentos), {
    ok: false,
    error: 'Este pet já tem um atendimento em posse.',
  });
  assert.deepEqual(validateNovoAtendimento('p2', [], atendimentos), {
    ok: false,
    error: 'Escolha ao menos um serviço.',
  });
  assert.deepEqual(validateNovoAtendimento('p2', ['s1'], atendimentos), { ok: true });
  assert.equal(
    calculateServicesTotal([
      { id: 's1', nome: 'Banho', valor: 50 },
      { id: 's5', nome: 'Hidratação', valor: 40 },
    ]),
    90
  );
});

test('RN12: retirada exige autorizado e documento conferido', () => {
  assert.equal(validateRetirada(null, true).ok, false);
  assert.equal(validateRetirada('pa1', false).ok, false);
  assert.equal(validateRetirada('pa1', true).ok, true);
});

test('RN15: horários 08:00-17:30 de 30 em 30 min e bloqueio de horário ocupado', () => {
  const slots = getAvailableTimeSlots();
  assert.equal(slots[0], '08:00');
  assert.equal(slots[slots.length - 1], '17:30');
  assert.equal(slots.length, 20);

  const agendamentos: Agendamento[] = [
    {
      id: 'ag1',
      petNome: 'Pipoca',
      tutorNome: 'Fernanda Rocha',
      servicos: ['Banho'],
      data: '2026-11-20',
      hora: '14:00',
      status: 'Agendado',
    },
    {
      id: 'ag2',
      petNome: 'Luna',
      tutorNome: 'Juliana Prado',
      servicos: ['Banho'],
      data: '2026-11-20',
      hora: '15:00',
      status: 'Cancelado',
    },
  ];

  assert.equal(isTimeSlotOccupied(agendamentos, '2026-11-20', '14:00'), true);
  assert.equal(isTimeSlotOccupied(agendamentos, '2026-11-20', '15:00'), false);

  const errOccupied = validateAgendamento(
    {
      petNome: 'Bidu',
      tutorNome: 'Paulo Reis',
      servicos: ['Banho'],
      data: '2026-11-20',
      hora: '14:00',
    },
    agendamentos,
    '2026-11-19'
  );
  assert.equal(errOccupied.hora, 'Horário já ocupado.');
});

test('RN02: validação de preços e criação de funcionário', () => {
  assert.deepEqual(validateServicePrices({ s1: 50, s2: 0 }), {
    s2: 'Informe um valor maior que zero.',
  });
  const empErr = validateNewFuncionario(
    { nome: 'Novo', email: 'carla@petshop.com', senha: '123' },
    sampleUsers
  );
  assert.equal(empErr.email, 'Já existe um usuário com este e-mail.');
  assert.equal(empErr.senha, 'A senha deve ter ao menos 6 caracteres.');
});

test('Formatadores, máscaras, normalização e busca por pet+tutor', () => {
  assert.equal(normalizeText('Tosa Higiênica'), 'tosa higienica');
  assert.equal(maskCPF('11122233344'), '111.222.333-44');
  assert.equal(maskPhone('71988881234'), '(71) 98888-1234');
  assert.equal(formatCurrencyBR(85), 'R$ 85,00');
  assert.equal(parseCurrencyBR('R$ 85,50'), 85.5);
  assert.equal(formatDateBR('2026-11-19'), '19/11/2026');
  assert.equal(formatLongDateBR(new Date(2026, 10, 19)), 'Quinta-feira, 19 de novembro de 2026');
  assert.equal(calculateAgeYears('2022-05-01', new Date(2026, 10, 19)), 4);

  const tutores: Tutor[] = [
    {
      id: 't1',
      nomeCompleto: 'Ricardo Santos',
      cpf: '111.111.111-11',
      telefone: '(71) 98888-1234',
      email: '',
      endereco: 'Rua A',
      contatoEmergenciaNome: 'Júlia',
      contatoEmergenciaTelefone: '(71) 98888-5678',
    },
    {
      id: 't2',
      nomeCompleto: 'Marcos Alves',
      cpf: '222.222.222-22',
      telefone: '(71) 98111-2020',
      email: '',
      endereco: 'Rua B',
      contatoEmergenciaNome: 'Sandra',
      contatoEmergenciaTelefone: '(71) 98111-3030',
    },
  ];
  const baseSaude = {
    alergias: '',
    nenhumaAlergia: true,
    doencas: '',
    medicamentos: '',
    problemasPele: '',
    mobilidadeReduzida: false,
    agressivo: false,
    morde: false,
    aceitaSecador: true,
    aceitaMaquina: true,
    restricoes: '',
  };
  const pets: Pet[] = [
    {
      id: 'p1',
      tutorId: 't1',
      nome: 'Thor',
      especie: 'Cão',
      raca: 'Golden Retriever',
      sexo: 'Macho',
      dataNascimento: '2022-01-01',
      pesoKg: 32,
      porte: 'Grande',
      pelagem: 'Dourada',
      castrado: true,
      vacinasEmDia: true,
      antipulgas: true,
      saude: baseSaude,
      pessoasAutorizadas: [],
    },
    {
      id: 'p2',
      tutorId: 't2',
      nome: 'Thor',
      especie: 'Cão',
      raca: 'Labrador',
      sexo: 'Macho',
      dataNascimento: '2021-01-01',
      pesoKg: 30,
      porte: 'Grande',
      pelagem: 'Preta',
      castrado: true,
      vacinasEmDia: true,
      antipulgas: true,
      saude: baseSaude,
      pessoasAutorizadas: [],
    },
  ];

  assert.equal(findPetForAgendamento(pets, tutores, 'Thor', 'Marcos Alves')?.id, 'p2');
  assert.equal(findPetForAgendamento(pets, tutores, 'Thor', 'Ricardo Santos')?.id, 'p1');
  assert.equal(findPetForAgendamento(pets, tutores, 'Rex', 'Desconhecido'), null);
});
