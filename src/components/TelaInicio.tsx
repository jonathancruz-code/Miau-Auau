import React, { useMemo, useState } from 'react';
import type { Agendamento, Atendimento, Pet, Tutor } from '../types';
import {
  formatCurrencyBR,
  formatLongDateBR,
  formatTimeBR,
  getTodayDateInput,
  hasAlergia,
  normalizeText,
  toLocalDateKey,
} from '../rules/businessRules';
import { AllergyChip, SegmentedToggle, StatusChip } from './LayoutChrome';

interface TelaInicioProps {
  atendimentos: Atendimento[];
  agendamentos: Agendamento[];
  pets: Pet[];
  tutores: Tutor[];
  onAbrirAgenda: () => void;
  onNovoAtendimento: () => void;
  onAbrirRetirada: (atendimentoId: string) => void;
}

type FiltroStatus = 'Todos' | 'Em posse' | 'Finalizado';

export function TelaInicio({
  atendimentos,
  agendamentos,
  pets,
  tutores,
  onAbrirAgenda,
  onNovoAtendimento,
  onAbrirRetirada,
}: TelaInicioProps) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('Todos');

  const now = new Date();
  const todayKey = getTodayDateInput(now);
  const longDate = formatLongDateBR(now);

  const atendimentosHoje = useMemo(() => {
    return atendimentos
      .filter((a) => toLocalDateKey(a.entradaEm) === todayKey)
      .sort((a, b) => new Date(b.entradaEm).getTime() - new Date(a.entradaEm).getTime());
  }, [atendimentos, todayKey]);

  const emPosseCount = useMemo(
    () => atendimentosHoje.filter((a) => a.status === 'Em posse').length,
    [atendimentosHoje]
  );

  const finalizadosCount = useMemo(
    () => atendimentosHoje.filter((a) => a.status === 'Finalizado').length,
    [atendimentosHoje]
  );

  const agendadosHojeCount = useMemo(
    () => agendamentos.filter((ag) => ag.data === todayKey && ag.status === 'Agendado').length,
    [agendamentos, todayKey]
  );

  const petMap = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);
  const tutorMap = useMemo(() => new Map(tutores.map((t) => [t.id, t])), [tutores]);

  const listaFiltrada = useMemo(() => {
    const query = normalizeText(busca);
    return atendimentosHoje.filter((a) => {
      if (filtro !== 'Todos' && a.status !== filtro) return false;
      if (!query) return true;
      const pet = petMap.get(a.petId);
      const tutor = tutorMap.get(a.tutorId);
      const petMatch = pet ? normalizeText(pet.nome).includes(query) : false;
      const tutorMatch = tutor ? normalizeText(tutor.nomeCompleto).includes(query) : false;
      return petMatch || tutorMatch;
    });
  }, [atendimentosHoje, busca, filtro, petMap, tutorMap]);

  return (
    <div>
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-[16px] mb-[24px]">
        <div>
          <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
            Atendimentos do dia
          </h1>
          <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">{longDate}</p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-[12px] sm:pt-[6px]">
          <button
            type="button"
            onClick={onAbrirAgenda}
            className="h-[46px] px-[16px] sm:px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] sm:text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] whitespace-nowrap"
          >
            Agendar
          </button>
          <button
            type="button"
            onClick={onNovoAtendimento}
            className="h-[46px] px-[16px] sm:px-[24px] rounded-[10px] bg-[#FB542B] text-[14px] sm:text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] whitespace-nowrap"
          >
            Novo atendimento
          </button>
        </div>
      </div>

      {/* Resumo: 3 cartões */}
      <div className="grid grid-cols-3 gap-[10px] sm:gap-[16px] md:gap-[24px] mb-[24px]">
        <div className="min-h-[96px] md:h-[110px] bg-[#FFFFFF] rounded-[16px] md:rounded-[24px] p-[14px] sm:p-[18px] md:p-[24px] flex flex-col justify-between">
          <span className="text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] text-[#636578]">
            Em posse
          </span>
          <span className="text-[28px] sm:text-[36px] leading-[34px] sm:leading-[44px] font-semibold text-[#343546] tabular-nums">
            {emPosseCount}
          </span>
        </div>
        <div className="min-h-[96px] md:h-[110px] bg-[#FFFFFF] rounded-[16px] md:rounded-[24px] p-[14px] sm:p-[18px] md:p-[24px] flex flex-col justify-between">
          <span className="text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] text-[#636578]">
            Finalizados
          </span>
          <span className="text-[28px] sm:text-[36px] leading-[34px] sm:leading-[44px] font-semibold text-[#343546] tabular-nums">
            {finalizadosCount}
          </span>
        </div>
        <div className="min-h-[96px] md:h-[110px] bg-[#FFFFFF] rounded-[16px] md:rounded-[24px] p-[14px] sm:p-[18px] md:p-[24px] flex flex-col justify-between">
          <span className="text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] text-[#636578]">
            Agendados hoje
          </span>
          <span className="text-[28px] sm:text-[36px] leading-[34px] sm:leading-[44px] font-semibold text-[#343546] tabular-nums">
            {agendadosHojeCount}
          </span>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[12px] md:gap-[24px] mb-[20px]">
          <div className="w-full md:w-[410px]">
            <label htmlFor="inicio-busca" className="sr-only">
              Buscar por pet ou tutor
            </label>
            <input
              id="inicio-busca"
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pet ou tutor"
              className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] placeholder:text-[#636578] focus:outline-none focus:border-[#FB542B]"
            />
          </div>

          <SegmentedToggle<FiltroStatus>
            ariaLabel="Filtrar atendimentos por status"
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: 'Todos', label: 'Todos' },
              { value: 'Em posse', label: 'Em posse' },
              { value: 'Finalizado', label: 'Finalizados' },
            ]}
            className="w-full md:w-[420px]"
          />
        </div>

        {listaFiltrada.length === 0 ? (
          <div className="py-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
            Nenhum atendimento hoje.
          </div>
        ) : (
          <>
            {/* Visão mobile em cartões */}
            <div className="md:hidden divide-y divide-[#A0A1B2]/50">
              {listaFiltrada.map((atd) => {
                const pet = petMap.get(atd.petId);
                const tutor = tutorMap.get(atd.tutorId);
                const showAllergyChip = pet ? hasAlergia(pet) : false;
                return (
                  <div key={atd.id} className="py-[14px] first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-[10px] mb-[6px]">
                      <div className="flex items-center flex-wrap gap-[8px] min-w-0">
                        <span className="text-[15px] leading-[20px] font-semibold text-[#343546]">
                          {pet?.nome ?? '—'}
                        </span>
                        {showAllergyChip && <AllergyChip />}
                      </div>
                      <StatusChip status={atd.status} />
                    </div>

                    <p className="text-[13px] leading-[18px] text-[#636578] mb-[4px]">
                      Tutor: {tutor?.nomeCompleto ?? '—'}
                    </p>
                    <p className="text-[13px] leading-[18px] text-[#343546] mb-[10px]">
                      {atd.itens.map((i) => i.nome).join(', ')}
                    </p>

                    <div className="flex items-center justify-between gap-[12px]">
                      <div className="text-[13px] leading-[18px] text-[#636578] tabular-nums">
                        <span>Entrada {formatTimeBR(atd.entradaEm)}</span>
                        {atd.saidaEm && <span> · Saída {formatTimeBR(atd.saidaEm)}</span>}
                        <span className="text-[#343546] font-semibold">
                          {' · '}
                          {formatCurrencyBR(atd.valorTotal)}
                        </span>
                      </div>

                      {atd.status === 'Em posse' && (
                        <button
                          type="button"
                          onClick={() => onAbrirRetirada(atd.id)}
                          className="min-h-[44px] px-2 -mr-2 inline-flex items-center text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px]"
                          aria-label={`Retirada de ${pet?.nome ?? 'pet'} (${tutor?.nomeCompleto ?? ''})`}
                        >
                          Retirada
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visão desktop em tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="h-[44px] border-b border-[#A0A1B2]/50 text-left">
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Pet
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Tutor
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Serviços
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Entrada
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Saída
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Valor
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] pr-4">
                      Status
                    </th>
                    <th className="text-[12px] leading-[16px] font-semibold text-[#636578] text-right">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((atd, index) => {
                    const pet = petMap.get(atd.petId);
                    const tutor = tutorMap.get(atd.tutorId);
                    const showAllergyChip = pet ? hasAlergia(pet) : false;
                    const isLast = index === listaFiltrada.length - 1;
                    return (
                      <tr
                        key={atd.id}
                        className={`h-[56px] text-[14px] leading-[20px] text-[#343546] ${
                          isLast ? '' : 'border-b border-[#A0A1B2]/50'
                        }`}
                      >
                        <td className="pr-4 font-semibold whitespace-nowrap">
                          <div className="inline-flex items-center gap-[10px]">
                            <span>{pet?.nome ?? '—'}</span>
                            {showAllergyChip && <AllergyChip />}
                          </div>
                        </td>
                        <td className="pr-4 whitespace-nowrap">{tutor?.nomeCompleto ?? '—'}</td>
                        <td className="pr-4">{atd.itens.map((i) => i.nome).join(', ')}</td>
                        <td className="pr-4 whitespace-nowrap tabular-nums">
                          {formatTimeBR(atd.entradaEm)}
                        </td>
                        <td className="pr-4 whitespace-nowrap tabular-nums">
                          {atd.saidaEm ? formatTimeBR(atd.saidaEm) : '—'}
                        </td>
                        <td className="pr-4 whitespace-nowrap tabular-nums">
                          {formatCurrencyBR(atd.valorTotal)}
                        </td>
                        <td className="pr-4 whitespace-nowrap">
                          <StatusChip status={atd.status} />
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {atd.status === 'Em posse' ? (
                            <button
                              type="button"
                              onClick={() => onAbrirRetirada(atd.id)}
                              className="text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px] px-1"
                              aria-label={`Retirada de ${pet?.nome ?? 'pet'} (${tutor?.nomeCompleto ?? ''})`}
                            >
                              Retirada
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
