import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in StrongPR:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('strongpr_active_workout');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#F8F9FA',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
          color: '#1C1C1E'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            border: '1px solid #E5E5EA',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              backgroundColor: 'rgba(255, 59, 48, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF3B30',
              fontSize: '28px'
            }}>
              ⚠️
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Ocorreu um problema
            </h2>

            <p style={{ fontSize: '0.85rem', color: '#8E8E93', lineHeight: 1.4, margin: 0 }}>
              A app encontrou um erro inesperado ao atualizar o registo. Os teus dados continuam seguros.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #5B5EF4 0%, #7B7FF5 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Recarregar Aplicação
              </button>

              <button
                onClick={this.handleResetCache}
                style={{
                  background: 'transparent',
                  color: '#8E8E93',
                  border: '1px solid #E5E5EA',
                  borderRadius: '14px',
                  padding: '12px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Limpar Sessão Temporária
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
