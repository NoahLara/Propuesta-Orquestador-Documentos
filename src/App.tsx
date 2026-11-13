import { useNavigation } from './nav';
import { AppShell } from './components/layout/AppShell';
import { PortfolioModule } from './components/cartera/PortfolioModule';
import { ClientWorkspace } from './components/cliente/ClientWorkspace';
import { RevisionModule } from './components/revision/RevisionModule';
import { DashboardModule } from './components/dashboard/DashboardModule';

export function App() {
  const { view } = useNavigation();

  return (
    <AppShell>
      {view === 'cartera' && <PortfolioModule />}
      {view === 'cliente' && <ClientWorkspace />}
      {view === 'revision' && <RevisionModule scope="all" />}
      {view === 'dashboard' && <DashboardModule />}
    </AppShell>
  );
}
