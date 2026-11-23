import React, { useMemo, useState } from 'react';
import type { Agendamento, Servico } from '../types';
import {
  formatDateBR,
  getAvailableTimeSlots,
  getTodayDateInput,
  getTomorrowDateInput,
  isTimeSlotOccupied,
  validateAgendamento,
} from '../rules/businessRules';
import { OverlayModal } from './LayoutChrome';

export interface CreateAgendamentoPayload {
  petNome: string;
  tutorNome: string;
  servicos: string[];
  data: string;
  hora: string;
}

interface TelaAgendaProps {
  agendamentos: Agendamento[];
  servicos: Servico[];
  onCreateAgendamento: (payload: CreateAgendamentoPayload) => Promise<void>;
  onCancelAgendamento: (agendamentoId: string) => Promise<void>;
  onReceberAgendamento: (ag: Agendamento) => void;
}

export function TelaAgenda({
  agendamentos,
  servicos,
  onCreateAgendamento,
  onCancelAgendamento,
  onReceberAgendamento,
}: TelaAgendaProps) {
  const todayStr = getTodayDateInput();
  const tomorrowStr = getTomorrowDateInput();
  const allSlots = useMemo(() => getAvailableTimeSlots(), []);

  const firstFreeForDate = (targetDate: string) => {
    const free = allSlots.find((slot) => !isTimeSlotOccupied(agendamentos, targetDate, slot));
    return free ?? allSlots[0];
  };

  const [petNome, setPetNome] = useState('');
  const [tutorNome, setTutorNome] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [data, setData] = useState(tomorrowStr);
  const [hora, setHora] = useState(() => firstFreeForDate(tomorrowStr));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<Agendamento | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function toggleService(nome: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.servicos;
      return next;
    });
    setSelectedServices((prev) =>
      prev.includes(nome) ? prev.filter((s) => s !== nome) : [...prev, nome]
    );
  }

  function handleDateChange(newDate: string) {
    setData(newDate);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.data;
      delete next.hora;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAgendamento(
      { petNome, tutorNome, servicos: selectedServices, data, hora },
      agendamentos,
      todayStr
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onCreateAgendamento({
        petNome: petNome.trim(),
        tutorNome: tutorNome.trim(),
        servicos: [...selectedServices],
        data,
        hora,
      });
      setPetNome('');
      setTutorNome('');
      setSelectedServices([]);
      setData(tomorrowStr);
      const nextFree = allSlots.find(
        (slot) =>
          !(data === tomorrowStr && slot === hora) &&
          !isTimeSlotOccupied(agendamentos, tomorrowStr, slot)
      );
      setHora(nextFree ?? allSlots[0]);
      setErrors({});
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Erro ao salvar agendamento.' });
    } finally {
      setSubmitting(false);
    }
  }

  const upcomingGroups = useMemo(() => {
    const active = agendamentos
      .filter((a) => a.status === 'Agendado' && a.data >= todayStr)
      .sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return a.hora.localeCompare(b.hora);
      });

    const groups: Array<{ dateKey: string; label: string; items: Agendamento[] }> = [];
    for (const item of active) {
      let group = groups.find((g) => g.dateKey === item.data);
      if (!group) {
        const label =
          item.data === todayStr
            ? 'Hoje'
            : item.data === tomorrowStr
            ? 'Amanhã'
            : formatDateBR(item.data);
        group = { dateKey: item.data, label, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [agendamentos, todayStr, tomorrowStr]);

  return (
    <div>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Agenda
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Registre os horários combinados com o tutor pelo WhatsApp.
        </p>
      </div>

      {/* Duas colunas: Novo agendamento (480px) + Próximos horários (652px) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,480fr)_minmax(0,652fr)] gap-[24px] items-start">
        {/* Cartão esquerdo (480px) */}
        <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[20px]">
            Novo agendamento
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-[16px]">
            <div>
              <label
                htmlFor="agenda-pet"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Nome do pet
              </label>
              <input
                id="agenda-pet"
                type="text"
                value={petNome}
                onChange={(e) => {
                  setPetNome(e.target.value);
                  setErrors((p) => ({ ...p, petNome: '' }));
                }}
                className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                  errors.petNome ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                }`}
              />
              {errors.petNome && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                  {errors.petNome}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="agenda-tutor"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Nome do tutor
              </label>
              <input
                id="agenda-tutor"
                type="text"
                value={tutorNome}
                onChange={(e) => {
                  setTutorNome(e.target.value);
                  setErrors((p) => ({ ...p, tutorNome: '' }));
                }}
                className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                  errors.tutorNome ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                }`}
              />
              {errors.tutorNome && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                  {errors.tutorNome}
                </p>
              )}
            </div>

            <div>
              <span className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[10px]">
                Serviços
              </span>
              <div className="flex flex-wrap gap-[8px]">
                {servicos.map((srv) => {
                  const active = selectedServices.includes(srv.nome);
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleService(srv.nome)}
                      className={`h-[34px] px-[14px] rounded-full text-[13px] leading-[18px] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] ${
                        active
                          ? 'bg-[#FB542B] border-[#FB542B] text-[#343546] font-semibold'
                          : 'bg-[#FFFFFF] border-[#A0A1B2] text-[#343546] font-normal hover:bg-[#F0F0F0]'
                      }`}
                    >
                      {srv.nome}
                    </button>
                  );
                })}
              </div>
              {errors.servicos && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[6px]">
                  {errors.servicos}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div>
                <label
                  htmlFor="agenda-data"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Data
                </label>
                <input
                  id="agenda-data"
                  type="date"
                  value={data}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                    errors.data ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                  }`}
                />
                {errors.data && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.data}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="agenda-hora"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Horário
                </label>
                <select
                  id="agenda-hora"
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    setErrors((p) => ({ ...p, hora: '' }));
                  }}
                  className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                    errors.hora ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                  }`}
                >
                  {allSlots.map((slot) => {
                    const occupied = data ? isTimeSlotOccupied(agendamentos, data, slot) : false;
                    return (
                      <option key={slot} value={slot}>
                        {occupied ? `${slot} (ocupado)` : slot}
                      </option>
                    );
                  })}
                </select>
                {errors.hora && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.hora}
                  </p>
                )}
              </div>
            </div>

            {errors.submit && (
              <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12]">
                {errors.submit}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] mt-[8px] disabled:opacity-70"
            >
              {submitting ? 'Salvando...' : 'Salvar agendamento'}
            </button>
          </form>
        </section>

        {/* Cartão direito (652px) */}
        <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
            Próximos horários
          </h2>

          {upcomingGroups.length === 0 ? (
            <div className="py-[40px] text-center text-[14px] leading-[20px] text-[#636578]">
              Nenhum horário agendado.
            </div>
          ) : (
            <div className="space-y-[24px]">
              {upcomingGroups.map((group) => (
                <div key={group.dateKey}>
                  <h3 className="text-[12px] leading-[16px] font-semibold text-[#636578] mb-[8px]">
                    {group.label}
                  </h3>
                  <div className="divide-y divide-[#A0A1B2]/50">
                    {group.items.map((ag) => (
                      <div
                        key={ag.id}
                        className="py-[14px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[10px] sm:gap-[16px]"
                      >
                        <div className="flex items-start gap-[16px] sm:gap-[24px]">
                          <span className="text-[18px] leading-[24px] font-semibold text-[#343546] w-[54px] sm:w-[58px] shrink-0 tabular-nums">
                            {ag.hora}
                          </span>
                          <div>
                            <div className="text-[14px] leading-[20px] font-semibold text-[#343546]">
                              {ag.petNome} · {ag.tutorNome}
                            </div>
                            <div className="text-[14px] leading-[20px] text-[#636578] mt-[2px]">
                              {ag.servicos.join(', ')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end gap-[20px] sm:gap-[6px] pl-[70px] sm:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => onReceberAgendamento(ag)}
                            className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px] px-1"
                            aria-label={`Receber ${ag.petNome} (${ag.hora})`}
                          >
                            Receber
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(ag)}
                            className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px] px-1"
                            aria-label={`Cancelar agendamento de ${ag.petNome} (${ag.hora})`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Confirmação de cancelamento */}
      <OverlayModal
        open={Boolean(cancelTarget)}
        title="Cancelar agendamento"
        description={
          cancelTarget
            ? `Deseja cancelar o horário de ${cancelTarget.petNome} (${cancelTarget.tutorNome}) às ${cancelTarget.hora}?`
            : ''
        }
        confirmDisabled={cancelling}
        onClose={() => {
          if (!cancelling) setCancelTarget(null);
        }}
        onConfirm={async () => {
          if (!cancelTarget) return;
          setCancelling(true);
          try {
            await onCancelAgendamento(cancelTarget.id);
            setCancelTarget(null);
          } finally {
            setCancelling(false);
          }
        }}
      />
    </div>
  );
}
