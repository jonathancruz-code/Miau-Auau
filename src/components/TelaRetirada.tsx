import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { Atendimento, Pet, Tutor } from '../types';
import {
  formatCurrencyBR,
  formatDateTimeBR,
  normalizeText,
  validateRetirada,
} from '../rules/businessRules';
import { CustomCheckbox, OverlayModal, StatusChip } from './LayoutChrome';

interface TelaRetiradaProps {
  initialAtendimentoId: string | null;
  atendimentos: Atendimento[];
  pets: Pet[];
  tutores: Tutor[];
  onFinalizarAtendimento: (
    atendimentoId: string,
    autorizadoId: string,
    documentoConferido: boolean,
    petNome: string
  ) => Promise<void>;
}

export function TelaRetirada({
  initialAtendimentoId,
  atendimentos,
  pets,
  tutores,
  onFinalizarAtendimento,
}: TelaRetiradaProps) {
  const petMap = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);
  const tutorMap = useMemo(() => new Map(tutores.map((t) => [t.id, t])), [tutores]);

  const activeAtendimentos = useMemo(
    () =>
      atendimentos
        .filter((a) => a.status === 'Em posse')
        .sort((a, b) => new Date(b.entradaEm).getTime() - new Date(a.entradaEm).getTime()),
    [atendimentos]
  );

  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(
    initialAtendimentoId
  );
  const [nomePetInput, setNomePetInput] = useState(() => {
    if (!initialAtendimentoId) return '';
    const atd = atendimentos.find((a) => a.id === initialAtendimentoId);
    return atd ? petMap.get(atd.petId)?.nome ?? '' : '';
  });
  const [nomeTutorInput, setNomeTutorInput] = useState(() => {
    if (!initialAtendimentoId) return '';
    const atd = atendimentos.find((a) => a.id === initialAtendimentoId);
    return atd ? tutorMap.get(atd.tutorId)?.nomeCompleto ?? '' : '';
  });

  const [searchResults, setSearchResults] = useState<Atendimento[] | null>(null);
  const [hasSearched, setHasSearched] = useState(Boolean(initialAtendimentoId));

  const [selectedAutorizadoId, setSelectedAutorizadoId] = useState<string | null>(null);
  const [outraPessoaSelected, setOutraPessoaSelected] = useState(false);
  const [modalRecusaOpen, setModalRecusaOpen] = useState(false);
  const [documentoConferido, setDocumentoConferido] = useState(false);
  const [erroRetirada, setErroRetirada] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialAtendimentoId) {
      setSelectedAtendimentoId(initialAtendimentoId);
      const atd = atendimentos.find((a) => a.id === initialAtendimentoId);
      if (atd) {
        setNomePetInput(petMap.get(atd.petId)?.nome ?? '');
        setNomeTutorInput(tutorMap.get(atd.tutorId)?.nomeCompleto ?? '');
      }
      setSearchResults(null);
      setHasSearched(true);
      setSelectedAutorizadoId(null);
      setOutraPessoaSelected(false);
      setDocumentoConferido(false);
      setErroRetirada(null);
    }
  }, [initialAtendimentoId, atendimentos, petMap, tutorMap]);

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const qPet = normalizeText(nomePetInput);
    const qTutor = normalizeText(nomeTutorInput);

    const matches = activeAtendimentos.filter((a) => {
      const pet = petMap.get(a.petId);
      const tutor = tutorMap.get(a.tutorId);
      const matchPet = !qPet || (pet ? normalizeText(pet.nome).includes(qPet) : false);
      const matchTutor =
        !qTutor || (tutor ? normalizeText(tutor.nomeCompleto).includes(qTutor) : false);
      return matchPet && matchTutor;
    });

    setHasSearched(true);
    setSelectedAutorizadoId(null);
    setOutraPessoaSelected(false);
    setDocumentoConferido(false);
    setErroRetirada(null);

    if (matches.length === 1) {
      setSelectedAtendimentoId(matches[0].id);
      setSearchResults(null);
    } else if (matches.length > 1) {
      setSelectedAtendimentoId(null);
      setSearchResults(matches);
    } else {
      setSelectedAtendimentoId(null);
      setSearchResults([]);
    }
  }

  const currentAtendimento = useMemo(
    () => activeAtendimentos.find((a) => a.id === selectedAtendimentoId) ?? null,
    [activeAtendimentos, selectedAtendimentoId]
  );
  const currentPet = currentAtendimento ? petMap.get(currentAtendimento.petId) ?? null : null;
  const currentTutor = currentAtendimento
    ? tutorMap.get(currentAtendimento.tutorId) ?? null
    : null;

  function handleSelectOutraPessoa() {
    setSelectedAutorizadoId(null);
    setOutraPessoaSelected(true);
    setModalRecusaOpen(true);
    setErroRetirada(null);
  }

  function handleCloseRecusaModal() {
    setModalRecusaOpen(false);
    setOutraPessoaSelected(false);
  }

  async function handleFinalizar() {
    if (!currentAtendimento || !currentPet) return;
    const validation = validateRetirada(selectedAutorizadoId, documentoConferido);
    if (!validation.ok) {
      setErroRetirada(validation.error);
      return;
    }
    if (!selectedAutorizadoId) return;
    setSubmitting(true);
    setErroRetirada(null);
    try {
      await onFinalizarAtendimento(
        currentAtendimento.id,
        selectedAutorizadoId,
        documentoConferido,
        currentPet.nome
      );
    } catch (err) {
      setErroRetirada(err instanceof Error ? err.message : 'Erro ao finalizar atendimento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Retirada
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Busque o atendimento ativo pelo nome do pet e do tutor.
        </p>
      </div>

      {/* Cartão de busca */}
      <form
        onSubmit={handleBuscar}
        className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px] mb-[24px] flex flex-col md:flex-row md:items-end gap-[16px]"
      >
        <div className="w-full md:flex-1">
          <label
            htmlFor="retirada-busca-pet"
            className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
          >
            Nome do pet
          </label>
          <input
            id="retirada-busca-pet"
            type="text"
            value={nomePetInput}
            onChange={(e) => setNomePetInput(e.target.value)}
            className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
          />
        </div>

        <div className="w-full md:flex-1">
          <label
            htmlFor="retirada-busca-tutor"
            className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
          >
            Nome do tutor
          </label>
          <input
            id="retirada-busca-tutor"
            type="text"
            value={nomeTutorInput}
            onChange={(e) => setNomeTutorInput(e.target.value)}
            className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] focus:outline-none focus:border-[#FB542B]"
          />
        </div>

        <button
          type="submit"
          className="w-full md:w-auto h-[46px] px-[44px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546]"
        >
          Buscar
        </button>
      </form>

      {/* Lista de múltiplos resultados ou nenhum resultado */}
      {!currentAtendimento && hasSearched && searchResults && searchResults.length === 0 && (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
          Nenhum atendimento em posse encontrado.
        </div>
      )}

      {!currentAtendimento && searchResults && searchResults.length > 1 && (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px] mb-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[12px]">
            Atendimentos em posse encontrados
          </h2>
          <div className="divide-y divide-[#A0A1B2]/50">
            {searchResults.map((atd) => {
              const pet = petMap.get(atd.petId);
              const tutor = tutorMap.get(atd.tutorId);
              return (
                <button
                  key={atd.id}
                  type="button"
                  onClick={() => {
                    setSelectedAtendimentoId(atd.id);
                    setSearchResults(null);
                  }}
                  className="w-full min-h-[56px] py-2 px-[12px] flex flex-wrap items-center justify-between gap-2 text-left hover:bg-[#FB542B]/10 rounded-[10px] transition-colors"
                >
                  <span className="text-[14px] font-semibold text-[#343546]">
                    {pet?.nome ?? '—'} · {pet?.raca ?? ''} · Tutor: {tutor?.nomeCompleto ?? '—'}
                  </span>
                  <StatusChip status="Em posse" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!currentAtendimento && !hasSearched && activeAtendimentos.length > 0 && (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[12px]">
            Atendimentos em posse
          </h2>
          <div className="divide-y divide-[#A0A1B2]/50">
            {activeAtendimentos.map((atd) => {
              const pet = petMap.get(atd.petId);
              const tutor = tutorMap.get(atd.tutorId);
              return (
                <button
                  key={atd.id}
                  type="button"
                  onClick={() => {
                    setSelectedAtendimentoId(atd.id);
                    setNomePetInput(pet?.nome ?? '');
                    setNomeTutorInput(tutor?.nomeCompleto ?? '');
                    setHasSearched(true);
                  }}
                  className="w-full min-h-[56px] py-2 px-[12px] flex flex-wrap items-center justify-between gap-2 text-left hover:bg-[#FB542B]/10 rounded-[10px] transition-colors"
                >
                  <span className="text-[14px] font-semibold text-[#343546]">
                    {pet?.nome ?? '—'} · {pet?.raca ?? ''} · Tutor: {tutor?.nomeCompleto ?? '—'}
                  </span>
                  <StatusChip status="Em posse" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!currentAtendimento && !hasSearched && activeAtendimentos.length === 0 && (
        <div className="bg-[#FFFFFF] rounded-[24px] p-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
          Nenhum atendimento em posse encontrado.
        </div>
      )}

      {/* Atendimento carregado */}
      {currentAtendimento && currentPet && currentTutor && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,700fr)_minmax(0,432fr)] gap-[24px] items-start">
          {/* Cartão esquerdo (700px) */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <div className="flex items-center justify-between mb-[16px]">
              <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546]">
                Atendimento em posse
              </h2>
              <StatusChip status="Em posse" />
            </div>

            <p className="text-[14px] leading-[20px] text-[#343546] mb-[6px]">
              {currentPet.nome} · {currentPet.raca} · Tutor: {currentTutor.nomeCompleto}
            </p>
            <p className="text-[14px] leading-[20px] text-[#636578] mb-[20px]">
              Entrada: {formatDateTimeBR(currentAtendimento.entradaEm)}
            </p>

            <div className="border-t border-[#A0A1B2]/50 divide-y divide-[#A0A1B2]/50">
              {currentAtendimento.itens.map((item) => (
                <div
                  key={item.servicoId}
                  className="h-[56px] flex items-center justify-between text-[14px] leading-[20px] text-[#343546]"
                >
                  <span>{item.nome}</span>
                  <span>{formatCurrencyBR(item.valor)}</span>
                </div>
              ))}
            </div>

            <div className="pt-[20px] border-t border-[#A0A1B2]/50 flex items-center justify-between">
              <span className="text-[18px] leading-[24px] font-semibold text-[#343546]">
                Total
              </span>
              <span className="text-[30px] sm:text-[36px] leading-[38px] sm:leading-[44px] font-semibold text-[#343546] tabular-nums">
                {formatCurrencyBR(currentAtendimento.valorTotal)}
              </span>
            </div>

            <p className="text-[12px] leading-[16px] text-[#636578] mt-[16px]">
              O pagamento é feito fora do sistema.
            </p>
          </section>

          {/* Cartão direito (432px) */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[20px]">
              Quem está retirando?
            </h2>

            <div className="space-y-[12px] sm:space-y-[16px] mb-[20px]" role="radiogroup" aria-label="Pessoa que está retirando">
              {currentPet.pessoasAutorizadas.map((pa) => {
                const selected = selectedAutorizadoId === pa.id;
                const label = `${pa.nome} (${pa.ehTutor ? 'tutor' : 'autorizada'})`;
                return (
                  <label
                    key={pa.id}
                    className="flex items-center gap-[12px] min-h-[44px] sm:min-h-0 cursor-pointer text-[14px] leading-[20px] text-[#343546]"
                  >
                    <span className="relative inline-flex items-center justify-center w-[20px] h-[20px] shrink-0">
                      <input
                        type="radio"
                        name="quem-retira"
                        checked={selected}
                        onChange={() => {
                          setSelectedAutorizadoId(pa.id);
                          setOutraPessoaSelected(false);
                          setErroRetirada(null);
                        }}
                        className="peer absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer m-0"
                      />
                      <span
                        aria-hidden="true"
                        className={`w-[20px] h-[20px] rounded-full border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#FB542B] ${
                          selected
                            ? 'bg-[#FB542B] border-[#FB542B]'
                            : 'bg-[#FFFFFF] border-[#A0A1B2]'
                        }`}
                      >
                        {selected && <Check size={14} strokeWidth={2.5} className="text-[#343546]" />}
                      </span>
                    </span>
                    <span>{label}</span>
                  </label>
                );
              })}

              <label className="flex items-center gap-[12px] min-h-[44px] sm:min-h-0 cursor-pointer text-[14px] leading-[20px] text-[#343546]">
                <span className="relative inline-flex items-center justify-center w-[20px] h-[20px] shrink-0">
                  <input
                    type="radio"
                    name="quem-retira"
                    checked={outraPessoaSelected}
                    onChange={handleSelectOutraPessoa}
                    className="peer absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer m-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`w-[20px] h-[20px] rounded-full border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#FB542B] ${
                      outraPessoaSelected
                        ? 'bg-[#FB542B] border-[#FB542B]'
                        : 'bg-[#FFFFFF] border-[#A0A1B2]'
                    }`}
                  >
                    {outraPessoaSelected && (
                      <Check size={14} strokeWidth={2.5} className="text-[#343546]" />
                    )}
                  </span>
                </span>
                <span>Outra pessoa</span>
              </label>
            </div>

            <hr className="border-0 border-t border-[#A0A1B2]/50 my-[20px]" />

            <div className="mb-[20px]">
              <CustomCheckbox
                id="retirada-doc-conferido"
                checked={documentoConferido}
                onChange={(checked) => {
                  setDocumentoConferido(checked);
                  setErroRetirada(null);
                }}
                label="Documento conferido"
                className="min-h-[44px] sm:min-h-0"
              />
            </div>

            {erroRetirada && (
              <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mb-[14px]">
                {erroRetirada}
              </p>
            )}

            <button
              type="button"
              onClick={handleFinalizar}
              disabled={submitting}
              className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] disabled:opacity-70"
            >
              {submitting ? 'Finalizando...' : 'Finalizar atendimento'}
            </button>
          </section>
        </div>
      )}

      {/* Tela 09: Janela de Retirada Recusada */}
      <OverlayModal
        open={modalRecusaOpen && Boolean(currentPet && currentTutor)}
        showWarningIcon
        title="Retirada não autorizada"
        description={
          currentPet && currentTutor
            ? `Essa pessoa não está na lista de autorizados de ${currentPet.nome}. Não entregue o animal. Avise o tutor: ${currentTutor.telefone}.`
            : ''
        }
        onClose={handleCloseRecusaModal}
        singleButtonLabel="Entendi"
      />
    </div>
  );
}
