import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Se uma tela quebrar, mostra o que fazer em vez de uma página em branco. O progresso salvo não é tocado. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    (window.__smErrors ??= []).push(`tela quebrou: ${error.message} ${info.componentStack?.split('\n').slice(0, 3).join(' ') ?? ''}`);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="panel crash" role="alert">
        <h1>Esta tela teve um problema</h1>
        <p>Seu progresso continua salvo neste aparelho. Volte ao início ou recarregue; se repetir, abra a ajuda e copie o diagnóstico.</p>
        <p className="muted">Erro: {this.state.error.message}</p>
        <div className="row wrap">
          <button type="button" className="primary" onClick={() => { location.hash = '#/'; this.setState({ error: null }); }}>Voltar ao início</button>
          <button type="button" className="ghost" onClick={() => location.reload()}>Recarregar</button>
          <button type="button" className="ghost" onClick={() => { location.hash = '#/ajuda'; this.setState({ error: null }); }}>Ajuda e diagnóstico</button>
        </div>
      </section>
    );
  }
}
