import React, { useMemo, useState } from 'react';
import type { Atendimento, Pet, Servico, Tutor, Usuario } from '../types';
import {
  calculateServicesTotal,
  formatCurrencyBR,
  formatDateTimeBR,
  getPetAlertMessages,
  hasAlergia,
  normalizeText,
  petHasActiveAtendimento,
  validateNovoAtendimento,
} from '../rules/businessRules';
import { AlertBanner, AllergyChip, CustomCheckbox, SegmentedToggle, StatusChip } from './LayoutChrome';

export interface NovoAtendimentoSubmitPayload {
  petId: string;
  servicoIds: string[];
  observacoesTutor: string;
  pulgas: boolean;
  embaracados: boolean;
  machucados: boolean;
  autorizaPerfumeLaco: boolean;
  funcionarioResponsavel: string;
  agendamentoId?: string | null;
}

interface TelaNovoAtendimentoProps {
  initialPetId: string | null;
  initialServiceNames?: string[];
  agendamentoId?: string | null;
  pets: Pet[];
  tutores: Tutor[];
  servicos: Servico[];
  atendimentos: Atendimento[];
  currentUser: Usuario;
  onCancel: () => void;
  onSubmitAtendimento: (payload: NovoAtendimentoSubmitPayload, petNome: string) => Promise<void>;
}

type SimNao = 'Sim' | 'Não';

export function TelaNovoAtendimento({
  initialPetId,
  initialServiceNames = [],
  agendamentoId = null,
  pets,
  tutores,
  servicos,
  atendimentos,
  currentUser,
  onCancel,
  onSubmitAtendimento,
}: TelaNovoAtendimentoProps) {
  const [selectedPetId, setSelectedPetId] = useState<string | null>(initialPetId);
  const [buscaPet, setBuscaPet] = useState('');
  const [buscaTutor, setBuscaTutor] = useState('');
  const [appliedPet, setAppliedPet] = useState('');
  const [appliedTutor, setAppliedTutor] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (!initialServiceNames || initialServiceNames.length === 0) return [];
    const normSet = new Set(initialServiceNames.map(normalizeText));
    return servicos.filter((s) => normSet.has(normalizeText(s.nome))).map((s) => s.id);
  });

  const [pulgas, setPulgas] = useState(false);
  const [embaracados, setEmbaracados] = useState(false);
  const [machucados, setMachucados] = useState(false);
  const [observacoesTutor, setObservacoesTutor] = useState('');
  const [autorizaPerfumeLaco, setAutorizaPerfumeLaco] = useState<SimNao>('Não');
  const [funcionarioResponsavel, setFuncionarioResponsavel] = useState(currentUser.nome);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tutorMap = useMemo(() => new Map(tutores.map((t) => [t.id, t])), [tutores]);
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) ?? null,
    [pets, selectedPetId]
  );
  const selectedTutor = selectedPet ? tutorMap.get(selectedPet.tutorId) ?? null : null;

  const filteredPets = useMemo(() => {
    const qPet = normalizeText(appliedPet);
    const qTutor = normalizeText(appliedTutor);
    return pets.filter((pet) => {
      const tutor = tutorMap.get(pet.tutorId);
      const matchPet = !qPet || normalizeText(pet.nome).includes(qPet);
      const matchTutor =
        !qTutor || (tutor ? normalizeText(tutor.nomeCompleto).includes(qTutor) : false);
      return matchPet && matchTutor;
    });
  }, [pets, tutorMap, appliedPet, appliedTutor]);

  const selectedServices = useMemo(
    () => servicos.filter((s) => selectedServiceIds.includes(s.id)),
    [servicos, selectedServiceIds]
  );

  const total = useMemo(() => calculateServicesTotal(selectedServices), [selectedServices]);

  const alertMessages = useMemo(
    () => (selectedPet ? getPetAlertMessages(selectedPet) : []),
    [selectedPet]
  );

  function handleSearchPet(e: React.FormEvent) {
    e.preventDefault();
    setAppliedPet(buscaPet);
    setAppliedTutor(buscaTutor);
    setSearchError(null);
  }

  function handleSelectPetFromSearch(pet: Pet) {
    if (petHasActiveAtendimento(atendimentos, pet.id)) {
      setSearchError('Este pet já tem um atendimento em posse.');
      return;
    }
    setSearchError(null);
    setFormError(null);
    setSelectedPetId(pet.id);
  }

  function toggleService(servicoId: string, checked: boolean) {
    setFormError(null);
    setSelectedServiceIds((prev) =>
      checked ? [...prev, servicoId] : prev.filter((id) => id !== servicoId)
    );
  }

  async function handleRegistrarEntrada() {
    const validation = validateNovoAtendimento(selectedPetId, selectedServiceIds, atendimentos);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }
    if (!selectedPet || !selectedTutor) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmitAtendimento(
        {
          petId: selectedPet.id,
          servicoIds: selectedServiceIds,
          observacoesTutor: observacoesTutor.trim(),
          pulgas,
          embaracados,
          machucados,
          autorizaPerfumeLaco: autorizaPerfumeLaco === 'Sim',
          funcionarioResponsavel: funcionarioResponsavel.trim() || currentUser.nome,
          agendamentoId,
        },
        selectedPet.nome
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar entrada.');
    } finally {
      setSubmitting(false);
    }
  }

  const nowPreview = formatDateTimeBR(new Date());

  return (
    <div>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Novo atendimento
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Escolha os serviços e registre a entrada.
        </p>
      </div>

      {/* Cartão do Pet ou Escolha do Pet */}
      {!selectedPet || !selectedTutor ? (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px] mb-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
            Escolha o pet
          </h2>

          <form onSubmit={handleSearchPet} className="flex flex-col md:flex-row md:items-end gap-[16px] mb-[16px]">
            <div className="w-full md:w-[300px]">
              <label
                htmlFor="novo-atd-busca-pet"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Nome do pet
              </label>
              <input
                id="novo-atd-busca-pet"
                type="text"
                value={buscaPet}
                onChange={(e) => {
                  const v = e.target.value;
                  setBuscaPet(v);
                  if (!v.trim() && !buscaTutor.trim()) {
                    setAppliedPet('');
                    setAppliedTutor('');
                  }
                }}
                className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            <div className="w-full md:w-[300px]">
              <label
                htmlFor="novo-atd-busca-tutor"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Nome do tutor
              </label>
              <input
                id="novo-atd-busca-tutor"
                type="text"
                value={buscaTutor}
                onChange={(e) => {
                  const v = e.target.value;
                  setBuscaTutor(v);
                  if (!buscaPet.trim() && !v.trim()) {
                    setAppliedPet('');
                    setAppliedTutor('');
                  }
                }}
                className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto h-[46px] px-[28px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546]"
            >
              Buscar
            </button>
          </form>

          {searchError && (
            <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mb-[12px]">
              {searchError}
            </p>
          )}

          {filteredPets.length === 0 ? (
            <p className="py-[20px] text-center text-[14px] leading-[20px] text-[#636578]">
              Nenhum pet encontrado.
            </p>
          ) : (
            <div className="divide-y divide-[#A0A1B2]/50 border-t border-[#A0A1B2]/50">
              {filteredPets.map((pet) => {
                const tutor = tutorMap.get(pet.tutorId);
                const emPosse = petHasActiveAtendimento(atendimentos, pet.id);
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => handleSelectPetFromSearch(pet)}
                    className="w-full min-h-[56px] py-2 px-[12px] flex flex-wrap items-center justify-between gap-2 text-left hover:bg-[#FB542B]/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B]"
                  >
                    <div className="flex flex-wrap items-center gap-[8px] sm:gap-[12px]">
                      <span className="text-[14px] font-semibold text-[#343546]">{pet.nome}</span>
                      <span className="text-[14px] text-[#636578]">
                        {pet.raca} · Tutor: {tutor?.nomeCompleto ?? '—'}
                      </span>
                      {hasAlergia(pet) && <AllergyChip />}
                    </div>
                    {emPosse && <StatusChip status="Em posse" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px] mb-[24px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546]">
                {selectedPet.nome} · {selectedPet.raca} · {selectedPet.sexo} · {selectedPet.pesoKg} kg
              </h2>
              <p className="text-[14px] leading-[20px] text-[#343546] mt-[6px]">
                Tutor: {selectedTutor.nomeCompleto} · {selectedTutor.telefone}
              </p>
            </div>
            {!initialPetId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPetId(null);
                  setFormError(null);
                }}
                className="text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline"
              >
                Trocar pet
              </button>
            )}
          </div>

          {alertMessages.length > 0 && (
            <div className="mt-[16px] space-y-[8px]">
              {alertMessages.map((msg) => (
                <AlertBanner key={msg} text={msg} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Duas colunas: Serviços (700px) e Condição na entrada (432px) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,700fr)_minmax(0,432fr)] gap-[24px] items-start">
        {/* Cartão Serviços */}
        <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[12px]">
            Serviços
          </h2>

          <div className="divide-y divide-[#A0A1B2]/50">
            {servicos.map((servico) => {
              const checked = selectedServiceIds.includes(servico.id);
              return (
                <div
                  key={servico.id}
                  className="min-h-[56px] py-2 flex items-center justify-between gap-3"
                >
                  <CustomCheckbox
                    id={`srv-check-${servico.id}`}
                    checked={checked}
                    onChange={(next) => toggleService(servico.id, next)}
                    label={servico.nome}
                  />
                  <span className="text-[14px] leading-[20px] text-[#343546] tabular-nums shrink-0">
                    {formatCurrencyBR(servico.valor)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-[20px] mt-[4px] border-t border-[#A0A1B2]/50 flex items-center justify-between">
            <span className="text-[18px] leading-[24px] font-semibold text-[#343546]">Total</span>
            <span className="text-[30px] sm:text-[36px] leading-[38px] sm:leading-[44px] font-semibold text-[#343546] tabular-nums">
              {formatCurrencyBR(total)}
            </span>
          </div>
        </section>

        {/* Coluna Direita: Condição na entrada + Botões */}
        <div>
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
              Condição na entrada
            </h2>

            <div className="space-y-[12px] mb-[16px]">
              <div>
                <CustomCheckbox
                  id="cond-pulgas"
                  checked={pulgas}
                  onChange={setPulgas}
                  label="Pulgas ou carrapatos"
                />
              </div>
              <div>
                <CustomCheckbox
                  id="cond-embaracados"
                  checked={embaracados}
                  onChange={setEmbaracados}
                  label="Pelos embaraçados"
                />
              </div>
              <div>
                <CustomCheckbox
                  id="cond-machucados"
                  checked={machucados}
                  onChange={setMachucados}
                  label="Machucados ou feridas"
                />
              </div>
            </div>

            <div className="mb-[16px]">
              <label
                htmlFor="novo-atd-obs"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Observações do tutor
              </label>
              <textarea
                id="novo-atd-obs"
                rows={3}
                value={observacoesTutor}
                onChange={(e) => setObservacoesTutor(e.target.value)}
                className="w-full p-[12px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] resize-none focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-[16px]">
              <span className="text-[13px] leading-[18px] font-semibold text-[#343546]">
                Autoriza perfume e laço
              </span>
              <SegmentedToggle<SimNao>
                ariaLabel="Autoriza perfume e laço"
                value={autorizaPerfumeLaco}
                onChange={setAutorizaPerfumeLaco}
                options={[
                  { value: 'Sim', label: 'Sim' },
                  { value: 'Não', label: 'Não' },
                ]}
                className="w-full sm:w-[140px]"
              />
            </div>

            <div className="mb-[12px]">
              <label
                htmlFor="novo-atd-func"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Funcionário responsável
              </label>
              <input
                id="novo-atd-func"
                type="text"
                value={funcionarioResponsavel}
                onChange={(e) => setFuncionarioResponsavel(e.target.value)}
                className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            <p className="text-[12px] leading-[16px] text-[#636578]">
              Entrada: {nowPreview}
              <br />
              (registrada automaticamente)
            </p>
          </section>

          {formError && (
            <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mt-[12px] text-right">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-[12px] mt-[24px]">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegistrarEntrada}
              disabled={submitting}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] disabled:opacity-70"
            >
              {submitting ? 'Registrando...' : 'Registrar entrada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
