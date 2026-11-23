import React, { useState } from 'react';
import type {
  EspeciePet,
  PessoaAutorizada,
  Pet,
  PortePet,
  SexoPet,
  Tutor,
} from '../types';
import {
  generateClientId,
  maskCPF,
  maskPhone,
  validatePetForm,
  validateTutorForm,
} from '../rules/businessRules';
import { CustomCheckbox, SegmentedToggle, StatusChip } from './LayoutChrome';

interface TelaCadastroProps {
  mode: 'novo' | 'editar';
  existingTutores: Tutor[];
  editingPet?: Pet | null;
  editingTutor?: Tutor | null;
  prefillPetNome?: string;
  prefillTutorNome?: string;
  onCancel: () => void;
  onSaveComplete: (result: {
    mode: 'novo' | 'editar';
    tutor: Tutor;
    pet: Pet;
    reusedTutor: boolean;
  }) => Promise<void>;
}

type SimNao = 'Sim' | 'Não';

export function TelaCadastro({
  mode,
  existingTutores,
  editingPet,
  editingTutor,
  prefillPetNome = '',
  prefillTutorNome = '',
  onCancel,
  onSaveComplete,
}: TelaCadastroProps) {
  const isEdit = mode === 'editar' && Boolean(editingPet && editingTutor);

  // Tutor state
  const [reusedTutorId, setReusedTutorId] = useState<string | null>(null);
  const [tutorNome, setTutorNome] = useState(
    isEdit ? editingTutor!.nomeCompleto : prefillTutorNome
  );
  const [tutorCpf, setTutorCpf] = useState(isEdit ? editingTutor!.cpf : '');
  const [tutorTelefone, setTutorTelefone] = useState(isEdit ? editingTutor!.telefone : '');
  const [tutorEmail, setTutorEmail] = useState(isEdit ? editingTutor!.email : '');
  const [tutorEndereco, setTutorEndereco] = useState(isEdit ? editingTutor!.endereco : '');
  const [emergenciaNome, setEmergenciaNome] = useState(
    isEdit ? editingTutor!.contatoEmergenciaNome : ''
  );
  const [emergenciaTelefone, setEmergenciaTelefone] = useState(
    isEdit ? editingTutor!.contatoEmergenciaTelefone : ''
  );

  // Pet state
  const [petNome, setPetNome] = useState(isEdit ? editingPet!.nome : prefillPetNome);
  const [petEspecie, setPetEspecie] = useState<string>(isEdit ? editingPet!.especie : '');
  const [petRaca, setPetRaca] = useState(isEdit ? editingPet!.raca : '');
  const [petSexo, setPetSexo] = useState<string>(isEdit ? editingPet!.sexo : '');
  const [petNascimento, setPetNascimento] = useState(
    isEdit ? editingPet!.dataNascimento : ''
  );
  const [petPeso, setPetPeso] = useState(isEdit ? String(editingPet!.pesoKg) : '');
  const [petPorte, setPetPorte] = useState<string>(isEdit ? editingPet!.porte : '');
  const [petPelagem, setPetPelagem] = useState(isEdit ? editingPet!.pelagem : '');
  const [castrado, setCastrado] = useState<SimNao>(
    isEdit && editingPet!.castrado ? 'Sim' : 'Não'
  );
  const [vacinasEmDia, setVacinasEmDia] = useState<SimNao>(
    isEdit && editingPet!.vacinasEmDia ? 'Sim' : 'Não'
  );
  const [antipulgas, setAntipulgas] = useState<SimNao>(
    isEdit && editingPet!.antipulgas ? 'Sim' : 'Não'
  );

  // Saude state
  const [alergias, setAlergias] = useState(isEdit ? editingPet!.saude.alergias : '');
  const [nenhumaAlergia, setNenhumaAlergia] = useState(
    isEdit ? editingPet!.saude.nenhumaAlergia : false
  );
  const [doencas, setDoencas] = useState(isEdit ? editingPet!.saude.doencas : '');
  const [medicamentos, setMedicamentos] = useState(
    isEdit ? editingPet!.saude.medicamentos : ''
  );
  const [problemasPele, setProblemasPele] = useState(
    isEdit ? editingPet!.saude.problemasPele : ''
  );
  const [mobilidadeReduzida, setMobilidadeReduzida] = useState<SimNao>(
    isEdit && editingPet!.saude.mobilidadeReduzida ? 'Sim' : 'Não'
  );
  const [agressivo, setAgressivo] = useState<SimNao>(
    isEdit && editingPet!.saude.agressivo ? 'Sim' : 'Não'
  );
  const [morde, setMorde] = useState<SimNao>(
    isEdit && editingPet!.saude.morde ? 'Sim' : 'Não'
  );
  const [aceitaSecador, setAceitaSecador] = useState<SimNao>(
    isEdit && editingPet!.saude.aceitaSecador ? 'Sim' : 'Não'
  );
  const [aceitaMaquina, setAceitaMaquina] = useState<SimNao>(
    isEdit && editingPet!.saude.aceitaMaquina ? 'Sim' : 'Não'
  );
  const [restricoes, setRestricoes] = useState(isEdit ? editingPet!.saude.restricoes : '');

  // Pessoas autorizadas extras
  const [extraAutorizados, setExtraAutorizados] = useState<PessoaAutorizada[]>(
    isEdit ? editingPet!.pessoasAutorizadas.filter((p) => !p.ehTutor) : []
  );
  const [novoAutNome, setNovoAutNome] = useState('');
  const [novoAutDoc, setNovoAutDoc] = useState('');
  const [novoAutTel, setNovoAutTel] = useState('');
  const [novoAutParentesco, setNovoAutParentesco] = useState('');

  // Validation errors & submit state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateTutor, setDuplicateTutor] = useState<Tutor | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function clearFieldError(key: string) {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function handleUseExistingTutor(tutor: Tutor) {
    setReusedTutorId(tutor.id);
    setTutorNome(tutor.nomeCompleto);
    setTutorCpf(tutor.cpf);
    setTutorTelefone(tutor.telefone);
    setTutorEmail(tutor.email);
    setTutorEndereco(tutor.endereco);
    setEmergenciaNome(tutor.contatoEmergenciaNome);
    setEmergenciaTelefone(tutor.contatoEmergenciaTelefone);
    setDuplicateTutor(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.tutorNomeCompleto;
      delete next.tutorCpf;
      delete next.tutorTelefone;
      delete next.tutorEmail;
      delete next.tutorEndereco;
      delete next.tutorEmergenciaNome;
      delete next.tutorEmergenciaTelefone;
      return next;
    });
  }

  function handleAddAutorizado() {
    const autErrors: Record<string, string> = {};
    if (!novoAutNome.trim()) autErrors.autNome = 'Informe o nome.';
    if (!novoAutDoc.trim()) autErrors.autDoc = 'Informe o documento.';
    if (Object.keys(autErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...autErrors }));
      return;
    }
    const novaPessoa: PessoaAutorizada = {
      id: generateClientId('aut'),
      nome: novoAutNome.trim(),
      documento: novoAutDoc.trim(),
      telefone: novoAutTel.trim(),
      parentesco: novoAutParentesco.trim() || 'Autorizada',
      ehTutor: false,
    };
    setExtraAutorizados((prev) => [...prev, novaPessoa]);
    setNovoAutNome('');
    setNovoAutDoc('');
    setNovoAutTel('');
    setNovoAutParentesco('');
    clearFieldError('autNome');
    clearFieldError('autDoc');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const activeEditingTutorId = isEdit
      ? editingTutor!.id
      : reusedTutorId ?? null;

    const tutorValidation = reusedTutorId
      ? { errors: {}, duplicateCpfTutor: null }
      : validateTutorForm(
          {
            nomeCompleto: tutorNome,
            cpf: tutorCpf,
            telefone: tutorTelefone,
            email: tutorEmail,
            endereco: tutorEndereco,
            contatoEmergenciaNome: emergenciaNome,
            contatoEmergenciaTelefone: emergenciaTelefone,
          },
          existingTutores,
          activeEditingTutorId
        );

    const petValidation = validatePetForm({
      nome: petNome,
      especie: petEspecie,
      raca: petRaca,
      sexo: petSexo,
      dataNascimento: petNascimento,
      pesoKg: petPeso,
      porte: petPorte,
      alergias,
      nenhumaAlergia,
    });

    const allErrors = { ...tutorValidation.errors, ...petValidation };
    setDuplicateTutor(!isEdit && !reusedTutorId ? tutorValidation.duplicateCpfTutor : null);

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstKey = Object.keys(allErrors)[0];
      const targetEl = document.getElementById(`field-${firstKey}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.focus();
      }
      return;
    }

    const tutorRecord: Tutor = reusedTutorId
      ? existingTutores.find((t) => t.id === reusedTutorId)!
      : {
          id: isEdit ? editingTutor!.id : generateClientId('tut'),
          nomeCompleto: tutorNome.trim(),
          cpf: tutorCpf.trim(),
          telefone: tutorTelefone.trim(),
          email: tutorEmail.trim(),
          endereco: tutorEndereco.trim(),
          contatoEmergenciaNome: emergenciaNome.trim(),
          contatoEmergenciaTelefone: emergenciaTelefone.trim(),
        };

    const existingTutorAuth = isEdit
      ? editingPet!.pessoasAutorizadas.find((p) => p.ehTutor)
      : undefined;

    const tutorAuthEntry: PessoaAutorizada = {
      id: existingTutorAuth?.id ?? generateClientId('aut'),
      nome: tutorRecord.nomeCompleto,
      documento: tutorRecord.cpf,
      telefone: tutorRecord.telefone,
      parentesco: 'Tutor',
      ehTutor: true,
    };

    const petRecord: Pet = {
      id: isEdit ? editingPet!.id : generateClientId('pet'),
      tutorId: tutorRecord.id,
      nome: petNome.trim(),
      especie: petEspecie as EspeciePet,
      raca: petRaca.trim(),
      sexo: petSexo as SexoPet,
      dataNascimento: petNascimento,
      pesoKg: Number(String(petPeso).replace(',', '.')),
      porte: petPorte as PortePet,
      pelagem: petPelagem.trim(),
      castrado: castrado === 'Sim',
      vacinasEmDia: vacinasEmDia === 'Sim',
      antipulgas: antipulgas === 'Sim',
      saude: {
        alergias: nenhumaAlergia ? '' : alergias.trim(),
        nenhumaAlergia,
        doencas: doencas.trim(),
        medicamentos: medicamentos.trim(),
        problemasPele: problemasPele.trim(),
        mobilidadeReduzida: mobilidadeReduzida === 'Sim',
        agressivo: agressivo === 'Sim',
        morde: morde === 'Sim',
        aceitaSecador: aceitaSecador === 'Sim',
        aceitaMaquina: aceitaMaquina === 'Sim',
        restricoes: restricoes.trim(),
      },
      pessoasAutorizadas: [tutorAuthEntry, ...extraAutorizados],
    };

    setSaving(true);
    try {
      await onSaveComplete({
        mode,
        tutor: tutorRecord,
        pet: petRecord,
        reusedTutor: Boolean(reusedTutorId),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar cadastro.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = (errKey?: string) =>
    `w-full h-[46px] px-[14px] rounded-[10px] bg-[#FFFFFF] border text-[14px] text-[#343546] placeholder:text-[#636578] focus:outline-none ${
      errKey && errors[errKey]
        ? 'border-[#D23A12]'
        : 'border-[#A0A1B2] focus:border-[#FB542B]'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Topo */}
      <div className="mb-[24px]">
        <h1 className="text-[24px] md:text-[28px] leading-[32px] md:leading-[36px] font-semibold text-[#343546]">
          Cadastro de tutor e pet
        </h1>
        <p className="text-[14px] leading-[20px] text-[#636578] mt-[4px]">
          Preencha uma vez. Nas próximas visitas, basta buscar o pet.
        </p>
      </div>

      {/* Duas colunas de 566px no desktop, empilhadas no mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[24px] items-start">
        {/* Coluna Esquerda: Tutor + Saúde e comportamento */}
        <div className="flex flex-col gap-[24px]">
          {/* Cartão Tutor */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <div className="flex items-center justify-between mb-[20px]">
              <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546]">Tutor</h2>
              {reusedTutorId && (
                <button
                  type="button"
                  onClick={() => {
                    setReusedTutorId(null);
                    setTutorCpf('');
                  }}
                  className="text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline"
                >
                  Desvincular tutor
                </button>
              )}
            </div>

            <div className="space-y-[16px]">
              <div>
                <label
                  htmlFor="field-tutorNomeCompleto"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Nome completo
                </label>
                <input
                  id="field-tutorNomeCompleto"
                  type="text"
                  value={tutorNome}
                  disabled={Boolean(reusedTutorId)}
                  onChange={(e) => {
                    setTutorNome(e.target.value);
                    clearFieldError('tutorNomeCompleto');
                  }}
                  className={inputClass('tutorNomeCompleto')}
                />
                {errors.tutorNomeCompleto && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.tutorNomeCompleto}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label
                    htmlFor="field-tutorCpf"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    CPF
                  </label>
                  <input
                    id="field-tutorCpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={tutorCpf}
                    disabled={Boolean(reusedTutorId)}
                    onChange={(e) => {
                      setTutorCpf(maskCPF(e.target.value));
                      setDuplicateTutor(null);
                      clearFieldError('tutorCpf');
                    }}
                    className={inputClass('tutorCpf')}
                  />
                  {errors.tutorCpf && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.tutorCpf}
                    </p>
                  )}
                  {duplicateTutor && !isEdit && (
                    <div className="mt-[6px]">
                      <button
                        type="button"
                        onClick={() => handleUseExistingTutor(duplicateTutor)}
                        className="text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline text-left"
                      >
                        Usar tutor existente ({duplicateTutor.nomeCompleto})
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-tutorTelefone"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Telefone ou WhatsApp
                  </label>
                  <input
                    id="field-tutorTelefone"
                    type="text"
                    value={tutorTelefone}
                    disabled={Boolean(reusedTutorId)}
                    onChange={(e) => {
                      setTutorTelefone(maskPhone(e.target.value));
                      clearFieldError('tutorTelefone');
                    }}
                    className={inputClass('tutorTelefone')}
                  />
                  {errors.tutorTelefone && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.tutorTelefone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-tutorEmail"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  E-mail
                </label>
                <input
                  id="field-tutorEmail"
                  type="email"
                  value={tutorEmail}
                  disabled={Boolean(reusedTutorId)}
                  onChange={(e) => {
                    setTutorEmail(e.target.value);
                    clearFieldError('tutorEmail');
                  }}
                  className={inputClass('tutorEmail')}
                />
                {errors.tutorEmail && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.tutorEmail}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="field-tutorEndereco"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Endereço
                </label>
                <input
                  id="field-tutorEndereco"
                  type="text"
                  value={tutorEndereco}
                  disabled={Boolean(reusedTutorId)}
                  onChange={(e) => {
                    setTutorEndereco(e.target.value);
                    clearFieldError('tutorEndereco');
                  }}
                  className={inputClass('tutorEndereco')}
                />
                {errors.tutorEndereco && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.tutorEndereco}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label
                    htmlFor="field-tutorEmergenciaNome"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Contato de emergência (nome)
                  </label>
                  <input
                    id="field-tutorEmergenciaNome"
                    type="text"
                    value={emergenciaNome}
                    disabled={Boolean(reusedTutorId)}
                    onChange={(e) => {
                      setEmergenciaNome(e.target.value);
                      clearFieldError('tutorEmergenciaNome');
                    }}
                    className={inputClass('tutorEmergenciaNome')}
                  />
                  {errors.tutorEmergenciaNome && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.tutorEmergenciaNome}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-tutorEmergenciaTelefone"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Telefone do contato
                  </label>
                  <input
                    id="field-tutorEmergenciaTelefone"
                    type="text"
                    value={emergenciaTelefone}
                    disabled={Boolean(reusedTutorId)}
                    onChange={(e) => {
                      setEmergenciaTelefone(maskPhone(e.target.value));
                      clearFieldError('tutorEmergenciaTelefone');
                    }}
                    className={inputClass('tutorEmergenciaTelefone')}
                  />
                  {errors.tutorEmergenciaTelefone && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.tutorEmergenciaTelefone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Cartão Saúde e comportamento */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[20px]">
              Saúde e comportamento
            </h2>

            <div className="space-y-[16px]">
              <div>
                <label
                  htmlFor="field-petAlergias"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Alergias (produtos, shampoos, alimentos)
                </label>
                <input
                  id="field-petAlergias"
                  type="text"
                  disabled={nenhumaAlergia}
                  value={alergias}
                  onChange={(e) => {
                    setAlergias(e.target.value);
                    clearFieldError('petAlergias');
                  }}
                  className={`${inputClass('petAlergias')} ${
                    nenhumaAlergia ? 'bg-[#F0F0F0] text-[#636578]' : ''
                  }`}
                />
                <div className="mt-[10px]">
                  <CustomCheckbox
                    id="check-nenhuma-alergia"
                    checked={nenhumaAlergia}
                    onChange={(checked) => {
                      setNenhumaAlergia(checked);
                      if (checked) {
                        setAlergias('');
                        clearFieldError('petAlergias');
                      }
                    }}
                    label="Nenhuma alergia"
                  />
                </div>
                {errors.petAlergias && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.petAlergias}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label
                    htmlFor="field-doencas"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Doenças ou condições
                  </label>
                  <input
                    id="field-doencas"
                    type="text"
                    value={doencas}
                    onChange={(e) => setDoencas(e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label
                    htmlFor="field-medicamentos"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Medicamentos em uso
                  </label>
                  <input
                    id="field-medicamentos"
                    type="text"
                    value={medicamentos}
                    onChange={(e) => setMedicamentos(e.target.value)}
                    className={inputClass()}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-problemasPele"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Problemas de pele
                </label>
                <input
                  id="field-problemasPele"
                  type="text"
                  value={problemasPele}
                  onChange={(e) => setProblemasPele(e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-[4px]">
                <span className="text-[13px] leading-[18px] font-semibold text-[#343546]">
                  Mobilidade ou idade avançada
                </span>
                <SegmentedToggle<SimNao>
                  ariaLabel="Mobilidade ou idade avançada"
                  value={mobilidadeReduzida}
                  onChange={setMobilidadeReduzida}
                  options={[
                    { value: 'Sim', label: 'Sim' },
                    { value: 'Não', label: 'Não' },
                  ]}
                  className="w-full sm:w-[140px]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-[1.4fr_0.85fr_0.95fr_0.95fr] gap-[12px] pt-[4px]">
                <div>
                  <span className="block text-[12px] leading-[16px] font-semibold text-[#343546] mb-[8px] whitespace-nowrap">
                    Agressivo ou nervoso
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Agressivo ou nervoso"
                    value={agressivo}
                    onChange={setAgressivo}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="block text-[12px] leading-[16px] font-semibold text-[#343546] mb-[8px]">
                    Morde
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Morde"
                    value={morde}
                    onChange={setMorde}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="block text-[12px] leading-[16px] font-semibold text-[#343546] mb-[8px]">
                    Aceita secador
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Aceita secador"
                    value={aceitaSecador}
                    onChange={setAceitaSecador}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <span className="block text-[12px] leading-[16px] font-semibold text-[#343546] mb-[8px]">
                    Aceita máquina
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Aceita máquina"
                    value={aceitaMaquina}
                    onChange={setAceitaMaquina}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-restricoes"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Restrições de manuseio
                </label>
                <input
                  id="field-restricoes"
                  type="text"
                  value={restricoes}
                  onChange={(e) => setRestricoes(e.target.value)}
                  className={inputClass()}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Coluna Direita: Pet + Pessoas autorizadas + Botões */}
        <div className="flex flex-col gap-[24px]">
          {/* Cartão Pet */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[20px]">
              Pet
            </h2>

            <div className="space-y-[16px]">
              <div>
                <label
                  htmlFor="field-petNome"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Nome
                </label>
                <input
                  id="field-petNome"
                  type="text"
                  value={petNome}
                  onChange={(e) => {
                    setPetNome(e.target.value);
                    clearFieldError('petNome');
                  }}
                  className={inputClass('petNome')}
                />
                {errors.petNome && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.petNome}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label
                    htmlFor="field-petEspecie"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Espécie
                  </label>
                  <select
                    id="field-petEspecie"
                    value={petEspecie}
                    onChange={(e) => {
                      setPetEspecie(e.target.value);
                      clearFieldError('petEspecie');
                    }}
                    className={`${inputClass('petEspecie')} ${
                      !petEspecie ? 'text-[#636578]' : ''
                    }`}
                  >
                    <option value="">Cão ou Gato</option>
                    <option value="Cão">Cão</option>
                    <option value="Gato">Gato</option>
                  </select>
                  {errors.petEspecie && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petEspecie}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-petRaca"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Raça
                  </label>
                  <input
                    id="field-petRaca"
                    type="text"
                    value={petRaca}
                    onChange={(e) => {
                      setPetRaca(e.target.value);
                      clearFieldError('petRaca');
                    }}
                    className={inputClass('petRaca')}
                  />
                  {errors.petRaca && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petRaca}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <span className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]">
                    Sexo
                  </span>
                  <div id="field-petSexo" tabIndex={-1}>
                    <SegmentedToggle<string>
                      ariaLabel="Sexo do pet"
                      value={petSexo}
                      onChange={(v) => {
                        setPetSexo(v);
                        clearFieldError('petSexo');
                      }}
                      options={[
                        { value: 'Macho', label: 'Macho' },
                        { value: 'Fêmea', label: 'Fêmea' },
                      ]}
                      className={`w-full ${errors.petSexo ? 'border-[#D23A12]' : ''}`}
                    />
                  </div>
                  {errors.petSexo && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petSexo}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-petDataNascimento"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Data de nascimento
                  </label>
                  <input
                    id="field-petDataNascimento"
                    type="date"
                    value={petNascimento}
                    onChange={(e) => {
                      setPetNascimento(e.target.value);
                      clearFieldError('petDataNascimento');
                    }}
                    className={inputClass('petDataNascimento')}
                  />
                  {errors.petDataNascimento && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petDataNascimento}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                <div>
                  <label
                    htmlFor="field-petPeso"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Peso (kg)
                  </label>
                  <input
                    id="field-petPeso"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={petPeso}
                    onChange={(e) => {
                      setPetPeso(e.target.value);
                      clearFieldError('petPeso');
                    }}
                    className={inputClass('petPeso')}
                  />
                  {errors.petPeso && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petPeso}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-petPorte"
                    className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                  >
                    Porte
                  </label>
                  <select
                    id="field-petPorte"
                    value={petPorte}
                    onChange={(e) => {
                      setPetPorte(e.target.value);
                      clearFieldError('petPorte');
                    }}
                    className={`${inputClass('petPorte')} ${
                      !petPorte ? 'text-[#636578]' : ''
                    }`}
                  >
                    <option value="">Pequeno, Médio, Grande</option>
                    <option value="Pequeno">Pequeno</option>
                    <option value="Médio">Médio</option>
                    <option value="Grande">Grande</option>
                  </select>
                  {errors.petPorte && (
                    <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                      {errors.petPorte}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="field-petPelagem"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Pelagem ou cor
                </label>
                <input
                  id="field-petPelagem"
                  type="text"
                  value={petPelagem}
                  onChange={(e) => setPetPelagem(e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className="space-y-[12px] pt-[4px]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-[13px] leading-[18px] font-semibold text-[#343546]">
                    Castrado
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Castrado"
                    value={castrado}
                    onChange={setCastrado}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full sm:w-[140px]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-[13px] leading-[18px] font-semibold text-[#343546]">
                    Vacinas em dia (V10 e antirrábica)
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Vacinas em dia"
                    value={vacinasEmDia}
                    onChange={setVacinasEmDia}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full sm:w-[140px]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-[13px] leading-[18px] font-semibold text-[#343546]">
                    Usa antipulgas e carrapatos
                  </span>
                  <SegmentedToggle<SimNao>
                    ariaLabel="Usa antipulgas e carrapatos"
                    value={antipulgas}
                    onChange={setAntipulgas}
                    options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' },
                    ]}
                    className="w-full sm:w-[140px]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Cartão Pessoas autorizadas a retirar */}
          <section className="bg-[#FFFFFF] rounded-[24px] p-[16px] sm:p-[24px]">
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#343546] mb-[16px]">
              Pessoas autorizadas a retirar
            </h2>

            <div className="flex items-center justify-between py-[10px] border-b border-[#A0A1B2]/50 mb-[16px]">
              <span className="text-[14px] leading-[20px] font-semibold text-[#343546]">
                O próprio tutor
              </span>
              <StatusChip status="Tutor" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px] mb-[16px]">
              <div>
                <label
                  htmlFor="aut-nome"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Nome
                </label>
                <input
                  id="aut-nome"
                  type="text"
                  value={novoAutNome}
                  onChange={(e) => {
                    setNovoAutNome(e.target.value);
                    clearFieldError('autNome');
                  }}
                  className={inputClass('autNome')}
                />
                {errors.autNome && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.autNome}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="aut-doc"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Documento
                </label>
                <input
                  id="aut-doc"
                  type="text"
                  value={novoAutDoc}
                  onChange={(e) => {
                    setNovoAutDoc(e.target.value);
                    clearFieldError('autDoc');
                  }}
                  className={inputClass('autDoc')}
                />
                {errors.autDoc && (
                  <p className="text-[12px] leading-[16px] text-[#D23A12] mt-[4px]">
                    {errors.autDoc}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="aut-tel"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Telefone
                </label>
                <input
                  id="aut-tel"
                  type="text"
                  value={novoAutTel}
                  onChange={(e) => setNovoAutTel(maskPhone(e.target.value))}
                  className={inputClass()}
                />
              </div>

              <div>
                <label
                  htmlFor="aut-parentesco"
                  className="block text-[13px] leading-[18px] font-semibold text-[#343546] mb-[8px]"
                >
                  Parentesco
                </label>
                <input
                  id="aut-parentesco"
                  type="text"
                  value={novoAutParentesco}
                  onChange={(e) => setNovoAutParentesco(e.target.value)}
                  className={inputClass()}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddAutorizado}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B]"
            >
              Adicionar pessoa
            </button>

            {extraAutorizados.length > 0 && (
              <div className="mt-[20px] pt-[12px] border-t border-[#A0A1B2]/50 space-y-[10px]">
                {extraAutorizados.map((pessoa) => (
                  <div
                    key={pessoa.id}
                    className="flex items-center justify-between gap-2 text-[14px] leading-[20px]"
                  >
                    <span className="text-[#343546]">
                      {pessoa.nome} · {pessoa.parentesco}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraAutorizados((prev) => prev.filter((p) => p.id !== pessoa.id))
                      }
                      className="min-h-[44px] sm:min-h-0 flex items-center text-[13px] leading-[18px] font-semibold text-[#A3278F] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3278F] rounded-[4px] px-1 shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {submitError && (
            <p role="alert" className="text-[12px] leading-[16px] text-[#D23A12] text-right">
              {submitError}
            </p>
          )}

          {/* Rodapé */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-[12px]">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FFFFFF] border border-[#A0A1B2] text-[15px] leading-[20px] font-semibold text-[#343546] hover:bg-[#F0F0F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FB542B] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto h-[46px] px-[24px] rounded-[10px] bg-[#FB542B] text-[15px] leading-[20px] font-semibold text-[#343546] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#343546] disabled:opacity-70"
            >
              {saving ? 'Salvando...' : 'Salvar cadastro'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
