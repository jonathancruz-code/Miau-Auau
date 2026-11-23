import React from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Home,
  LogOut,
  PawPrint,
  Settings,
} from 'lucide-react';
import type { TelaAtiva, Usuario } from '../types';
import { formatPerfilLabel } from '../rules/businessRules';

export function BrandLogo({ className = 'w-[30px] h-[30px] md:w-[36px] md:h-[36px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="#343546"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${className} shrink-0`}
    >
      <ellipse cx="9" cy="23" rx="4" ry="5.4" transform="rotate(-22 9 23)" />
      <ellipse cx="18" cy="13" rx="4.2" ry="5.8" transform="rotate(-8 18 13)" />
      <ellipse cx="30" cy="13" rx="4.2" ry="5.8" transform="rotate(8 30 13)" />
      <ellipse cx="39" cy="23" rx="4" ry="5.4" transform="rotate(22 39 23)" />
      <path d="M24 24c-6.4 0-12.5 5.2-12.5 10.6 0 3.7 2.7 5.4 5.7 5.4 2.5 0 4.2-1.2 6.8-1.2s4.3 1.2 6.8 1.2c3 0 5.7-1.7 5.7-5.4C36.5 29.2 30.4 24 24 24z" />
    </svg>
  );
}

interface TopBarProps {
  currentUser: Usuario | null;
  onLogoClick?: () => void;
  onLogout?: () => void;
}

export function TopBar({ currentUser, onLogoClick, onLogout }: TopBarProps) {
  const firstName = currentUser ? currentUser.nome.split(' ')[0] : '';

  return (
    <header className="h-[56px] md:h-[72px] w-full bg-[#FB542B] shrink-0">
      <div className="max-w-[1300px] h-full mx-auto px-4 sm:px-6 lg:px-[40px] min-[1240px]:px-[72px] flex items-center justify-between gap-3">
        {currentUser && onLogoClick ? (
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-[10px] md:gap-[14px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] rounded-[8px] py-1 min-h-[44px]"
            aria-label="Ir para o início - Miau & Auau"
          >
            <BrandLogo />
            <span className="text-[18px] leading-[24px] md:text-[24px] md:leading-[32px] font-semibold text-[#343546] tracking-[-0.01em] whitespace-nowrap">
              Miau &amp; Auau
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-[10px] md:gap-[14px]">
            <BrandLogo />
            <span className="text-[18px] leading-[24px] md:text-[24px] md:leading-[32px] font-semibold text-[#343546] tracking-[-0.01em] whitespace-nowrap">
              Miau &amp; Auau
            </span>
          </div>
        )}

        {currentUser && (
          <div className="flex items-center gap-3 md:gap-[32px] min-w-0">
            <span className="text-[12px] sm:text-[14px] leading-[18px] md:leading-[20px] font-medium text-[#343546] truncate">
              <span className="sm:hidden">
                {firstName} · {formatPerfilLabel(currentUser.perfil)}
              </span>
              <span className="hidden sm:inline">
                {currentUser.nome} · {formatPerfilLabel(currentUser.perfil)}
              </span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-[6px] md:gap-[8px] text-[13px] md:text-[14px] leading-[20px] font-semibold text-[#343546] hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] rounded-[8px] px-2 py-1 shrink-0"
            >
              <LogOut size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

interface BottomNavProps {
  activeScreen: TelaAtiva;
  currentUser: Usuario;
  onNavigate: (screen: TelaAtiva) => void;
}

export function BottomNav({ activeScreen, currentUser, onNavigate }: BottomNavProps) {
  const isNavActive = (item: TelaAtiva): boolean => {
    if (item === 'inicio') return activeScreen === 'inicio' || activeScreen === 'novo-atendimento';
    if (item === 'pets') return activeScreen === 'pets' || activeScreen === 'cadastro';
    return activeScreen === item;
  };

  const items: Array<{ id: TelaAtiva; label: string; mobileLabel?: string; icon: React.ReactNode }> = [
    {
      id: 'inicio',
      label: 'Início',
      icon: <Home size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />,
    },
    {
      id: 'pets',
      label: 'Pets',
      icon: <PawPrint size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: <Calendar size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />,
    },
    {
      id: 'retirada',
      label: 'Retirada',
      icon: <LogOut size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />,
    },
  ];

  if (currentUser.perfil === 'gerente') {
    items.push({
      id: 'administracao',
      label: 'Administração',
      mobileLabel: 'Admin',
      icon: <Settings size={20} strokeWidth={1.75} className="md:w-[24px] md:h-[24px] text-[#343546]" aria-hidden="true" />,
    });
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 h-[60px] md:h-[72px] bg-[#FB542B] z-30"
    >
      <div
        className={`max-w-[1300px] h-full mx-auto px-1 sm:px-4 md:px-[40px] min-[1240px]:px-[72px] grid ${
          items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        } md:flex md:items-center md:justify-between`}
      >
        {items.map((item) => {
          const active = isNavActive(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className="relative h-full min-h-[44px] md:min-w-[140px] flex flex-col md:flex-row items-center justify-center md:justify-start gap-[2px] md:gap-[10px] px-1 md:px-0 text-[11px] leading-[13px] md:text-[14px] md:leading-[20px] font-semibold text-[#343546] hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546]"
            >
              {item.icon}
              {item.mobileLabel ? (
                <>
                  <span className="sm:hidden truncate max-w-full" aria-hidden="true">
                    {item.mobileLabel}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                <span className="truncate max-w-full">{item.label}</span>
              )}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[3px] md:bottom-[6px] left-2 right-2 md:left-0 md:right-0 h-[3px] bg-[#343546]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function StatusChip({ status }: { status: 'Em posse' | 'Finalizado' | 'Tutor' }) {
  if (status === 'Em posse') {
    return (
      <span className="inline-flex items-center gap-[8px] h-[28px] px-[12px] rounded-[14px] bg-[#FB542B]/14 text-[12px] leading-[16px] font-semibold text-[#343546] whitespace-nowrap">
        <span className="w-[8px] h-[8px] rounded-full bg-[#FB542B] shrink-0" aria-hidden="true" />
        Em posse
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center h-[28px] px-[14px] rounded-[14px] bg-[#A0A1B2]/30 text-[12px] leading-[16px] font-semibold text-[#636578] whitespace-nowrap">
      {status}
    </span>
  );
}

export function AllergyChip() {
  return (
    <span className="inline-flex items-center gap-[6px] h-[28px] px-[10px] rounded-[14px] bg-[#A3278F]/12 text-[12px] leading-[16px] font-semibold text-[#A3278F] whitespace-nowrap">
      <AlertTriangle size={16} strokeWidth={1.75} className="text-[#A3278F]" aria-hidden="true" />
      Alergia
    </span>
  );
}

export function AlertBanner({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] bg-[#A3278F]/12 text-[14px] leading-[20px] font-semibold text-[#A3278F]"
    >
      <AlertTriangle size={20} strokeWidth={1.75} className="text-[#A3278F] shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

interface CustomCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function CustomCheckbox({ id, checked, onChange, label, className = '' }: CustomCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-[10px] select-none cursor-pointer text-[14px] leading-[20px] text-[#343546] ${className}`}
    >
      <span className="relative inline-flex items-center justify-center w-[20px] h-[20px] shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer m-0"
        />
        <span
          aria-hidden="true"
          className={`w-[20px] h-[20px] rounded-[5px] border transition-colors flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#FB542B] ${
            checked
              ? 'bg-[#FB542B] border-[#FB542B]'
              : 'bg-[#FFFFFF] border-[#A0A1B2]'
          }`}
        >
          {checked && <Check size={14} strokeWidth={2.5} className="text-[#343546]" />}
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}

interface SegmentedToggleProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex h-[46px] rounded-[10px] border border-[#A0A1B2] bg-[#FFFFFF] overflow-hidden ${className}`}
    >
      {options.map((opt, idx) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-[16px] h-full text-[14px] leading-[20px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FB542B] ${
              idx > 0 ? 'border-l border-[#A0A1B2]' : ''
            } ${
              active
                ? 'bg-[#FB542B] text-[#343546] font-semibold'
                : 'bg-[#FFFFFF] text-[#343546] font-normal hover:bg-[#F0F0F0]/50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToastBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[76px] md:bottom-[90px] left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-32px)] text-center bg-[#343546] text-[#FFFFFF] text-[14px] leading-[20px] font-semibold rounded-[10px] px-[20px] py-[12px] pointer-events-none"
    >
      {message}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm?: () => void;
  singleButtonLabel?: string;
  showWarningIcon?: boolean;
  confirmDisabled?: boolean;
}

export function OverlayModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  singleButtonLabel,
  showWarningIcon = false,
  confirmDisabled = false,
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-[520px] max-w-full bg-[#FFFFFF] rounded-[24px] p-[20px] sm:p-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        {showWarningIcon && (
          <div className="mb-[16px] sm:mb-[20px]">
            <AlertTriangle size={32} strokeWidth={1.75} className="text-[#FB542B]" aria-hidden="true" />
          </div>
        )}
        <h2
          id="modal-title"
          className="text-[22px] sm:text-[28px] leading-[28px] sm:leading-[36px] font-semibold text-[#343546] mb-[12px] sm:mb-[14px]"
        >
          {title}
        </h2>
        <p className="text-[14px] leading-[20px] text-[#343546] mb-[24px] sm:mb-[32px]">
          {description}
        </p>

        {singleButtonLabel ? (
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="w-full h-[46px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546]"
          >
            {singleButtonLabel}
          </button>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-[12px]">
            <button
              type="button"
              onClick={onClose}
              disabled={confirmDisabled}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] disabled:opacity-60"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] disabled:opacity-60"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
