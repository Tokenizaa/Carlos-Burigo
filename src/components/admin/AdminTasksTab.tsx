import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Clock, AlertCircle, Plus, Filter, Calendar } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../types';

export const AdminTasksTab: React.FC = () => {
  const { tasks, currentUser, showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgente':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700">Urgente</span>;
      case 'alta':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700">Alta</span>;
      case 'normal':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700">Normal</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-stone-100 text-stone-600">Baixa</span>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'concluida':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluída</span>;
      case 'em_andamento':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Em Andamento</span>;
      case 'aguardando':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Aguardando</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-stone-100 text-stone-700">Pendente</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-stone-900">Tarefas do Gabinete</h2>
          <p className="text-sm text-stone-600">Acompanhamento e distribuição de demandas e atividades internas.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00A550] hover:bg-[#008f44] text-white font-bold rounded-xl text-sm transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-stone-200">
        <Filter className="w-4 h-4 text-stone-400" />
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Filtros:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs rounded-lg border border-stone-300 bg-stone-50 p-2"
        >
          <option value="all">Todos os Status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="aguardando">Aguardando</option>
          <option value="concluida">Concluída</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs rounded-lg border border-stone-300 bg-stone-50 p-2"
        >
          <option value="all">Todas as Prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <CheckCircle2 className="w-12 h-12 mx-auto text-stone-300 mb-3" />
            <p className="font-semibold text-stone-700">Nenhuma tarefa encontrada</p>
            <p className="text-xs text-stone-500 mt-1">Crie novas tarefas para organizar o fluxo do gabinete.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 sm:p-5 hover:bg-stone-50/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-stone-900">{task.title}</h3>
                    {getPriorityBadge(task.priority)}
                    {getStatusBadge(task.status)}
                  </div>
                  {task.description && (
                    <p className="text-xs text-stone-600 line-clamp-2">{task.description}</p>
                  )}
                  {task.dueAt && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-500">
                      <Calendar className="w-3 h-3" />
                      Prazo: {new Date(task.dueAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Adicionar Tarefa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex.: Revisar minuta do PL 332"
                  className="w-full text-sm rounded-lg border border-stone-300 p-2.5 bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Descrição</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes ou instruções..."
                  className="w-full text-sm rounded-lg border border-stone-300 p-2.5 bg-stone-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Prioridade</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="w-full text-sm rounded-lg border border-stone-300 p-2.5 bg-stone-50"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newTitle.trim()) return;
                  showToast('Tarefa registrada com sucesso!', 'success');
                  setIsModalOpen(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
                className="px-4 py-2 text-sm font-bold bg-[#00A550] text-white rounded-lg hover:bg-[#008f44]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
