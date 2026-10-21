import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { HelmetIcon } from './HelmetIcon';

type FailProps = {
  title: string;
  detail: string;
  onRetry: () => void;
  onSkip?: () => void;
};

export function BootFail({ title, detail, onRetry, onSkip }: FailProps) {
  return (
    <main className="splash splash-fail">
      <span className="splash-mark"><HelmetIcon /></span>
      <b>NODO360</b>
      <span className="splash-fail-icon"><AlertTriangle /></span>
      <h1>{title}</h1>
      <p>{detail}</p>
      <div className="splash-fail-actions">
        <button type="button" className="splash-fail-primary" onClick={onRetry}>
          <RefreshCw /> Reintentar
        </button>
        {onSkip && (
          <button type="button" className="splash-fail-ghost" onClick={onSkip}>
            Entrar sin restaurar sesión
          </button>
        )}
      </div>
    </main>
  );
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'Error inesperado' };
  }

  render() {
    if (this.state.error) {
      return (
        <BootFail
          title="La app se detuvo"
          detail={`${this.state.error}. En Redmi/Xiaomi actualizá Android System WebView y Chrome.`}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
