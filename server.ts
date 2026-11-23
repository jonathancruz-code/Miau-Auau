import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  findUserByEmail,
  findUserById,
  generateId,
  getBootstrapData,
  getDb,
  hashPassword,
  verifyPassword,
} from './server/db.ts';
import {
  getAvailableTimeSlots,
  onlyDigits,
  validateAgendamento,
  validateNewFuncionario,
  validateNovoAtendimento,
  validatePetForm,
  validateRetirada,
  validateServicePrices,
  validateTutorForm,
  getTodayDateInput,
} from './src/rules/businessRules.ts';
import type {
  Agendamento,
  Atendimento,
  PerfilUsuario,
  PessoaAutorizada,
  Pet,
  Tutor,
  Usuario,
} from './src/types.ts';

const PORT = Number(process.env.PORT) || 3000;
const COOKIE_NAME = 'miau_session';
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || RUNTIME_FALLBACK_SECRET;
}

interface SessionPayload {
  uid: string;
  exp: number;
}

function signToken(uid: string): string {
  const payload: SessionPayload = {
    uid,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(data)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed?.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string') {
    return proto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const https = isHttpsRequest(req);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (https) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
  ];
  if (https) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

interface AuthedRequest extends Request {
  authUser?: Usuario;
}

function attachUser(req: AuthedRequest): Usuario | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = findUserById(payload.uid);
  if (user) {
    req.authUser = user;
  }
  return user;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = attachUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sessão expirada ou não autenticada.' });
    return;
  }
  next();
}

function requireGerente(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.perfil !== 'gerente') {
    res.status(403).json({ error: 'Apenas a gerente pode realizar esta ação.' });
    return;
  }
  next();
}

function verifyMutationHeader(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }
  const hasCustomHeader = req.headers['x-requested-with'] === 'XMLHttpRequest';
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  let originMatches = false;
  if (typeof origin === 'string' && host) {
    try {
      originMatches = new URL(origin).host === host;
    } catch {
      originMatches = false;
    }
  }
  if (!hasCustomHeader && !originMatches) {
    res.status(403).json({ error: 'Requisição bloqueada por proteção de origem.' });
    return;
  }
  next();
}

async function startServer() {
  // Initialize SQLite database and seed initial data on boot
  getDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', verifyMutationHeader);

  // Auth routes (RN01)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, senha, perfil } = req.body ?? {};
    if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha) {
      res.status(400).json({ error: 'Informe o e-mail e a senha.' });
      return;
    }
    if (perfil !== 'funcionario' && perfil !== 'gerente') {
      res.status(400).json({ error: 'Perfil inválido.' });
      return;
    }

    const found = findUserByEmail(email);
    if (!found || !verifyPassword(senha, found.senhaHash)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }
    if (found.perfil !== (perfil as PerfilUsuario)) {
      res.status(403).json({ error: 'Este perfil não corresponde à conta.' });
      return;
    }

    const token = signToken(found.id);
    setSessionCookie(req, res, token);
    res.json({
      user: {
        id: found.id,
        nome: found.nome,
        email: found.email,
        perfil: found.perfil,
      },
    });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    const user = attachUser(req);
    res.json({ user: user ?? null });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Bootstrap data (authenticated - RN16)
  app.get('/api/dados', requireAuth, (_req: AuthedRequest, res: Response) => {
    res.json(getBootstrapData());
  });

  // Create Tutor + Pet (RN03, RN04, RN05, RN06)
  app.post('/api/tutores-pets', requireAuth, (req: AuthedRequest, res: Response) => {
    const { tutor, pet, reusedTutorId } = req.body ?? {};
    if (!pet || typeof pet !== 'object') {
      res.status(400).json({ error: 'Dados do pet inválidos.' });
      return;
    }

    const db = getDb();
    const current = getBootstrapData();

    let resolvedTutor: Tutor | null = null;
    if (typeof reusedTutorId === 'string' && reusedTutorId) {
      resolvedTutor = current.tutores.find((t) => t.id === reusedTutorId) ?? null;
      if (!resolvedTutor) {
        res.status(404).json({ error: 'Tutor informado não encontrado.' });
        return;
      }
    } else {
      if (!tutor || typeof tutor !== 'object') {
        res.status(400).json({ error: 'Dados do tutor inválidos.' });
        return;
      }
      const { errors } = validateTutorForm(
        {
          nomeCompleto: String(tutor.nomeCompleto ?? ''),
          cpf: String(tutor.cpf ?? ''),
          telefone: String(tutor.telefone ?? ''),
          email: String(tutor.email ?? ''),
          endereco: String(tutor.endereco ?? ''),
          contatoEmergenciaNome: String(tutor.contatoEmergenciaNome ?? ''),
          contatoEmergenciaTelefone: String(tutor.contatoEmergenciaTelefone ?? ''),
        },
        current.tutores,
        null
      );
      if (Object.keys(errors).length > 0) {
        res.status(400).json({ error: Object.values(errors)[0], fieldErrors: errors });
        return;
      }
      resolvedTutor = {
        id: generateId('tut'),
        nomeCompleto: String(tutor.nomeCompleto).trim(),
        cpf: String(tutor.cpf).trim(),
        telefone: String(tutor.telefone).trim(),
        email: String(tutor.email ?? '').trim(),
        endereco: String(tutor.endereco).trim(),
        contatoEmergenciaNome: String(tutor.contatoEmergenciaNome).trim(),
        contatoEmergenciaTelefone: String(tutor.contatoEmergenciaTelefone).trim(),
      };
    }

    const petErrors = validatePetForm({
      nome: String(pet.nome ?? ''),
      especie: String(pet.especie ?? ''),
      raca: String(pet.raca ?? ''),
      sexo: String(pet.sexo ?? ''),
      dataNascimento: String(pet.dataNascimento ?? ''),
      pesoKg: String(pet.pesoKg ?? ''),
      porte: String(pet.porte ?? ''),
      alergias: String(pet.saude?.alergias ?? ''),
      nenhumaAlergia: Boolean(pet.saude?.nenhumaAlergia),
    });
    if (Object.keys(petErrors).length > 0) {
      res.status(400).json({ error: Object.values(petErrors)[0], fieldErrors: petErrors });
      return;
    }

    const newPetId = generateId('pet');
    const extras: PessoaAutorizada[] = Array.isArray(pet.pessoasAutorizadas)
      ? pet.pessoasAutorizadas
          .filter((pa: PessoaAutorizada) => !pa.ehTutor && pa.nome && pa.documento)
          .map((pa: PessoaAutorizada) => ({
            id: generateId('aut'),
            nome: String(pa.nome).trim(),
            documento: String(pa.documento).trim(),
            telefone: String(pa.telefone ?? '').trim(),
            parentesco: String(pa.parentesco ?? 'Autorizada').trim(),
            ehTutor: false,
          }))
      : [];

    const tutorAut: PessoaAutorizada = {
      id: generateId('aut'),
      nome: resolvedTutor.nomeCompleto,
      documento: resolvedTutor.cpf,
      telefone: resolvedTutor.telefone,
      parentesco: 'Tutor',
      ehTutor: true,
    };

    const saude = pet.saude ?? {};
    db.exec('BEGIN;');
    try {
      if (!reusedTutorId) {
        db.prepare(
          `INSERT INTO tutores (id, nome_completo, cpf, telefone, email, endereco, contato_emergencia_nome, contato_emergencia_telefone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          resolvedTutor.id,
          resolvedTutor.nomeCompleto,
          resolvedTutor.cpf,
          resolvedTutor.telefone,
          resolvedTutor.email,
          resolvedTutor.endereco,
          resolvedTutor.contatoEmergenciaNome,
          resolvedTutor.contatoEmergenciaTelefone
        );
      }

      db.prepare(
        `INSERT INTO pets (
          id, tutor_id, nome, especie, raca, sexo, data_nascimento, peso_kg, porte, pelagem,
          castrado, vacinas_em_dia, antipulgas, alergias, nenhuma_alergia, doencas, medicamentos,
          problemas_pele, mobilidade_reduzida, agressivo, morde, aceita_secador, aceita_maquina, restricoes, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        newPetId,
        resolvedTutor.id,
        String(pet.nome).trim(),
        String(pet.especie),
        String(pet.raca).trim(),
        String(pet.sexo),
        String(pet.dataNascimento),
        Number(pet.pesoKg),
        String(pet.porte),
        String(pet.pelagem ?? '').trim(),
        pet.castrado ? 1 : 0,
        pet.vacinasEmDia ? 1 : 0,
        pet.antipulgas ? 1 : 0,
        saude.nenhumaAlergia ? '' : String(saude.alergias ?? '').trim(),
        saude.nenhumaAlergia ? 1 : 0,
        String(saude.doencas ?? '').trim(),
        String(saude.medicamentos ?? '').trim(),
        String(saude.problemasPele ?? '').trim(),
        saude.mobilidadeReduzida ? 1 : 0,
        saude.agressivo ? 1 : 0,
        saude.morde ? 1 : 0,
        saude.aceitaSecador ? 1 : 0,
        saude.aceitaMaquina ? 1 : 0,
        String(saude.restricoes ?? '').trim(),
        new Date().toISOString()
      );

      const insertAut = db.prepare(
        `INSERT INTO pessoas_autorizadas (id, pet_id, nome, documento, telefone, parentesco, eh_tutor, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      [tutorAut, ...extras].forEach((pa, idx) => {
        insertAut.run(pa.id, newPetId, pa.nome, pa.documento, pa.telefone, pa.parentesco, pa.ehTutor ? 1 : 0, idx);
      });

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updated = getBootstrapData();
    const savedPet = updated.pets.find((p) => p.id === newPetId)!;
    res.status(201).json({ tutor: resolvedTutor, pet: savedPet, data: updated });
  });

  // Update Tutor + Pet
  app.put('/api/tutores-pets/:petId', requireAuth, (req: AuthedRequest, res: Response) => {
    const { petId } = req.params;
    const { tutor, pet } = req.body ?? {};
    const db = getDb();
    const current = getBootstrapData();
    const existingPet = current.pets.find((p) => p.id === petId);
    if (!existingPet) {
      res.status(404).json({ error: 'Pet não encontrado.' });
      return;
    }

    const { errors } = validateTutorForm(
      {
        nomeCompleto: String(tutor?.nomeCompleto ?? ''),
        cpf: String(tutor?.cpf ?? ''),
        telefone: String(tutor?.telefone ?? ''),
        email: String(tutor?.email ?? ''),
        endereco: String(tutor?.endereco ?? ''),
        contatoEmergenciaNome: String(tutor?.contatoEmergenciaNome ?? ''),
        contatoEmergenciaTelefone: String(tutor?.contatoEmergenciaTelefone ?? ''),
      },
      current.tutores,
      existingPet.tutorId
    );
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: Object.values(errors)[0], fieldErrors: errors });
      return;
    }

    const petErrors = validatePetForm({
      nome: String(pet?.nome ?? ''),
      especie: String(pet?.especie ?? ''),
      raca: String(pet?.raca ?? ''),
      sexo: String(pet?.sexo ?? ''),
      dataNascimento: String(pet?.dataNascimento ?? ''),
      pesoKg: String(pet?.pesoKg ?? ''),
      porte: String(pet?.porte ?? ''),
      alergias: String(pet?.saude?.alergias ?? ''),
      nenhumaAlergia: Boolean(pet?.saude?.nenhumaAlergia),
    });
    if (Object.keys(petErrors).length > 0) {
      res.status(400).json({ error: Object.values(petErrors)[0], fieldErrors: petErrors });
      return;
    }

    const updatedTutor: Tutor = {
      id: existingPet.tutorId,
      nomeCompleto: String(tutor.nomeCompleto).trim(),
      cpf: String(tutor.cpf).trim(),
      telefone: String(tutor.telefone).trim(),
      email: String(tutor.email ?? '').trim(),
      endereco: String(tutor.endereco).trim(),
      contatoEmergenciaNome: String(tutor.contatoEmergenciaNome).trim(),
      contatoEmergenciaTelefone: String(tutor.contatoEmergenciaTelefone).trim(),
    };

    const existingTutorAut = existingPet.pessoasAutorizadas.find((p) => p.ehTutor);
    const tutorAut: PessoaAutorizada = {
      id: existingTutorAut?.id ?? generateId('aut'),
      nome: updatedTutor.nomeCompleto,
      documento: updatedTutor.cpf,
      telefone: updatedTutor.telefone,
      parentesco: 'Tutor',
      ehTutor: true,
    };

    const extras: PessoaAutorizada[] = Array.isArray(pet.pessoasAutorizadas)
      ? pet.pessoasAutorizadas
          .filter((pa: PessoaAutorizada) => !pa.ehTutor && pa.nome && pa.documento)
          .map((pa: PessoaAutorizada) => ({
            id: pa.id && typeof pa.id === 'string' ? pa.id : generateId('aut'),
            nome: String(pa.nome).trim(),
            documento: String(pa.documento).trim(),
            telefone: String(pa.telefone ?? '').trim(),
            parentesco: String(pa.parentesco ?? 'Autorizada').trim(),
            ehTutor: false,
          }))
      : [];

    const saude = pet.saude ?? {};
    db.exec('BEGIN;');
    try {
      db.prepare(
        `UPDATE tutores
         SET nome_completo = ?, cpf = ?, telefone = ?, email = ?, endereco = ?,
             contato_emergencia_nome = ?, contato_emergencia_telefone = ?
         WHERE id = ?`
      ).run(
        updatedTutor.nomeCompleto,
        updatedTutor.cpf,
        updatedTutor.telefone,
        updatedTutor.email,
        updatedTutor.endereco,
        updatedTutor.contatoEmergenciaNome,
        updatedTutor.contatoEmergenciaTelefone,
        updatedTutor.id
      );

      db.prepare(
        `UPDATE pets
         SET nome = ?, especie = ?, raca = ?, sexo = ?, data_nascimento = ?, peso_kg = ?,
             porte = ?, pelagem = ?, castrado = ?, vacinas_em_dia = ?, antipulgas = ?,
             alergias = ?, nenhuma_alergia = ?, doencas = ?, medicamentos = ?, problemas_pele = ?,
             mobilidade_reduzida = ?, agressivo = ?, morde = ?, aceita_secador = ?, aceita_maquina = ?, restricoes = ?
         WHERE id = ?`
      ).run(
        String(pet.nome).trim(),
        String(pet.especie),
        String(pet.raca).trim(),
        String(pet.sexo),
        String(pet.dataNascimento),
        Number(pet.pesoKg),
        String(pet.porte),
        String(pet.pelagem ?? '').trim(),
        pet.castrado ? 1 : 0,
        pet.vacinasEmDia ? 1 : 0,
        pet.antipulgas ? 1 : 0,
        saude.nenhumaAlergia ? '' : String(saude.alergias ?? '').trim(),
        saude.nenhumaAlergia ? 1 : 0,
        String(saude.doencas ?? '').trim(),
        String(saude.medicamentos ?? '').trim(),
        String(saude.problemasPele ?? '').trim(),
        saude.mobilidadeReduzida ? 1 : 0,
        saude.agressivo ? 1 : 0,
        saude.morde ? 1 : 0,
        saude.aceitaSecador ? 1 : 0,
        saude.aceitaMaquina ? 1 : 0,
        String(saude.restricoes ?? '').trim(),
        petId
      );

      db.prepare('DELETE FROM pessoas_autorizadas WHERE pet_id = ?').run(petId);
      const insertAut = db.prepare(
        `INSERT INTO pessoas_autorizadas (id, pet_id, nome, documento, telefone, parentesco, eh_tutor, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      [tutorAut, ...extras].forEach((pa, idx) => {
        insertAut.run(pa.id, petId, pa.nome, pa.documento, pa.telefone, pa.parentesco, pa.ehTutor ? 1 : 0, idx);
      });

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updated = getBootstrapData();
    const savedPet = updated.pets.find((p) => p.id === petId)!;
    res.json({ tutor: updatedTutor, pet: savedPet, data: updated });
  });

  // Create Atendimento (RN08, RN09, RN10, RN11)
  app.post('/api/atendimentos', requireAuth, (req: AuthedRequest, res: Response) => {
    const {
      petId,
      servicoIds,
      observacoesTutor,
      pulgas,
      embaracados,
      machucados,
      autorizaPerfumeLaco,
      funcionarioResponsavel,
      agendamentoId,
    } = req.body ?? {};

    const current = getBootstrapData();
    const pet = current.pets.find((p) => p.id === petId);
    if (!pet) {
      res.status(404).json({ error: 'Pet não encontrado.' });
      return;
    }

    const ids: string[] = Array.isArray(servicoIds) ? servicoIds.map(String) : [];
    const check = validateNovoAtendimento(pet.id, ids, current.atendimentos);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const chosenServices = current.servicos.filter((s) => ids.includes(s.id));
    if (chosenServices.length === 0) {
      res.status(400).json({ error: 'Escolha ao menos um serviço.' });
      return;
    }

    const valorTotal = chosenServices.reduce((sum, s) => sum + s.valor, 0);
    const entradaEm = new Date().toISOString();
    const atdId = generateId('atd');

    const db = getDb();
    db.exec('BEGIN;');
    try {
      db.prepare(
        `INSERT INTO atendimentos (
          id, pet_id, tutor_id, valor_total, entrada_em, saida_em, status, observacoes_tutor,
          pulgas, embaracados, machucados, autoriza_perfume_laco, funcionario_responsavel, retirado_por
        ) VALUES (?, ?, ?, ?, ?, NULL, 'Em posse', ?, ?, ?, ?, ?, ?, NULL)`
      ).run(
        atdId,
        pet.id,
        pet.tutorId,
        valorTotal,
        entradaEm,
        String(observacoesTutor ?? '').trim(),
        pulgas ? 1 : 0,
        embaracados ? 1 : 0,
        machucados ? 1 : 0,
        autorizaPerfumeLaco ? 1 : 0,
        String(funcionarioResponsavel ?? '').trim() || req.authUser!.nome
      );

      const insertItem = db.prepare(
        `INSERT INTO atendimento_itens (id, atendimento_id, servico_id, nome, valor, ordem)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      chosenServices.forEach((s, idx) => {
        insertItem.run(`${atdId}_item_${idx}`, atdId, s.id, s.nome, s.valor, idx);
      });

      if (typeof agendamentoId === 'string' && agendamentoId) {
        db.prepare("UPDATE agendamentos SET status = 'Recebido' WHERE id = ?").run(agendamentoId);
      }

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updated = getBootstrapData();
    const created = updated.atendimentos.find((a) => a.id === atdId)!;
    res.status(201).json({ atendimento: created, data: updated });
  });

  // Checkout / Retirada (RN12, RN13)
  app.post('/api/atendimentos/:id/retirada', requireAuth, (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const { autorizadoId, documentoConferido } = req.body ?? {};

    const current = getBootstrapData();
    const atd = current.atendimentos.find((a) => a.id === id);
    if (!atd || atd.status !== 'Em posse') {
      res.status(404).json({ error: 'Atendimento em posse não encontrado.' });
      return;
    }

    const check = validateRetirada(
      typeof autorizadoId === 'string' ? autorizadoId : null,
      Boolean(documentoConferido)
    );
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    const pet = current.pets.find((p) => p.id === atd.petId);
    const autorizado = pet?.pessoasAutorizadas.find((pa) => pa.id === autorizadoId);
    if (!autorizado) {
      res.status(403).json({ error: 'Pessoa não autorizada para este pet.' });
      return;
    }

    const saidaEm = new Date().toISOString();
    const db = getDb();
    db.prepare(
      "UPDATE atendimentos SET status = 'Finalizado', saida_em = ?, retirado_por = ? WHERE id = ?"
    ).run(saidaEm, autorizado.nome, id);

    const updated = getBootstrapData();
    const finalized = updated.atendimentos.find((a) => a.id === id)!;
    res.json({ atendimento: finalized, data: updated });
  });

  // Agendamentos (RN15)
  app.post('/api/agendamentos', requireAuth, (req: AuthedRequest, res: Response) => {
    const { petNome, tutorNome, servicos, data, hora } = req.body ?? {};
    const current = getBootstrapData();
    const todayStr = getTodayDateInput(new Date());

    const input = {
      petNome: String(petNome ?? ''),
      tutorNome: String(tutorNome ?? ''),
      servicos: Array.isArray(servicos) ? servicos.map(String) : [],
      data: String(data ?? ''),
      hora: String(hora ?? ''),
    };

    const errors = validateAgendamento(input, current.agendamentos, todayStr);
    if (!getAvailableTimeSlots().includes(input.hora)) {
      errors.hora = 'Horário inválido.';
    }
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: Object.values(errors)[0], fieldErrors: errors });
      return;
    }

    const id = generateId('ag');
    const db = getDb();
    db.prepare(
      `INSERT INTO agendamentos (id, pet_nome, tutor_nome, servicos_json, data, hora, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Agendado')`
    ).run(id, input.petNome.trim(), input.tutorNome.trim(), JSON.stringify(input.servicos), input.data, input.hora);

    const updated = getBootstrapData();
    res.status(201).json({ data: updated });
  });

  app.post('/api/agendamentos/:id/cancelar', requireAuth, (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    const db = getDb();
    const info = db
      .prepare("UPDATE agendamentos SET status = 'Cancelado' WHERE id = ? AND status = 'Agendado'")
      .run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
      return;
    }
    res.json({ data: getBootstrapData() });
  });

  // Administração (Gerente only - RN02)
  app.put('/api/servicos/valores', requireAuth, requireGerente, (req: AuthedRequest, res: Response) => {
    const { valores } = req.body ?? {};
    if (!valores || typeof valores !== 'object') {
      res.status(400).json({ error: 'Valores inválidos.' });
      return;
    }

    const numericMap: Record<string, number> = {};
    for (const [id, val] of Object.entries(valores as Record<string, unknown>)) {
      numericMap[id] = Number(val);
    }

    const errors = validateServicePrices(numericMap);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Informe um valor maior que zero.', fieldErrors: errors });
      return;
    }

    const db = getDb();
    const stmt = db.prepare('UPDATE servicos SET valor = ? WHERE id = ?');
    db.exec('BEGIN;');
    try {
      for (const [id, val] of Object.entries(numericMap)) {
        stmt.run(val, id);
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    res.json({ data: getBootstrapData() });
  });

  app.post('/api/funcionarios', requireAuth, requireGerente, (req: AuthedRequest, res: Response) => {
    const { nome, email, senha } = req.body ?? {};
    const current = getBootstrapData();
    const errors = validateNewFuncionario(
      {
        nome: String(nome ?? ''),
        email: String(email ?? ''),
        senha: String(senha ?? ''),
      },
      current.usuarios
    );
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: Object.values(errors)[0], fieldErrors: errors });
      return;
    }

    const db = getDb();
    const id = generateId('usr');
    db.prepare(
      'INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?, ?)'
    ).run(id, String(nome).trim(), String(email).trim().toLowerCase(), hashPassword(String(senha)), 'funcionario');

    res.status(201).json({ data: getBootstrapData() });
  });

  app.delete('/api/funcionarios/:id', requireAuth, requireGerente, (req: AuthedRequest, res: Response) => {
    const { id } = req.params;
    if (id === req.authUser!.id) {
      res.status(400).json({ error: 'A gerente não pode remover a si mesma.' });
      return;
    }

    const db = getDb();
    const target = db
      .prepare('SELECT id, perfil FROM usuarios WHERE id = ?')
      .get(id) as { id: string; perfil: PerfilUsuario } | undefined;

    if (!target) {
      res.status(404).json({ error: 'Funcionário não encontrado.' });
      return;
    }
    if (target.perfil !== 'funcionario') {
      res.status(403).json({ error: 'Apenas funcionários podem ser removidos.' });
      return;
    }

    db.prepare("DELETE FROM usuarios WHERE id = ? AND perfil = 'funcionario'").run(id);
    res.json({ data: getBootstrapData() });
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Miau & Auau server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
