import React, { useEffect, useMemo, useState } from 'react';
import type { Atendimento, Pet, Tutor } from '../types';
import {
  calculateAgeYears,
  formatCurrencyBR,
  formatDateBR,
  formatTimeBR,
  hasAlergia,
  normalizeText,
  petHasActiveAtendimento,
} from '../rules/businessRules';
import { StatusChip } from './LayoutChrome';

interface TelaPetsProps {
  pets: Pet[];
  tutores: Tutor[];
  atendimentos: Atendimento[];
  initialSelectedPetId: string | null;
  onCadastrarNovo: () => void;
  onEditarCadastro: (petId: string) => void;
  onNovoAtendimento: (petId: string) => void;
  onShowErrorToast: (msg: string) => void;
}

export function TelaPets({
  pets,
  tutores,
  atendimentos,
  initialSelectedPetId,
  onCadastrarNovo,
  onEditarCadastro,
  onNovoAtendimento,
  onShowErrorToast,
}: TelaPetsProps) {
  const [nomePetInput, setNomePetInput] = useState('');
  const [nomeTutorInput, setNomeTutorInput] = useState('');
  const [appliedPetFilter, setAppliedPetFilter] = useState('');
  const [appliedTutorFilter, setAppliedTutorFilter] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(
    initialSelectedPetId ?? pets[0]?.id ?? null
  );
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null);

  const tutorMap = useMemo(() => new Map(tutores.map((t) => [t.id, t])), [tutores]);

  const resultados = useMemo(() => {
    const qPet = normalizeText(appliedPetFilter);
    const qTutor = normalizeText(appliedTutorFilter);
    return pets.filter((pet) => {
      const tutor = tutorMap.get(pet.tutorId);
      const matchPet = !qPet || normalizeText(pet.nome).includes(qPet);
      const matchTutor =
        !qTutor || (tutor ? normalizeText(tutor.nomeCompleto).includes(qTutor) : false);
      return matchPet && matchTutor;
    });
  }, [pets, tutorMap, appliedPetFilter, appliedTutorFilter]);

  useEffect(() => {
    if (initialSelectedPetId && pets.some((p) => p.id === initialSelectedPetId)) {
      setSelectedPetId(initialSelectedPetId);
    }
  }, [initialSelectedPetId, pets]);

  useEffect(() => {
    if (resultados.length === 0) {
      setSelectedPetId(null);
      return;
    }
    if (!selectedPetId || !resultados.some((p) => p.id === selectedPetId)) {
      setSelectedPetId(resultados[0].id);
    }
  }, [resultados, selectedPetId]);

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setAppliedPetFilter(nomePetInput);
    setAppliedTutorFilter(nomeTutorInput);
    setErroAtendimento(null);
  }

  const selectedPet = useMemo(
    () => resultados.find((p) => p.id === selectedPetId) ?? null,
    [resultados, selectedPetId]
  );
  const selectedTutor = selectedPet ? tutorMap.get(selectedPet.tutorId) ?? null : null;

  const isEmPosse = selectedPet ? petHasActiveAtendimento(atendimentos, selectedPet.id) : false;

  const historico = useMemo(() => {
    if (!selectedPet) return [];
    return atendimentos
      .filter((a) => a.petId === selectedPet.id && a.status === 'Finalizado')
      .sort((a, b) => new Date(b.entradaEm).getTime() - new Date(a.entradaEm).getTime())
      .slice(0, 5);
  }, [atendimentos, selectedPet]);

  function handleClickNovoAtendimento() {
    if (!selectedPet) return;
    if (petHasActiveAtendimento(atendimentos, selectedPet.id)) {
      const msg = 'Este pet já tem um atendimento em posse.';
      setErroAtendimento(msg);
      onShowErrorToast(msg);
      return;
    }
    setErroAtendimento(null);
    onNovoAtendimento(selectedPet.id);
  }

  return (
    <div>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Pets
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Busque pelo nome do pet e do tutor.
        </p>
      </div>

      {/* Cartão de busca */}
      <form
        onSubmit={handleBuscar}
        className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px] mb-[24px] flex flex-col lg:flex-row lg:items-end lg:justify-between gap-[16px]"
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-[12px] sm:gap-[16px] flex-1">
          <div className="w-full lg:w-[260px]">
            <label
              htmlFor="pets-busca-pet"
              className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
            >
              Nome do pet
            </label>
            <input
              id="pets-busca-pet"
              type="text"
              value={nomePetInput}
              onChange={(e) => {
                const v = e.target.value;
                setNomePetInput(v);
                if (!v.trim() && !nomeTutorInput.trim()) {
                  setAppliedPetFilter('');
                  setAppliedTutorFilter('');
                }
              }}
              className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
            />
          </div>

          <div className="w-full lg:w-[260px]">
            <label
              htmlFor="pets-busca-tutor"
              className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
            >
              Nome do tutor
            </label>
            <input
              id="pets-busca-tutor"
              type="text"
              value={nomeTutorInput}
              onChange={(e) => {
                const v = e.target.value;
                setNomeTutorInput(v);
                if (!nomePetInput.trim() && !v.trim()) {
                  setAppliedPetFilter('');
                  setAppliedTutorFilter('');
                }
              }}
              className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto h-[46px] px-[28px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] shrink-0"
          >
            Buscar
          </button>
        </div>

        <button
          type="button"
          onClick={onCadastrarNovo}
          className="w-full lg:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] shrink-0"
        >
          Cadastrar novo pet
        </button>
      </form>

      {/* Resultados e Ficha */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440fr)_minmax(0,692fr)] gap-[24px] items-start">
        {/* Resultados (440px) */}
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
            Resultados
          </h2>

          {resultados.length === 0 ? (
            <div className="py-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
              Nenhum pet encontrado.
            </div>
          ) : (
            <div className="flex flex-col">
              {resultados.map((pet, idx) => {
                const tutor = tutorMap.get(pet.tutorId);
                const selected = pet.id === selectedPetId;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => {
                      setSelectedPetId(pet.id);
                      setErroAtendimento(null);
                    }}
                    className={`w-full text-left px-[16px] py-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] ${
                      selected
                        ? 'bg-[#FB542B]/14 rounded-[12px]'
                        : 'hover:bg-[#F0F0F0]/60 rounded-[12px]'
                    } ${
                      !selected && idx < resultados.length - 1
                        ? 'border-b border-[#A0A1B2]/50 rounded-b-none'
                        : ''
                    }`}
                  >
                    <div className="text-[14px] leading-[20px] font-semibold text-[#343546]">
                      {pet.nome}
                    </div>
                    <div className="text-[14px] leading-[20px] text-[#636578] mt-[2px]">
                      {tutor?.nomeCompleto ?? '—'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Ficha do pet (692px) */}
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          {!selectedPet || !selectedTutor ? (
            <div className="py-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
              Nenhum pet selecionado.
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-[16px]">
                <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546]">
                  {selectedPet.nome}
                </h2>
                {isEmPosse && <StatusChip status="Em posse" />}
              </div>

              <div className="space-y-[10px] text-[14px] leading-[20px] text-[#343546]">
                <p>
                  {selectedPet.raca} · {selectedPet.sexo} ·{' '}
                  {(() => {
                    const age = calculateAgeYears(selectedPet.dataNascimento);
                    return `${age} ${age === 1 ? 'ano' : 'anos'}`;
                  })()}{' '}
                  · {selectedPet.pesoKg} kg · Porte {selectedPet.porte.toLowerCase()}
                </p>
                <p>
                  Tutor: {selectedTutor.nomeCompleto} · {selectedTutor.telefone}
                </p>
                <p>
                  Alergias: {hasAlergia(selectedPet) ? selectedPet.saude.alergias : 'nenhuma'}
                </p>
                <p>
                  Autorizados a retirar:{' '}
                  {selectedPet.pessoasAutorizadas
                    .map((pa) => (pa.ehTutor ? `${pa.nome} (tutor)` : pa.nome))
                    .join(', ')}
                </p>
              </div>

              <hr className="border-0 border-t border-[#A0A1B2]/50 my-[20px]" />

              <h3 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[12px]">
                Histórico
              </h3>

              {historico.length === 0 ? (
                <p className="py-[16px] text-center text-[14px] leading-[20px] text-[#636578]">
                  Sem atendimentos anteriores.
                </p>
              ) : (
                <div className="space-y-[10px] text-[14px] leading-[20px] text-[#343546] mb-[24px]">
                  {historico.map((item) => (
                    <p key={item.id}>
                      {formatDateBR(item.entradaEm)} ·{' '}
                      {item.itens.map((i) => i.nome).join(', ')} ·{' '}
                      {formatTimeBR(item.entradaEm)} às{' '}
                      {item.saidaEm ? formatTimeBR(item.saidaEm) : '—'} ·{' '}
                      {formatCurrencyBR(item.valorTotal)}
                    </p>
                  ))}
                </div>
              )}

              {erroAtendimento && (
                <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mb-[12px]">
                  {erroAtendimento}
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[12px] mt-[20px]">
                <button
                  type="button"
                  onClick={handleClickNovoAtendimento}
                  className="h-[46px] px-[24px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546]"
                >
                  Novo atendimento
                </button>
                <button
                  type="button"
                  onClick={() => onEditarCadastro(selectedPet.id)}
                  className="h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B]"
                >
                  Editar cadastro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
