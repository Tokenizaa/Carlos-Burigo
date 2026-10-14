import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppUiProvider } from './context/AppUiContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/public/HeroSection';
import { TrajectorySection } from './components/public/TrajectorySection';
import { ActionsAndProjectsSection } from './components/public/ActionsAndProjectsSection';
import { ResultsSection } from './components/public/ResultsSection';
import { NewsSection } from './components/public/NewsSection';
import { NewsDetail } from './components/public/NewsDetail';
import { AgendaSection } from './components/public/AgendaSection';
import { MunicipalitiesSection } from './components/public/MunicipalitiesSection';
import { VideosSection } from './components/public/VideosSection';
import { CitizenPortalView } from './components/citizen/CitizenPortalView';
import { CitizenProtocolModal } from './components/citizen/CitizenProtocolModal';
import { PrivacyPolicyView } from './components/public/PrivacyPolicyView';
import { ContactView } from './components/public/ContactView';
import { AboutView } from './components/public/AboutView';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminWorkspace } from './components/admin/AdminWorkspace';

const HomeView: React.FC = () => (
  <>
    <HeroSection />
    <TrajectorySection />
    <ActionsAndProjectsSection />
    <ResultsSection />
    <NewsSection />
    <AgendaSection />
    <MunicipalitiesSection />
    <VideosSection />
    <CitizenPortalView />
  </>
);

const AccessibilityView: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <h1 className="text-3xl font-black text-stone-900 mb-6">Acessibilidade Digital</h1>
    <div className="prose prose-stone max-w-none text-stone-700 space-y-4">
      <p>
        Este portal institucional do Deputado Carlos Búrigo foi desenvolvido visando proporcionar acesso pleno
        e facilitado a todas as pessoas, seguindo as diretrizes de acessibilidade na web (WCAG 2.1).
      </p>
      <h2 className="text-xl font-bold text-stone-800 mt-6">Recursos Disponíveis</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Navegação estruturada por teclado e saltos de conteúdo direto.</li>
        <li>Contraste visual ampliado e tipografia com alta legibilidade.</li>
        <li>Textos alternativos em imagens e descrições claras dos elementos multimídia.</li>
        <li>Formatos de documentos abertos e links diretos para proposições oficiais da ALRS.</li>
      </ul>
    </div>
  </div>
);

const TransparencyView: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <h1 className="text-3xl font-black text-stone-900 mb-6">Transparência & Dados Oficiais</h1>
    <div className="prose prose-stone max-w-none text-stone-700 space-y-4">
      <p>
        Em respeito ao cidadão gaúcho e à legislação de acesso à informação (Lei nº 12.527/2011),
        todas as atividades, proposições legislativas, votações em plenário e relatórios de atuação
        parlamentar de Carlos Búrigo estão integrados aos registros públicos oficiais.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <a
          href="https://www.al.rs.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 border border-stone-200 rounded-xl hover:border-[#00A550] transition-colors bg-white shadow-xs"
        >
          <h3 className="font-bold text-stone-900 mb-1">Assembleia Legislativa do RS</h3>
          <p className="text-xs text-stone-500">Consulte proposições, atas e votações no portal oficial da ALRS.</p>
        </a>
        <a
          href="https://transparencia.al.rs.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 border border-stone-200 rounded-xl hover:border-[#00A550] transition-colors bg-white shadow-xs"
        >
          <h3 className="font-bold text-stone-900 mb-1">Portal da Transparência ALRS</h3>
          <p className="text-xs text-stone-500">Prestação de contas, verbas de gabinete e despesas públicas.</p>
        </a>
      </div>
    </div>
  </div>
);

const MainAppContent: React.FC = () => {
  const { currentView, isLoading, setCurrentView, currentUser, authReady } = useApp();
  const [adminTab, setAdminTab] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const hash = window.location.hash.replace(/^#/, '');
    return hash || 'dashboard';
  });

  React.useEffect(() => {
    const handleAdminHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) setAdminTab(hash);
    };
    window.addEventListener('hashchange', handleAdminHashChange);
    return () => window.removeEventListener('hashchange', handleAdminHashChange);
  }, []);

  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '') : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-stone-900">
        <div className="w-10 h-10 rounded-full border-4 border-stone-200 border-t-emerald-700 animate-spin" aria-hidden="true" />
        <p className="mt-5 text-base font-semibold" role="status" aria-live="polite">Carregando o portal institucional...</p>
      </div>
    );
  }

  if (currentView === 'admin' || pathname === 'admin') {
    if (!authReady) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-sm font-semibold text-stone-600">Verificando acesso…</p>
        </div>
      );
    }
    return (
      <AdminLayout activeTab={adminTab} setActiveTab={setAdminTab}>
        <AdminWorkspace activeModule={adminTab} setActiveModule={setAdminTab} />
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-[#00A550] selection:text-white">
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:p-2 focus:bg-white focus:text-[#00A550] focus:absolute focus:z-50">
        Pular para o conteúdo principal
      </a>
      <Navbar />
      <main id="conteudo-principal" tabIndex={-1} className="flex-1">
        {currentView === 'home' && <HomeView />}
        {currentView === 'sobre' && <AboutView />}
        {currentView === 'trajetoria' && <TrajectorySection />}
        {currentView === 'atuacao' && <ActionsAndProjectsSection initialSubTab="projetos" />}
        {currentView === 'projetos' && <ActionsAndProjectsSection initialSubTab="projetos" />}
        {currentView === 'votacoes' && <ActionsAndProjectsSection initialSubTab="votacoes" />}
        {currentView === 'documentos' && <ActionsAndProjectsSection initialSubTab="documentos" />}
        {currentView === 'informativos' && <NewsSection />}
        {currentView === 'resultados' && <ResultsSection />}
        {currentView === 'noticias' && <NewsSection />}
        {currentView === 'noticia-detalhe' && <NewsDetail />}
        {currentView === 'agenda' && <AgendaSection />}
        {currentView === 'municipios' && <MunicipalitiesSection />}
        {currentView === 'videos' && <VideosSection />}
        {currentView === 'cidadao' && <CitizenPortalView />}
        {currentView === 'contato' && <ContactView />}
        {currentView === 'privacidade' && <PrivacyPolicyView />}
        {currentView === 'acessibilidade' && <AccessibilityView />}
        {currentView === 'transparencia' && <TransparencyView />}
      </main>
      <Footer />
      <CitizenProtocolModal />
      {currentView !== 'contato' && currentView !== 'cidadao' && (
        <a
          href="/contato"
          onClick={(event) => {
            event.preventDefault();
            setCurrentView('contato');
          }}
          className="fixed right-4 z-40 min-h-12 min-w-12 rounded-full bg-[#00863f] px-4 text-sm font-bold text-white shadow-lg border-2 border-white flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00863f] bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
          aria-label="Fale com o Deputado"
        >
          Fale com o Deputado
        </a>
      )}
    </div>
  );
};

export function App() {
  return (
    <AppUiProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AppUiProvider>
  );
}

export default App;
