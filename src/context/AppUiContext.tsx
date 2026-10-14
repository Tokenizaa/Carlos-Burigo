import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AppUiContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedNewsSlug: string | null;
  setSelectedNewsSlug: (slug: string | null) => void;
  trackingProtocol: string | null;
  setTrackingProtocol: (protocol: string | null) => void;
  isProtocolModalOpen: boolean;
  setIsProtocolModalOpen: (open: boolean) => void;
  openNewsDetail: (slug: string) => void;
  openProtocolModal: (protocol?: string) => void;
  closeProtocolModal: () => void;
}

const AppUiContext = createContext<AppUiContextType | null>(null);

export const AppUiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedNewsSlug, setSelectedNewsSlug] = useState<string | null>(null);
  const [trackingProtocol, setTrackingProtocol] = useState<string | null>(null);
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);

  const openNewsDetail = useCallback((slug: string) => {
    setSelectedNewsSlug(slug);
    setCurrentView('noticia-detalhe');
  }, []);

  const openProtocolModal = useCallback((protocol?: string) => {
    if (protocol) setTrackingProtocol(protocol);
    setIsProtocolModalOpen(true);
  }, []);

  const closeProtocolModal = useCallback(() => {
    setIsProtocolModalOpen(false);
  }, []);

  return (
    <AppUiContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedNewsSlug,
        setSelectedNewsSlug,
        trackingProtocol,
        setTrackingProtocol,
        isProtocolModalOpen,
        setIsProtocolModalOpen,
        openNewsDetail,
        openProtocolModal,
        closeProtocolModal,
      }}
    >
      {children}
    </AppUiContext.Provider>
  );
};

export const useAppUi = (): AppUiContextType => {
  const context = useContext(AppUiContext);
  if (!context) {
    return {
      currentView: 'home',
      setCurrentView: () => {},
      selectedNewsSlug: null,
      setSelectedNewsSlug: () => {},
      trackingProtocol: null,
      setTrackingProtocol: () => {},
      isProtocolModalOpen: false,
      setIsProtocolModalOpen: () => {},
      openNewsDetail: () => {},
      openProtocolModal: () => {},
      closeProtocolModal: () => {},
    };
  }
  return context;
};
