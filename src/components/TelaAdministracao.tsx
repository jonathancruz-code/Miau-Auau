import React, { useEffect, useState } from 'react';
import type { Servico, Usuario } from '../types';
import {
  formatCurrencyBR,
  formatCurrencyInputMask,
  formatPerfilLabel,
  parseCurrencyBR,
  validateNewFuncionario,
  validateServicePrices,
} from '../rules/businessRules';
import { OverlayModal } from './LayoutChrome';

interface TelaAdministracaoProps {
  servicos: Servico[];
  usuarios: Usuario[];
  currentUser: Usuario;
  onSaveServicos: (valores: Record<string, number>) => Promise<void>;
  onCreateFuncionario: (payload: { nome: string; email: string; senha: string }) => Promise<void>;
  onRemoveFuncionario: (usuarioId: string) => Promise<void>;
}

export function TelaAdministracao({
  servicos,
  usuarios,
  currentUser,
  onSaveServicos,
  onCreateFuncionario,
  onRemoveFuncionario,
}: TelaAdministracaoProps) {
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of servicos) {
      initial[s.id] = formatCurrencyBR(s.valor);
    }
    return initial;
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const s of servicos) {
      next[s.id] = formatCurrencyBR(s.valor);
    }
    setPriceInputs(next);
  }, [servicos]);

  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [funcErrors, setFuncErrors] = useState<Record<string, string>>({});
  const [creatingFunc, setCreatingFunc] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Usuario | null>(null);
  const [removing, setRemoving] = useState(false);

  async function handleSavePrices(e: React.FormEvent) {
    e.preventDefault();
    const numericMap: Record<string, number> = {};
    for (const s of servicos) {
      numericMap[s.id] = parseCurrencyBR(priceInputs[s.id] ?? '');
    }
    const validation = validateServicePrices(numericMap);
    if (Object.keys(validation).length > 0) {
      setPriceErrors(validation);
      return;
    }
    setPriceErrors({});
    setSavingPrices(true);
    try {
      await onSaveServicos(numericMap);
    } catch (err) {
      setPriceErrors({ submit: err instanceof Error ? err.message : 'Erro ao salvar valores.' });
    } finally {
      setSavingPrices(false);
    }
  }

  async function handleCreateFuncionario(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateNewFuncionario({ nome, email, senha }, usuarios);
    if (Object.keys(validation).length > 0) {
      setFuncErrors(validation);
      return;
    }
    setCreatingFunc(true);
    try {
      await onCreateFuncionario({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
      });
      setNome('');
      setEmail('');
      setSenha('');
      setFuncErrors({});
    } catch (err) {
      setFuncErrors({
        email: err instanceof Error ? err.message : 'Erro ao criar funcionário.',
      });
    } finally {
      setCreatingFunc(false);
    }
  }

  return (
    <div>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Administração
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Valores dos serviços e contas de funcionários. Só o gerente acessa.
        </p>
      </div>

      {/* Duas colunas de 566px no desktop, empilhadas no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[24px] items-start">
        {/* Cartão esquerdo: Valores dos serviços */}
        <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[12px]">
            Valores dos serviços
          </h2>

          <form onSubmit={handleSavePrices} noValidate>
            <div className="divide-y divide-[#A0A1B2]/50">
              {servicos.map((srv) => (
                <div key={srv.id} className="py-[12px]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[8px] sm:gap-[16px]">
                    <label
                      htmlFor={`admin-srv-${srv.id}`}
                      className="text-[14px] leading-[20px] text-[#343546]"
                    >
                      {srv.nome}
                    </label>
                    <input
                      id={`admin-srv-${srv.id}`}
                      type="text"
                      value={priceInputs[srv.id] ?? ''}
                      onChange={(e) => {
                        const masked = formatCurrencyInputMask(e.target.value);
                        setPriceInputs((prev) => ({ ...prev, [srv.id]: masked }));
                        if (priceErrors[srv.id]) {
                          setPriceErrors((prev) => {
                            const next = { ...prev };
                            delete next[srv.id];
                            return next;
                          });
                        }
                      }}
                      className={`w-full sm:w-[150px] h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none tabular-nums ${
                        priceErrors[srv.id]
                          ? 'border-[#D23A12]'
                          : 'border-[#A0A1B2] focus:border-[#FB542B]'
                      }`}
                    />
                  </div>
                  {priceErrors[srv.id] && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px] sm:text-right">
                      {priceErrors[srv.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {priceErrors.submit && (
              <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mt-[12px]">
                {priceErrors.submit}
              </p>
            )}

            <button
              type="submit"
              disabled={savingPrices}
              className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] mt-[20px] disabled:opacity-70"
            >
              {savingPrices ? 'Salvando...' : 'Salvar valores'}
            </button>
          </form>
        </section>

        {/* Cartão direito: Funcionários */}
        <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
          <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
            Funcionários
          </h2>

          <div className="space-y-[12px] sm:space-y-[16px] pb-[20px] border-b border-[#A0A1B2]/50 mb-[20px]">
            {usuarios.map((usr) => {
              const canRemove = usr.perfil === 'funcionario' && usr.id !== currentUser.id;
              return (
                <div key={usr.id} className="flex items-center justify-between gap-3">
                  <span className="text-[14px] leading-[20px] text-[#343546]">
                    {usr.nome} · {formatPerfilLabel(usr.perfil)}
                  </span>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(usr)}
                      className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px] px-1 shrink-0"
                      aria-label={`Remover ${usr.nome}`}
                    >
                      Remover
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreateFuncionario} noValidate className="space-y-[16px]">
            <div>
              <label
                htmlFor="admin-func-nome"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Nome
              </label>
              <input
                id="admin-func-nome"
                type="text"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setFuncErrors((p) => ({ ...p, nome: '' }));
                }}
                className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                  funcErrors.nome ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                }`}
              />
              {funcErrors.nome && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                  {funcErrors.nome}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-func-email"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                E-mail
              </label>
              <input
                id="admin-func-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFuncErrors((p) => ({ ...p, email: '' }));
                }}
                className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                  funcErrors.email ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                }`}
              />
              {funcErrors.email && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                  {funcErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-func-senha"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Senha provisória
              </label>
              <input
                id="admin-func-senha"
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setFuncErrors((p) => ({ ...p, senha: '' }));
                }}
                className={`w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] focus:outline-none ${
                  funcErrors.senha ? 'border-[#D23A12]' : 'border-[#A0A1B2] focus:border-[#FB542B]'
                }`}
              />
              {funcErrors.senha && (
                <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                  {funcErrors.senha}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={creatingFunc}
              className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] mt-[4px] disabled:opacity-70"
            >
              {creatingFunc ? 'Criando...' : 'Criar funcionário'}
            </button>
          </form>
        </section>
      </div>

      {/* Confirmação de remoção */}
      <OverlayModal
        open={Boolean(removeTarget)}
        title="Remover funcionário"
        description={
          removeTarget
            ? `Deseja remover a conta de ${removeTarget.nome} (${removeTarget.email})?`
            : ''
        }
        confirmDisabled={removing}
        onClose={() => {
          if (!removing) setRemoveTarget(null);
        }}
        onConfirm={async () => {
          if (!removeTarget) return;
          setRemoving(true);
          try {
            await onRemoveFuncionario(removeTarget.id);
            setRemoveTarget(null);
          } finally {
            setRemoving(false);
          }
        }}
      />
    </div>
  );
}
