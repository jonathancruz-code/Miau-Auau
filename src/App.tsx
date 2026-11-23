import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Agendamento, AppDatabase, PerfilUsuario, Pet, TelaAtiva, Tutor, Usuario } from './types';
import {
  apiCancelAgendamento,
  apiCreateAgendamento,
  apiCreateAtendimento,
  apiCreateFuncionario,
  apiCreateTutorPet,
  apiFinalizarRetirada,
  apiGetBootstrap,
  apiGetCurrentUser,
  apiLogin,
  apiLogout,
  apiRemoveFuncionario,
  apiSaveServicePrices,
  apiUpdateTutorPet,
} from './data/api';
import {
  findPetForAgendamento,
  formatTimeBR,
  petHasActiveAtendimento,
} from './rules/businessRules';
import { BottomNav, ToastBanner, TopBar } from './components/LayoutChrome';
import { TelaLogin } from './components/TelaLogin';
import { TelaInicio } from './components/TelaInicio';
import { TelaPets } from './components/TelaPets';
import { TelaCadastro } from './components/TelaCadastro';
import { TelaNovoAtendimento, type NovoAtendimentoSubmitPayload } from './components/TelaNovoAtendimento';
import { TelaRetirada } from './components/TelaRetirada';
import { TelaAgenda, type CreateAgendamentoPayload } from './components/TelaAgenda';
import { TelaAdministracao } from './components/TelaAdministracao';

interface CadastroContext {
  mode: 'novo' | 'editar';
  petId?: string | null;
  prefillPetNome?: string;
  prefillTutorNome?: string;
  pendingAgendamento?: Agendamento | null;
}

interface NovoAtendimentoContext {
  petId: string | null;
  serviceNames?: string[];
  agendamentoId?: string | null;
}

const EMPTY_DB: AppDatabase = {
  usuarios: [],
  tutores: [],
  pets: [],
  servicos: [],
  atendimentos: [],
  agendamentos: [],
};

export default function App() {
  const [db, setDb] = useState<AppDatabase>(EMPTY_DB);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tela, setTela] = useState<TelaAtiva>('login');

  const [selectedPetIdInPets, setSelectedPetIdInPets] = useState<string | null>(null);
  const [cadastroCtx, setCadastroCtx] = useState<CadastroContext>({ mode: 'novo' });
  const [novoAtdCtx, setNovoAtdCtx] = useState<NovoAtendimentoContext>({ petId: null });
  const [retiradaAtdId, setRetiradaAtdId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const user = await apiGetCurrentUser();
        if (!active) return;
        if (user) {
          const data = await apiGetBootstrap();
          if (!active) return;
          setDb(data);
          setCurrentUser(user);
          setTela('inicio');
        }
      } catch {
        // Keep unauthenticated state on login screen
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  // Route guard for RN01 & RN02
  useEffect(() => {
    if (loadingSession) return;
    if (!currentUser && tela !== 'login') {
      setTela('login');
      return;
    }
    if (currentUser && tela === 'administracao' && currentUser.perfil !== 'gerente') {
      setTela('inicio');
    }
  }, [currentUser, tela, loadingSession]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [tela]);

  async function handleLoginSubmit(email: string, senha: string, perfil: PerfilUsuario) {
    const user = await apiLogin(email, senha, perfil);
    const data = await apiGetBootstrap();
    setDb(data);
    setCurrentUser(user);
    setTela('inicio');
  }

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // Ignore network errors on logout and clear local session state
    }
    setCurrentUser(null);
    setDb(EMPTY_DB);
    setSelectedPetIdInPets(null);
    setCadastroCtx({ mode: 'novo' });
    setNovoAtdCtx({ petId: null });
    setRetiradaAtdId(null);
    setTela('login');
  }

  function handleNavigate(target: TelaAtiva) {
    if (!currentUser) {
      setTela('login');
      return;
    }
    if (target === 'administracao' && currentUser.perfil !== 'gerente') {
      setTela('inicio');
      return;
    }
    if (target === 'retirada') {
      setRetiradaAtdId(null);
    }
    if (target === 'novo-atendimento') {
      setNovoAtdCtx({ petId: null });
    }
    setTela(target);
  }

  // Tela 04 save handler
  async function handleSaveCadastro(result: {
    mode: 'novo' | 'editar';
    tutor: Tutor;
    pet: Pet;
    reusedTutor: boolean;
  }) {
    const { id: _tutorId, ...tutorFields } = result.tutor;

    if (result.mode === 'novo') {
      const res = await apiCreateTutorPet({
        tutor: result.reusedTutor ? undefined : tutorFields,
        reusedTutorId: result.reusedTutor ? result.tutor.id : null,
        pet: {
          nome: result.pet.nome,
          especie: result.pet.especie,
          raca: result.pet.raca,
          sexo: result.pet.sexo,
          dataNascimento: result.pet.dataNascimento,
          pesoKg: result.pet.pesoKg,
          porte: result.pet.porte,
          pelagem: result.pet.pelagem,
          castrado: result.pet.castrado,
          vacinasEmDia: result.pet.vacinasEmDia,
          antipulgas: result.pet.antipulgas,
          saude: result.pet.saude,
          pessoasAutorizadas: result.pet.pessoasAutorizadas,
        },
      });
      setDb(res.data);
      showToast('Cadastro salvo.');
      const pendingAg = cadastroCtx.pendingAgendamento;
      setNovoAtdCtx({
        petId: res.pet.id,
        serviceNames: pendingAg ? pendingAg.servicos : [],
        agendamentoId: pendingAg ? pendingAg.id : null,
      });
      setCadastroCtx({ mode: 'novo' });
      setTela('novo-atendimento');
    } else {
      const res = await apiUpdateTutorPet(result.pet.id, {
        tutor: tutorFields,
        pet: {
          nome: result.pet.nome,
          especie: result.pet.especie,
          raca: result.pet.raca,
          sexo: result.pet.sexo,
          dataNascimento: result.pet.dataNascimento,
          pesoKg: result.pet.pesoKg,
          porte: result.pet.porte,
          pelagem: result.pet.pelagem,
          castrado: result.pet.castrado,
          vacinasEmDia: result.pet.vacinasEmDia,
          antipulgas: result.pet.antipulgas,
          saude: result.pet.saude,
          pessoasAutorizadas: result.pet.pessoasAutorizadas,
        },
      });
      setDb(res.data);
      showToast('Cadastro atualizado.');
      setSelectedPetIdInPets(res.pet.id);
      setTela('pets');
    }
  }

  // Tela 05 submit handler
  async function handleSubmitAtendimento(
    payload: NovoAtendimentoSubmitPayload,
    petNome: string
  ) {
    const res = await apiCreateAtendimento(payload);
    setDb(res.data);
    showToast(`Entrada registrada: ${petNome} está em posse.`);
    setNovoAtdCtx({ petId: null });
    setTela('inicio');
  }

  // Tela 06 checkout handler
  async function handleFinalizarAtendimento(
    atendimentoId: string,
    autorizadoId: string,
    documentoConferido: boolean,
    petNome: string
  ) {
    const res = await apiFinalizarRetirada(atendimentoId, autorizadoId, documentoConferido);
    setDb(res.data);
    const saidaIso = res.atendimento.saidaEm ?? new Date().toISOString();
    showToast(`Atendimento finalizado: ${petNome} saiu às ${formatTimeBR(saidaIso)}.`);
    setRetiradaAtdId(null);
    setTela('inicio');
  }

  // Tela 07 Agenda handlers
  async function handleCreateAgendamento(payload: CreateAgendamentoPayload) {
    const res = await apiCreateAgendamento(payload);
    setDb(res.data);
    showToast('Agendamento salvo.');
  }

  async function handleCancelAgendamento(agendamentoId: string) {
    try {
      const res = await apiCancelAgendamento(agendamentoId);
      setDb(res.data);
      showToast('Agendamento cancelado.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cancelar agendamento.');
    }
  }

  function handleReceberAgendamento(ag: Agendamento) {
    const pet = findPetForAgendamento(db.pets, db.tutores, ag.petNome, ag.tutorNome);
    if (pet) {
      if (petHasActiveAtendimento(db.atendimentos, pet.id)) {
        showToast('Este pet já tem um atendimento em posse.');
        return;
      }
      setNovoAtdCtx({
        petId: pet.id,
        serviceNames: ag.servicos,
        agendamentoId: ag.id,
      });
      setTela('novo-atendimento');
    } else {
      setCadastroCtx({
        mode: 'novo',
        prefillPetNome: ag.petNome,
        prefillTutorNome: ag.tutorNome,
        pendingAgendamento: ag,
      });
      setTela('cadastro');
    }
  }

  // Tela 08 Admin handlers
  async function handleSaveServicos(valores: Record<string, number>) {
    const res = await apiSaveServicePrices(valores);
    setDb(res.data);
    showToast('Valores salvos.');
  }

  async function handleCreateFuncionario(payload: { nome: string; email: string; senha: string }) {
    const res = await apiCreateFuncionario(payload);
    setDb(res.data);
    showToast('Funcionário criado.');
  }

  async function handleRemoveFuncionario(usuarioId: string) {
    try {
      const res = await apiRemoveFuncionario(usuarioId);
      setDb(res.data);
      showToast('Funcionário removido.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover funcionário.');
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex flex-col">
        <TopBar currentUser={null} />
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-[14px] leading-[20px] text-[#636578]">Carregando...</p>
        </main>
      </div>
    );
  }

  if (!currentUser || tela === 'login') {
    return (
      <>
        <TelaLogin onSubmitLogin={handleLoginSubmit} />
        <ToastBanner message={toastMessage} />
      </>
    );
  }

  const editingPet =
    cadastroCtx.mode === 'editar' && cadastroCtx.petId
      ? db.pets.find((p) => p.id === cadastroCtx.petId) ?? null
      : null;
  const editingTutor = editingPet
    ? db.tutores.find((t) => t.id === editingPet.tutorId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex flex-col">
      <TopBar
        currentUser={currentUser}
        onLogoClick={() => handleNavigate('inicio')}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-[40px] min-[1240px]:px-[72px] pt-[24px] md:pt-[40px] pb-[88px] md:pb-[112px]">
        {tela === 'inicio' && (
          <TelaInicio
            atendimentos={db.atendimentos}
            agendamentos={db.agendamentos}
            pets={db.pets}
            tutores={db.tutores}
            onAbrirAgenda={() => handleNavigate('agenda')}
            onNovoAtendimento={() => {
              setNovoAtdCtx({ petId: null });
              setTela('novo-atendimento');
            }}
            onAbrirRetirada={(atdId) => {
              setRetiradaAtdId(atdId);
              setTela('retirada');
            }}
          />
        )}

        {tela === 'pets' && (
          <TelaPets
            pets={db.pets}
            tutores={db.tutores}
            atendimentos={db.atendimentos}
            initialSelectedPetId={selectedPetIdInPets}
            onCadastrarNovo={() => {
              setCadastroCtx({ mode: 'novo' });
              setTela('cadastro');
            }}
            onEditarCadastro={(petId) => {
              setCadastroCtx({ mode: 'editar', petId });
              setTela('cadastro');
            }}
            onNovoAtendimento={(petId) => {
              setNovoAtdCtx({ petId });
              setTela('novo-atendimento');
            }}
            onShowErrorToast={showToast}
          />
        )}

        {tela === 'cadastro' && (
          <TelaCadastro
            key={`${cadastroCtx.mode}-${cadastroCtx.petId ?? 'new'}-${cadastroCtx.pendingAgendamento?.id ?? ''}`}
            mode={cadastroCtx.mode}
            existingTutores={db.tutores}
            editingPet={editingPet}
            editingTutor={editingTutor}
            prefillPetNome={cadastroCtx.prefillPetNome}
            prefillTutorNome={cadastroCtx.prefillTutorNome}
            onCancel={() => {
              setCadastroCtx({ mode: 'novo' });
              setTela('pets');
            }}
            onSaveComplete={handleSaveCadastro}
          />
        )}

        {tela === 'novo-atendimento' && (
          <TelaNovoAtendimento
            key={`${novoAtdCtx.petId ?? 'none'}-${novoAtdCtx.agendamentoId ?? ''}`}
            initialPetId={novoAtdCtx.petId}
            initialServiceNames={novoAtdCtx.serviceNames}
            agendamentoId={novoAtdCtx.agendamentoId}
            pets={db.pets}
            tutores={db.tutores}
            servicos={db.servicos}
            atendimentos={db.atendimentos}
            currentUser={currentUser}
            onCancel={() => {
              setNovoAtdCtx({ petId: null });
              setTela('inicio');
            }}
            onSubmitAtendimento={handleSubmitAtendimento}
          />
        )}

        {tela === 'retirada' && (
          <TelaRetirada
            initialAtendimentoId={retiradaAtdId}
            atendimentos={db.atendimentos}
            pets={db.pets}
            tutores={db.tutores}
            onFinalizarAtendimento={handleFinalizarAtendimento}
          />
        )}

        {tela === 'agenda' && (
          <TelaAgenda
            agendamentos={db.agendamentos}
            servicos={db.servicos}
            onCreateAgendamento={handleCreateAgendamento}
            onCancelAgendamento={handleCancelAgendamento}
            onReceberAgendamento={handleReceberAgendamento}
          />
        )}

        {tela === 'administracao' && currentUser.perfil === 'gerente' && (
          <TelaAdministracao
            servicos={db.servicos}
            usuarios={db.usuarios}
            currentUser={currentUser}
            onSaveServicos={handleSaveServicos}
            onCreateFuncionario={handleCreateFuncionario}
            onRemoveFuncionario={handleRemoveFuncionario}
          />
        )}
      </main>

      <BottomNav activeScreen={tela} currentUser={currentUser} onNavigate={handleNavigate} />
      <ToastBanner message={toastMessage} />
    </div>
  );
}
