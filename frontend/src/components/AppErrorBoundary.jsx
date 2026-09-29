import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="workspace">
          <section className="content" role="alert">
            <h1>Não foi possível carregar a aplicação.</h1>
            <p className="page-heading__description">
              Atualize a página e tente novamente.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}