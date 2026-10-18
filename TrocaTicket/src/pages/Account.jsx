import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/StoreContext';
import { destinations, roleNames } from '../data/demo';
import { Field, Tabs } from '../components/UI';
import { buscarContaDemo, senhaInicialDemo } from '../mvp/contasDemo';
import { useI18n } from '../i18n';

// Só a demonstração local usa estes atalhos. A sessão real da API continua separada.
const perfisDasContasDemo = {
  ana: 'comprador',
  bruna: 'comprador',
  caio: 'comprador',
  organizador: 'organizador',
  fornecedor: 'fornecedor',
  admin: 'admin',
};

export default function Account({ login = false }) {
  const [params] = useSearchParams();
  const { t } = useI18n();
  const contaDemo = login ? buscarContaDemo(params.get('demo')) : null;
  const navigate = useNavigate();
  const { chooseRole, notify } = useStore();
  const [profile, setProfile] = useState(
    contaDemo
      ? perfisDasContasDemo[contaDemo.id]
      : ['comprador', 'organizador', 'fornecedor'].includes(params.get('perfil'))
        ? params.get('perfil')
        : 'comprador',
  );
  const [email, setEmail] = useState(contaDemo?.email || '');
  const [password, setPassword] = useState(contaDemo ? senhaInicialDemo : '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (!login) return;
    setEmail(contaDemo?.email || '');
    setPassword(contaDemo ? senhaInicialDemo : '');
    setProfile(contaDemo ? perfisDasContasDemo[contaDemo.id] : 'comprador');
  }, [login, contaDemo]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = {};
    if (!login && data.name.trim().length < 2) next.name = 'Informe seu nome completo.';
    if (!login && ![11, 14].includes(data.document.replace(/\D/g, '').length))
      next.document = 'Use 11 dígitos para CPF ou 14 para CNPJ (fictício).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = 'Informe um e-mail válido.';
    if (data.password.length < 8) next.password = 'Use pelo menos 8 caracteres.';
    if (!login && data.confirm !== data.password) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (!mounted.current) return;
    chooseRole(profile);
    notify(
      login ? 'Acesso de demonstração iniciado.' : 'Cadastro validado. Bem-vindo à demonstração!',
    );
    navigate(destinations[profile]);
  }
  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="auth-symbol">♙</span>
        <h1>{t(login ? 'Acesse sua Conta' : 'Crie sua Conta')}</h1>
        <p className="auth-note">
          {t('Demonstração acadêmica no navegador, sem autenticação ou pagamentos reais.')}
        </p>
        <div className="tabs auth-tabs">
          <Link className={login ? 'active' : ''} to="/entrar">
            {t('Entrar')}
          </Link>
          <Link className={!login ? 'active' : ''} to="/cadastro">
            {t('Criar Conta')}
          </Link>
        </div>
        {!login && (
          <Tabs
            options={['Participante', 'Organizador', 'Fornecedor']}
            value={roleNames[profile]}
            onChange={(value) =>
              setProfile(Object.keys(roleNames).find((key) => roleNames[key] === value))
            }
          />
        )}
        {login && contaDemo && (
          <p className="demo-selected-account" role="status">
            {t('Perfil de demonstração')}: <strong>{t(contaDemo.perfil)}</strong>
          </p>
        )}
        <form noValidate onSubmit={submit}>
          {!login && (
            <>
              <Field
                label="Nome completo"
                name="name"
                autoComplete="name"
                placeholder="João da Silva"
                error={errors.name}
              />
              <Field
                label={profile === 'comprador' ? 'CPF' : 'CPF / CNPJ'}
                name="document"
                placeholder="Documento fictício"
                error={errors.document}
              />
            </>
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          <Field
            label="Senha"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder="Mínimo de 8 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          {!login && (
            <Field
              label="Confirme sua senha"
              name="confirm"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              error={errors.confirm}
            />
          )}
          <div className="form-options">
            <label>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />{' '}
              {t('Mostrar senha')}
            </label>
            {login && <Link to="/recuperar">Esqueceu sua senha?</Link>}
          </div>
          <button className={`button ${login ? 'blue-button' : 'dark'}`} disabled={busy}>
            {t(busy ? 'Validando…' : login ? 'Entrar na demonstração' : 'Cadastrar')}
          </button>
        </form>
        <p className="auth-note">
          {t(
            'Use somente dados fictícios. Senhas e documentos deste formulário não são armazenados nem enviados. As alterações das telas ficam neste navegador.',
          )}
        </p>
        <div className="divider">OU EXPLORE SEM CADASTRO</div>
        <Link className="button outline full" to="/perfis">
          Escolher perfil de demonstração →
        </Link>
      </div>
    </section>
  );
}
export function Profiles() {
  const { chooseRole } = useStore();
  const navigate = useNavigate();
  return (
    <section className="auth-page profile-selection">
      <div className="section-heading">
        <p className="eyebrow purple">Uma plataforma, muitas possibilidades</p>
        <h1>Como você quer explorar?</h1>
        <p>
          Escolha um perfil para conhecer os fluxos simulados. Esta seleção não concede acesso a
          contas reais; os dados fictícios ficam neste navegador.
        </p>
      </div>
      <div className="role-grid">
        {Object.entries(roleNames).map(([id, name], i) => (
          <button
            className="role-card"
            key={id}
            onClick={() => {
              chooseRole(id);
              navigate(destinations[id]);
            }}
          >
            <span className="role-symbol">{['♧', '⚑', '▣', '◇'][i]}</span>
            <h2>{name}</h2>
            <p>
              {
                [
                  'Descubra eventos, salve favoritos e simule seus ingressos.',
                  'Crie eventos, conecte fornecedores e consolide custos.',
                  'Gerencie seu catálogo e envie propostas comerciais.',
                  'Acompanhe relatórios e faça a moderação de cadastros.',
                ][i]
              }
            </p>
            <strong>Acessar área →</strong>
          </button>
        ))}
      </div>
      <Link className="text-link" to="/">
        ← Voltar ao início
      </Link>
    </section>
  );
}
export function Recover() {
  const [done, setDone] = useState(false);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Recuperar acesso</h1>
        {done ? (
          <p role="status">
            Solicitação simulada. Nenhum e-mail foi enviado; você pode entrar com qualquer e-mail
            válido e senha de 8 caracteres na demonstração.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <Field label="E-mail da conta" name="recover-email" type="email" required />
            <button className="button blue-button">Simular recuperação</button>
          </form>
        )}
        <Link className="text-link" to="/entrar">
          Voltar para entrar
        </Link>
      </div>
    </section>
  );
}
