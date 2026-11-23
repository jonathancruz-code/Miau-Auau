import React, { useState } from 'react';
import type { PerfilUsuario } from '../types';
import { SegmentedToggle, TopBar } from './LayoutChrome';

interface TelaLoginProps {
  onSubmitLogin: (email: string, senha: string, perfil: PerfilUsuario) => Promise<void>;
}

export function TelaLogin({ onSubmitLogin }: TelaLoginProps) {
  const [perfil, setPerfil] = useState<PerfilUsuario>('gerente');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.');
      return;
    }
    setSubmitting(true);
    setErro(null);
    try {
      await onSubmitLogin(email, senha, perfil);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'E-mail ou senha incorretos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex flex-col">
      <TopBar currentUser={null} />

      <main className="flex-1 flex justify-center items-start pt-[40px] sm:pt-[80px] md:pt-[128px] px-4 sm:px-6 pb-12">
        <div className="w-[440px] max-w-full bg-[#FFFFFF] rounded-[24px] p-[20px] sm:p-[24px]">
          <h1 className="text-[28px] leading-[36px] font-semibold text-[#343546] mb-[4px]">
            Entrar
          </h1>
          <p className="text-[14px] leading-[20px] text-[#636578] mb-[24px]">
            Acesse com a conta do seu pet shop.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-[20px]">
              <SegmentedToggle
                ariaLabel="Perfil de acesso"
                value={perfil}
                onChange={(val) => {
                  setPerfil(val);
                  setErro(null);
                }}
                options={[
                  { value: 'funcionario', label: 'Funcionário' },
                  { value: 'gerente', label: 'Gerente' },
                ]}
                className="w-full"
              />
            </div>

            <div className="mb-[16px]">
              <label
                htmlFor="login-email"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nome@petshop.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro(null);
                }}
                className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] placeholder:text-[#636578] focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            <div className="mb-[20px]">
              <label
                htmlFor="login-senha"
                className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
              >
                Senha
              </label>
              <input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro(null);
                }}
                className="w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[14px] text-[#343546] placeholder:text-[#636578] focus:outline-none focus:border-[#FB542B]"
              />
            </div>

            {erro && (
              <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] mb-[16px]">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] disabled:opacity-70"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
