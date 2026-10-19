import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Layers,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Minimize2,
  Maximize2,
  FolderOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
} from 'lucide-react';
import { useAssistant } from '../context/AssistantContext';
import { InvestigationStatus } from '../types/assistant';

export const ContextualAssistant: React.FC = () => {
  const {
    isOpen,
    toggleOpen,
    investigations,
    activeInvestigation,
    setActiveInvestigationId,
    createInvestigation,
    updateInvestigationStatus,
    sendMessage,
    suggestedQuestions,
    pageContext,
    handleEvidenceAction,
  } = useAssistant();

  const [inputMessage, setInputMessage] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Estados de Voz (STT e TTS)
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, activeInvestigation.messages.length]);

  // Interrupção de fala com a tecla Escape
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && speakingMessageId) {
        stopSpeech();
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, [speakingMessageId]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
  };

  const playOralBriefing = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingMessageId === msgId) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = speechRate;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Reconhecimento de voz não suportado neste navegador. Utilize Google Chrome ou Microsoft Edge.');
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;
    stopSpeech();
    sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createInvestigation(newTitle, newObjective || 'Investigação analítica de dados eleitorais.');
    setNewTitle('');
    setNewObjective('');
    setShowNewModal(false);
  };

  const statusLabels: Record<InvestigationStatus, { label: string; bg: string; text: string }> = {
    em_andamento: { label: 'Em Andamento', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
    concluida: { label: 'Concluída', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
    hipotese_refutada: { label: 'Hipótese Refutada', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
    evidencias_inconclusivas: { label: 'Inconclusiva', bg: 'bg-neutral-100 border-neutral-300', text: 'text-neutral-700' },
  };

  return (
    <>
      {/* Botão Persistente de Abertura no Canto Inferior Direito */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          aria-label="Abrir assistente conversacional"
          className="fixed bottom-5 right-5 z-40 bg-emerald-800 hover:bg-emerald-900 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-lg flex items-center gap-2.5 transition-all transform hover:scale-105 group border border-emerald-700/50 cursor-pointer"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-emerald-900" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold leading-tight flex items-center gap-1">
              Assistente de Inteligência
            </span>
            <span className="text-[10px] text-emerald-200 truncate max-w-[190px]">
              {activeInvestigation.title}
            </span>
          </div>
        </button>
      )}

      {/* Painel Lateral Expansível do Assistente */}
      {isOpen && (
        <aside
          aria-label="Painel de Inteligência Eleitoral Conversacional"
          className={`fixed top-0 right-0 bottom-0 z-50 bg-white border-l border-neutral-200 shadow-2xl flex flex-col transition-all duration-300 ${
            isExpanded ? 'w-full md:w-[680px]' : 'w-full md:w-[480px]'
          }`}
        >
          {/* Topo do Assistente */}
          <div className="p-3.5 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-800/80 rounded-md text-emerald-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5 text-neutral-100">
                  <span>Inteligência Eleitoral</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-emerald-300 border border-neutral-700">
                    Motor TSE
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate max-w-[260px]">
                  Página: <strong className="text-neutral-200">{pageContext.viewName}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-neutral-400">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Reduzir largura' : 'Expandir painel'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={toggleOpen}
                className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                title="Fechar assistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Faixa da Investigação Ativa (Nível 1) */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Investigação:
                </span>
                <select
                  value={activeInvestigation.id}
                  onChange={(e) => setActiveInvestigationId(e.target.value)}
                  className="text-xs font-bold text-neutral-900 bg-transparent border-0 truncate focus:outline-none cursor-pointer max-w-[240px]"
                >
                  {investigations.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3 text-emerald-700" />
                <span>Nova</span>
              </button>
            </div>

            {/* Status e Contexto Estruturado */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                    statusLabels[activeInvestigation.status].bg
                  } ${statusLabels[activeInvestigation.status].text}`}
                >
                  {statusLabels[activeInvestigation.status].label}
                </span>
                <span className="truncate">
                  Foco: <strong className="text-neutral-800">{pageContext.selectedMunicipalityName}</strong> ({pageContext.startYear}→{pageContext.endYear})
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 shrink-0">
                {activeInvestigation.updatedAt}
              </span>
            </div>
          </div>

          {/* Área de Mensagens (Nível 2) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-100/40">
            {activeInvestigation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-neutral-500">
                    {msg.sender === 'user' ? 'Analista' : 'Inteligência Eleitoral'}
                  </span>
                  <span className="text-[10px] text-neutral-400">· {msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed max-w-[95%] shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-800 text-white rounded-br-none'
                      : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-none'
                  }`}
                >
                  {/* Conteúdo com renderização simples de Markdown */}
                  <div className="prose prose-xs max-w-none space-y-2 whitespace-pre-wrap">
                    {msg.text}
                  </div>

                  {/* Evidências Acionáveis (Nível 3) */}
                  {msg.evidences && msg.evidences.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-200 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-700" />
                        <span>Evidências Vinculadas aos Dados:</span>
                      </div>
                      {msg.evidences.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-neutral-50 border border-neutral-200 rounded p-2 text-left"
                        >
                          <div className="font-semibold text-neutral-900 text-[11px]">
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-neutral-600 mt-0.5">{ev.summary}</div>
                          {ev.action && (
                            <button
                              type="button"
                              onClick={() => handleEvidenceAction(ev.action!)}
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                            >
                              <span>{ev.action.label}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Perguntas Sugeridas / Follow-ups Rápidos */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                    {msg.suggestedFollowUps.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="text-[11px] bg-white hover:bg-emerald-50 text-neutral-700 hover:text-emerald-900 border border-neutral-200 hover:border-emerald-300 rounded-full px-2.5 py-1 text-left transition-colors cursor-pointer shadow-2xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões de Perguntas do Contexto Atual */}
          {suggestedQuestions.length > 0 && (
            <div className="px-3.5 py-2 bg-neutral-50 border-t border-neutral-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Sugestões para {pageContext.selectedMunicipalityName}:</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {suggestedQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(sq)}
                    className="shrink-0 text-[11px] bg-white hover:bg-emerald-50 text-neutral-700 hover:text-emerald-900 border border-neutral-200 hover:border-emerald-300 rounded-md px-2.5 py-1 transition-colors cursor-pointer"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Campo de Entrada de Mensagem */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-neutral-200 flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Pergunte sobre ${pageContext.selectedMunicipalityName}, seções, 2018, 2022 ou 2026...`}
                className="w-full resize-none rounded-md border border-neutral-300 p-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700 leading-normal"
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 disabled:hover:bg-emerald-800 text-white rounded-md transition-colors cursor-pointer shrink-0"
              title="Enviar pergunta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}

      {/* Modal para Nova Investigação */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-emerald-700" />
                Criar Nova Investigação
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Título da Investigação
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Disputa contra Guilherme Pasin na Zona 16"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs rounded border border-neutral-300 p-2 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Objetivo Analítico
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva a hipótese a ser testada ou o fenômeno a ser explicado com dados oficiais..."
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="w-full text-xs rounded border border-neutral-300 p-2 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs bg-emerald-800 hover:bg-emerald-900 text-white rounded font-medium shadow-xs"
                >
                  Iniciar Investigação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
