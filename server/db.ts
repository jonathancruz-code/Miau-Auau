import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  Agendamento,
  AppDatabase,
  Atendimento,
  AtendimentoItem,
  PerfilUsuario,
  PessoaAutorizada,
  Pet,
  Servico,
  Tutor,
  Usuario,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'miau-auau.db');

let dbInstance: DatabaseSync | null = null;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hexHash] = parts;
  const expectedBuf = Buffer.from(hexHash, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, derivedBuf);
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function makeRelativeIso(now: Date, daysOffset: number, hours: number, minutes: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function makeBirthDateYearsAgo(now: Date, years: number): string {
  const y = now.getFullYear() - years;
  const m = now.getMonth();
  const day = Math.min(now.getDate(), 28);
  const d = new Date(y, m, day);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = DELETE;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK (perfil IN ('funcionario', 'gerente'))
    );

    CREATE TABLE IF NOT EXISTS tutores (
      id TEXT PRIMARY KEY,
      nome_completo TEXT NOT NULL,
      cpf TEXT NOT NULL UNIQUE,
      telefone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      endereco TEXT NOT NULL,
      contato_emergencia_nome TEXT NOT NULL,
      contato_emergencia_telefone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pets (
      id TEXT PRIMARY KEY,
      tutor_id TEXT NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      especie TEXT NOT NULL,
      raca TEXT NOT NULL,
      sexo TEXT NOT NULL,
      data_nascimento TEXT NOT NULL,
      peso_kg REAL NOT NULL,
      porte TEXT NOT NULL,
      pelagem TEXT NOT NULL DEFAULT '',
      castrado INTEGER NOT NULL DEFAULT 0,
      vacinas_em_dia INTEGER NOT NULL DEFAULT 0,
      antipulgas INTEGER NOT NULL DEFAULT 0,
      alergias TEXT NOT NULL DEFAULT '',
      nenhuma_alergia INTEGER NOT NULL DEFAULT 0,
      doencas TEXT NOT NULL DEFAULT '',
      medicamentos TEXT NOT NULL DEFAULT '',
      problemas_pele TEXT NOT NULL DEFAULT '',
      mobilidade_reduzida INTEGER NOT NULL DEFAULT 0,
      agressivo INTEGER NOT NULL DEFAULT 0,
      morde INTEGER NOT NULL DEFAULT 0,
      aceita_secador INTEGER NOT NULL DEFAULT 0,
      aceita_maquina INTEGER NOT NULL DEFAULT 0,
      restricoes TEXT NOT NULL DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pessoas_autorizadas (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      documento TEXT NOT NULL,
      telefone TEXT NOT NULL DEFAULT '',
      parentesco TEXT NOT NULL DEFAULT '',
      eh_tutor INTEGER NOT NULL DEFAULT 0,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS atendimentos (
      id TEXT PRIMARY KEY,
      pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      tutor_id TEXT NOT NULL REFERENCES tutores(id) ON DELETE CASCADE,
      valor_total REAL NOT NULL,
      entrada_em TEXT NOT NULL,
      saida_em TEXT,
      status TEXT NOT NULL CHECK (status IN ('Em posse', 'Finalizado')),
      observacoes_tutor TEXT NOT NULL DEFAULT '',
      pulgas INTEGER NOT NULL DEFAULT 0,
      embaracados INTEGER NOT NULL DEFAULT 0,
      machucados INTEGER NOT NULL DEFAULT 0,
      autoriza_perfume_laco INTEGER NOT NULL DEFAULT 0,
      funcionario_responsavel TEXT NOT NULL,
      retirado_por TEXT
    );

    CREATE TABLE IF NOT EXISTS atendimento_itens (
      id TEXT PRIMARY KEY,
      atendimento_id TEXT NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
      servico_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id TEXT PRIMARY KEY,
      pet_nome TEXT NOT NULL,
      tutor_nome TEXT NOT NULL,
      servicos_json TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Agendado', 'Recebido', 'Cancelado'))
    );
  `);

  seedIfEmpty(db);
  dbInstance = db;
  return db;
}

function seedIfEmpty(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) as total FROM usuarios').get() as { total: number };
  if (row.total > 0) return;

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow);

  db.exec('BEGIN;');
  try {
    const insertUser = db.prepare(
      'INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('usr_carla', 'Carla Mendes', 'carla@petshop.com', hashPassword('gerente123'), 'gerente');
    insertUser.run('usr_pedro', 'Pedro Alves', 'pedro@petshop.com', hashPassword('func123'), 'funcionario');
    insertUser.run('usr_livia', 'Lívia Rocha', 'livia@petshop.com', hashPassword('func123'), 'funcionario');

    const insertServico = db.prepare(
      'INSERT INTO servicos (id, nome, valor, ordem) VALUES (?, ?, ?, ?)'
    );
    const servicosSeed = [
      ['srv_banho', 'Banho', 50, 1],
      ['srv_tosa_higienica', 'Tosa higiênica', 35, 2],
      ['srv_tosa_completa', 'Tosa completa', 70, 3],
      ['srv_tosa_maquina', 'Tosa na máquina ou tesoura', 80, 4],
      ['srv_hidratacao', 'Hidratação', 40, 5],
      ['srv_corte_unhas', 'Corte de unhas', 20, 6],
    ] as const;
    for (const [id, nome, valor, ordem] of servicosSeed) {
      insertServico.run(id, nome, valor, ordem);
    }

    const insertTutor = db.prepare(
      `INSERT INTO tutores (id, nome_completo, cpf, telefone, email, endereco, contato_emergencia_nome, contato_emergencia_telefone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const tutoresSeed = [
      ['tut_ricardo', 'Ricardo Santos', '111.111.111-11', '(71) 98888-1234', '', 'Rua das Palmeiras, 120, Pituba, Salvador', 'Júlia Santos', '(71) 98888-5678'],
      ['tut_marcos', 'Marcos Alves', '222.222.222-22', '(71) 98111-2020', '', 'Av. Paralela, 800, Salvador', 'Sandra Alves', '(71) 98111-3030'],
      ['tut_beatriz', 'Beatriz Lima', '333.333.333-33', '(71) 98777-4321', '', 'Rua Bahia, 45, Itapuã, Salvador', 'Caio Lima', '(71) 98777-1111'],
      ['tut_paulo', 'Paulo Reis', '444.444.444-44', '(71) 98666-5555', '', 'Rua do Sol, 300, Rio Vermelho, Salvador', 'Marta Reis', '(71) 98666-0000'],
      ['tut_ana', 'Ana Costa', '555.555.555-55', '(71) 98555-7788', '', 'Rua Ceará, 77, Brotas, Salvador', 'Luiz Costa', '(71) 98555-2222'],
      ['tut_fernanda', 'Fernanda Rocha', '666.666.666-66', '(71) 98444-1010', '', 'Rua Alagoas, 15, Graça, Salvador', 'Tiago Rocha', '(71) 98444-2020'],
      ['tut_juliana', 'Juliana Prado', '777.777.777-77', '(71) 98333-3030', '', 'Rua Piauí, 90, Barra, Salvador', 'Rui Prado', '(71) 98333-4040'],
      ['tut_rodrigo', 'Rodrigo Nunes', '888.888.888-88', '(71) 98222-5050', '', 'Rua Sergipe, 60, Stiep, Salvador', 'Lara Nunes', '(71) 98222-6060'],
    ] as const;
    for (const t of tutoresSeed) {
      insertTutor.run(...t);
    }

    const insertPet = db.prepare(
      `INSERT INTO pets (
        id, tutor_id, nome, especie, raca, sexo, data_nascimento, peso_kg, porte, pelagem,
        castrado, vacinas_em_dia, antipulgas, alergias, nenhuma_alergia, doencas, medicamentos,
        problemas_pele, mobilidade_reduzida, agressivo, morde, aceita_secador, aceita_maquina, restricoes, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, '', '', '', 0, 0, 0, 1, 1, '', ?)`
    );
    const insertAut = db.prepare(
      `INSERT INTO pessoas_autorizadas (id, pet_id, nome, documento, telefone, parentesco, eh_tutor, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const petsSeed = [
      ['pet_thor_ricardo', 'tut_ricardo', 'Thor', 'Cão', 'Golden Retriever', 'Macho', makeBirthDateYearsAgo(now, 4), 32, 'Grande', 'Pelagem dourada', '', 1, '2026-01-01T00:00:01Z'],
      ['pet_thor_marcos', 'tut_marcos', 'Thor', 'Cão', 'Labrador', 'Macho', makeBirthDateYearsAgo(now, 5), 30, 'Grande', 'Pelagem preta', '', 1, '2026-01-01T00:00:02Z'],
      ['pet_mel', 'tut_beatriz', 'Mel', 'Cão', 'Shih Tzu', 'Fêmea', makeBirthDateYearsAgo(now, 6), 7, 'Pequeno', 'Branca e caramelo', 'shampoo com aveia', 0, '2026-01-01T00:00:03Z'],
      ['pet_bidu', 'tut_paulo', 'Bidu', 'Cão', 'Poodle', 'Macho', makeBirthDateYearsAgo(now, 3), 8, 'Pequeno', 'Branca', '', 1, '2026-01-01T00:00:04Z'],
      ['pet_nina', 'tut_ana', 'Nina', 'Cão', 'SRD', 'Fêmea', makeBirthDateYearsAgo(now, 2), 12, 'Médio', 'Preta', '', 1, '2026-01-01T00:00:05Z'],
      ['pet_pipoca', 'tut_fernanda', 'Pipoca', 'Cão', 'Lhasa Apso', 'Fêmea', makeBirthDateYearsAgo(now, 3), 6, 'Pequeno', 'Mel', '', 1, '2026-01-01T00:00:06Z'],
      ['pet_luna', 'tut_juliana', 'Luna', 'Cão', 'Maltês', 'Fêmea', makeBirthDateYearsAgo(now, 4), 4, 'Pequeno', 'Branca', '', 1, '2026-01-01T00:00:07Z'],
      ['pet_fred', 'tut_rodrigo', 'Fred', 'Cão', 'Schnauzer', 'Macho', makeBirthDateYearsAgo(now, 5), 9, 'Pequeno', 'Sal e pimenta', '', 1, '2026-01-01T00:00:08Z'],
    ] as const;

    for (const p of petsSeed) {
      insertPet.run(...p);
    }

    insertAut.run('aut_ricardo', 'pet_thor_ricardo', 'Ricardo Santos', '111.111.111-11', '(71) 98888-1234', 'Tutor', 1, 0);
    insertAut.run('aut_julia', 'pet_thor_ricardo', 'Júlia Santos', '12.345.678-90', '(71) 98888-5678', 'Filha', 0, 1);
    insertAut.run('aut_marcos', 'pet_thor_marcos', 'Marcos Alves', '222.222.222-22', '(71) 98111-2020', 'Tutor', 1, 0);
    insertAut.run('aut_beatriz', 'pet_mel', 'Beatriz Lima', '333.333.333-33', '(71) 98777-4321', 'Tutor', 1, 0);
    insertAut.run('aut_paulo', 'pet_bidu', 'Paulo Reis', '444.444.444-44', '(71) 98666-5555', 'Tutor', 1, 0);
    insertAut.run('aut_ana', 'pet_nina', 'Ana Costa', '555.555.555-55', '(71) 98555-7788', 'Tutor', 1, 0);
    insertAut.run('aut_fernanda', 'pet_pipoca', 'Fernanda Rocha', '666.666.666-66', '(71) 98444-1010', 'Tutor', 1, 0);
    insertAut.run('aut_juliana', 'pet_luna', 'Juliana Prado', '777.777.777-77', '(71) 98333-3030', 'Tutor', 1, 0);
    insertAut.run('aut_rodrigo', 'pet_fred', 'Rodrigo Nunes', '888.888.888-88', '(71) 98222-5050', 'Tutor', 1, 0);

    const insertAtd = db.prepare(
      `INSERT INTO atendimentos (
        id, pet_id, tutor_id, valor_total, entrada_em, saida_em, status, observacoes_tutor,
        pulgas, embaracados, machucados, autoriza_perfume_laco, funcionario_responsavel, retirado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '', 0, 0, 0, 0, 'Carla Mendes', ?)`
    );
    const insertItem = db.prepare(
      `INSERT INTO atendimento_itens (id, atendimento_id, servico_id, nome, valor, ordem)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const atendimentosSeed: Array<{
      id: string;
      petId: string;
      tutorId: string;
      total: number;
      entrada: string;
      saida: string | null;
      status: string;
      retiradoPor: string | null;
      itens: Array<[string, string, number]>;
    }> = [
      {
        id: 'atd_nina_hoje',
        petId: 'pet_nina',
        tutorId: 'tut_ana',
        total: 70,
        entrada: makeRelativeIso(now, 0, 8, 5),
        saida: makeRelativeIso(now, 0, 9, 20),
        status: 'Finalizado',
        retiradoPor: 'Ana Costa',
        itens: [
          ['srv_banho', 'Banho', 50],
          ['srv_corte_unhas', 'Corte de unhas', 20],
        ],
      },
      {
        id: 'atd_thor_hoje',
        petId: 'pet_thor_ricardo',
        tutorId: 'tut_ricardo',
        total: 85,
        entrada: makeRelativeIso(now, 0, 8, 40),
        saida: null,
        status: 'Em posse',
        retiradoPor: null,
        itens: [
          ['srv_banho', 'Banho', 50],
          ['srv_tosa_higienica', 'Tosa higiênica', 35],
        ],
      },
      {
        id: 'atd_mel_hoje',
        petId: 'pet_mel',
        tutorId: 'tut_beatriz',
        total: 90,
        entrada: makeRelativeIso(now, 0, 9, 15),
        saida: null,
        status: 'Em posse',
        retiradoPor: null,
        itens: [
          ['srv_banho', 'Banho', 50],
          ['srv_hidratacao', 'Hidratação', 40],
        ],
      },
      {
        id: 'atd_bidu_hoje',
        petId: 'pet_bidu',
        tutorId: 'tut_paulo',
        total: 70,
        entrada: makeRelativeIso(now, 0, 9, 50),
        saida: null,
        status: 'Em posse',
        retiradoPor: null,
        itens: [['srv_tosa_completa', 'Tosa completa', 70]],
      },
      {
        id: 'atd_thor_7d',
        petId: 'pet_thor_ricardo',
        tutorId: 'tut_ricardo',
        total: 50,
        entrada: makeRelativeIso(now, -7, 8, 40),
        saida: makeRelativeIso(now, -7, 10, 5),
        status: 'Finalizado',
        retiradoPor: 'Ricardo Santos',
        itens: [['srv_banho', 'Banho', 50]],
      },
      {
        id: 'atd_thor_21d',
        petId: 'pet_thor_ricardo',
        tutorId: 'tut_ricardo',
        total: 85,
        entrada: makeRelativeIso(now, -21, 9, 10),
        saida: makeRelativeIso(now, -21, 11, 0),
        status: 'Finalizado',
        retiradoPor: 'Ricardo Santos',
        itens: [
          ['srv_banho', 'Banho', 50],
          ['srv_tosa_higienica', 'Tosa higiênica', 35],
        ],
      },
      {
        id: 'atd_thor_35d',
        petId: 'pet_thor_ricardo',
        tutorId: 'tut_ricardo',
        total: 50,
        entrada: makeRelativeIso(now, -35, 8, 50),
        saida: makeRelativeIso(now, -35, 10, 0),
        status: 'Finalizado',
        retiradoPor: 'Ricardo Santos',
        itens: [['srv_banho', 'Banho', 50]],
      },
    ];

    for (const a of atendimentosSeed) {
      insertAtd.run(a.id, a.petId, a.tutorId, a.total, a.entrada, a.saida, a.status, a.retiradoPor);
      a.itens.forEach(([srvId, nome, valor], idx) => {
        insertItem.run(`${a.id}_item_${idx}`, a.id, srvId, nome, valor, idx);
      });
    }

    const insertAg = db.prepare(
      `INSERT INTO agendamentos (id, pet_nome, tutor_nome, servicos_json, data, hora, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Agendado')`
    );
    insertAg.run('ag_pipoca_hoje', 'Pipoca', 'Fernanda Rocha', JSON.stringify(['Banho', 'Corte de unhas']), todayKey, '14:00');
    insertAg.run('ag_luna_hoje', 'Luna', 'Juliana Prado', JSON.stringify(['Tosa completa']), todayKey, '16:30');
    insertAg.run('ag_fred_amanha', 'Fred', 'Rodrigo Nunes', JSON.stringify(['Banho', 'Hidratação']), tomorrowKey, '09:00');
    insertAg.run('ag_mel_amanha', 'Mel', 'Beatriz Lima', JSON.stringify(['Banho']), tomorrowKey, '10:30');

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function findUserByEmail(email: string): (Usuario & { senhaHash: string }) | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, nome, email, senha_hash, perfil FROM usuarios WHERE lower(email) = lower(?)')
    .get(email.trim()) as
    | { id: string; nome: string; email: string; senha_hash: string; perfil: PerfilUsuario }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    senhaHash: row.senha_hash,
    perfil: row.perfil,
  };
}

export function findUserById(id: string): Usuario | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, nome, email, perfil FROM usuarios WHERE id = ?')
    .get(id) as Usuario | undefined;
  return row ?? null;
}

export function getBootstrapData(): AppDatabase {
  const db = getDb();

  const usuarios = db
    .prepare('SELECT id, nome, email, perfil FROM usuarios ORDER BY rowid ASC')
    .all() as unknown as Usuario[];

  const tutoresRows = db
    .prepare(
      `SELECT id, nome_completo, cpf, telefone, email, endereco,
              contato_emergencia_nome, contato_emergencia_telefone
       FROM tutores ORDER BY rowid ASC`
    )
    .all() as Array<Record<string, string>>;

  const tutores: Tutor[] = tutoresRows.map((r) => ({
    id: r.id,
    nomeCompleto: r.nome_completo,
    cpf: r.cpf,
    telefone: r.telefone,
    email: r.email,
    endereco: r.endereco,
    contatoEmergenciaNome: r.contato_emergencia_nome,
    contatoEmergenciaTelefone: r.contato_emergencia_telefone,
  }));

  const autRows = db
    .prepare(
      'SELECT id, pet_id, nome, documento, telefone, parentesco, eh_tutor FROM pessoas_autorizadas ORDER BY ordem ASC, rowid ASC'
    )
    .all() as Array<Record<string, unknown>>;

  const autByPet = new Map<string, PessoaAutorizada[]>();
  for (const r of autRows) {
    const petId = String(r.pet_id);
    const list = autByPet.get(petId) ?? [];
    list.push({
      id: String(r.id),
      nome: String(r.nome),
      documento: String(r.documento),
      telefone: String(r.telefone),
      parentesco: String(r.parentesco),
      ehTutor: Boolean(r.eh_tutor),
    });
    autByPet.set(petId, list);
  }

  const petRows = db
    .prepare('SELECT * FROM pets ORDER BY criado_em ASC, rowid ASC')
    .all() as Array<Record<string, unknown>>;

  const pets: Pet[] = petRows.map((r) => ({
    id: String(r.id),
    tutorId: String(r.tutor_id),
    nome: String(r.nome),
    especie: r.especie as Pet['especie'],
    raca: String(r.raca),
    sexo: r.sexo as Pet['sexo'],
    dataNascimento: String(r.data_nascimento),
    pesoKg: Number(r.peso_kg),
    porte: r.porte as Pet['porte'],
    pelagem: String(r.pelagem),
    castrado: Boolean(r.castrado),
    vacinasEmDia: Boolean(r.vacinas_em_dia),
    antipulgas: Boolean(r.antipulgas),
    saude: {
      alergias: String(r.alergias),
      nenhumaAlergia: Boolean(r.nenhuma_alergia),
      doencas: String(r.doencas),
      medicamentos: String(r.medicamentos),
      problemasPele: String(r.problemas_pele),
      mobilidadeReduzida: Boolean(r.mobilidade_reduzida),
      agressivo: Boolean(r.agressivo),
      morde: Boolean(r.morde),
      aceitaSecador: Boolean(r.aceita_secador),
      aceitaMaquina: Boolean(r.aceita_maquina),
      restricoes: String(r.restricoes),
    },
    pessoasAutorizadas: autByPet.get(String(r.id)) ?? [],
  }));

  const servicos = db
    .prepare('SELECT id, nome, valor FROM servicos ORDER BY ordem ASC')
    .all() as unknown as Servico[];

  const itemRows = db
    .prepare('SELECT atendimento_id, servico_id, nome, valor FROM atendimento_itens ORDER BY ordem ASC')
    .all() as Array<Record<string, unknown>>;

  const itensByAtd = new Map<string, AtendimentoItem[]>();
  for (const r of itemRows) {
    const atdId = String(r.atendimento_id);
    const list = itensByAtd.get(atdId) ?? [];
    list.push({
      servicoId: String(r.servico_id),
      nome: String(r.nome),
      valor: Number(r.valor),
    });
    itensByAtd.set(atdId, list);
  }

  const atdRows = db
    .prepare('SELECT * FROM atendimentos ORDER BY rowid ASC')
    .all() as Array<Record<string, unknown>>;

  const atendimentos: Atendimento[] = atdRows.map((r) => ({
    id: String(r.id),
    petId: String(r.pet_id),
    tutorId: String(r.tutor_id),
    itens: itensByAtd.get(String(r.id)) ?? [],
    valorTotal: Number(r.valor_total),
    entradaEm: String(r.entrada_em),
    saidaEm: r.saida_em ? String(r.saida_em) : null,
    status: r.status as Atendimento['status'],
    observacoesTutor: String(r.observacoes_tutor),
    pulgas: Boolean(r.pulgas),
    embaracados: Boolean(r.embaracados),
    machucados: Boolean(r.machucados),
    autorizaPerfumeLaco: Boolean(r.autoriza_perfume_laco),
    funcionarioResponsavel: String(r.funcionario_responsavel),
    retiradoPor: r.retirado_por ? String(r.retirado_por) : null,
  }));

  const agRows = db
    .prepare('SELECT * FROM agendamentos ORDER BY data ASC, hora ASC')
    .all() as Array<Record<string, unknown>>;

  const agendamentos: Agendamento[] = agRows.map((r) => ({
    id: String(r.id),
    petNome: String(r.pet_nome),
    tutorNome: String(r.tutor_nome),
    servicos: JSON.parse(String(r.servicos_json)) as string[],
    data: String(r.data),
    hora: String(r.hora),
    status: r.status as Agendamento['status'],
  }));

  return {
    usuarios,
    tutores,
    pets,
    servicos,
    atendimentos,
    agendamentos,
  };
}
