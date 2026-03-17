import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Ticket, TicketStatus, Client, UserProfile } from '../types';
import { 
  Trello, 
  Plus, 
  MoreVertical, 
  Clock, 
  User,
  Filter,
  Search,
  FileDown,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_COLUMNS: TicketStatus[] = ['A fazer', 'Em andamento', 'Aguardando cliente', 'Concluído'];

export const TicketsPage: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    status: 'A fazer' as TicketStatus,
    responsible: '',
    clientId: '',
    deadline: ''
  });

  useEffect(() => {
    fetchTickets();
    if (profile?.role === 'ADMIN') {
      fetchClients();
      fetchAdmins();
    }
  }, [profile]);

  const fetchTickets = async () => {
    if (!profile) return;
    try {
      let q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));
      if (profile.role === 'USUARIO') {
        q = query(collection(db, 'tickets'), where('clientId', '==', profile.clientId), orderBy('updatedAt', 'desc'));
      }
      const snap = await getDocs(q);
      setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const snap = await getDocs(collection(db, 'clients'));
    setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
  };

  const fetchAdmins = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'ADMIN'));
    const snap = await getDocs(q);
    setAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clientId = profile?.role === 'ADMIN' ? newTicket.clientId : profile?.clientId;
      const ticketData = {
        ...newTicket,
        clientId,
        updatedAt: new Date().toISOString()
      };

      if (editingTicket) {
        await updateDoc(doc(db, 'tickets', editingTicket.id), ticketData);
      } else {
        await addDoc(collection(db, 'tickets'), {
          ...ticketData,
          createdAt: new Date().toISOString()
        });
      }

      setShowModal(false);
      setEditingTicket(null);
      setNewTicket({ title: '', description: '', status: 'A fazer', responsible: '', clientId: '', deadline: '' });
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar ticket.');
    }
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setNewTicket({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      responsible: ticket.responsible,
      clientId: ticket.clientId,
      deadline: ticket.deadline || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ticket?')) return;
    try {
      await deleteDoc(doc(db, 'tickets', id));
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir ticket.');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Relatório de Tickets', 14, 22);
    
    const tableData = tickets.map((t, index) => {
      let dateStr = 'N/A';
      try {
        if (t.updatedAt) {
          dateStr = format(new Date(t.updatedAt), 'dd/MM/yyyy HH:mm');
        }
      } catch (e) {
        console.error("Invalid date:", t.updatedAt);
      }

      return [
        `#${index + 1}`,
        t.title,
        t.description,
        t.responsible,
        t.deadline ? format(new Date(t.deadline), 'dd/MM/yyyy') : 'N/A',
        dateStr
      ];
    });

    autoTable(doc, {
      head: [['Número', 'Título', 'Descrição', 'Responsável', 'Prazo', 'Criação/Atualização']],
      body: tableData,
      startY: 30,
    });

    doc.save('tickets-portal.pdf');
  };

  const updateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error(error);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-500">Gerencie e acompanhe o progresso das demandas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportPDF}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <FileDown className="w-5 h-5" /> Exportar PDF
          </button>
          {profile?.role === 'ADMIN' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" /> Novo Ticket
            </button>
          )}
        </div>
      </header>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
        <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map(status => (
          <div key={status} className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                {status}
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {filteredTickets.filter(t => t.status === status).length}
                </span>
              </h3>
            </div>
            
            <div className="flex-1 bg-gray-100/50 p-3 rounded-2xl space-y-3 min-h-[500px]">
              {filteredTickets.filter(t => t.status === status).map(ticket => (
                <motion.div
                  key={ticket.id}
                  layoutId={ticket.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 leading-tight">{ticket.title}</h4>
                    {profile?.role === 'ADMIN' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(ticket)} className="text-gray-400 hover:text-primary p-1">
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                        <button onClick={() => handleDelete(ticket.id)} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{ticket.description}</p>
                  
                  {ticket.deadline && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 mb-3 bg-orange-50 px-2 py-1 rounded-md w-fit">
                      <Calendar className="w-3 h-3" />
                      Prazo: {format(new Date(ticket.deadline), 'dd/MM/yyyy')}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <User className="w-3 h-3" />
                      {ticket.responsible}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {format(new Date(ticket.updatedAt), 'dd/MM')}
                    </div>
                  </div>

                  {profile?.role === 'ADMIN' && (
                    <div className="mt-3 flex gap-1">
                      {STATUS_COLUMNS.filter(s => s !== status).map(s => (
                        <button
                          key={s}
                          onClick={() => updateTicketStatus(ticket.id, s)}
                          className="text-[10px] bg-gray-50 hover:bg-primary/10 hover:text-primary px-1.5 py-0.5 rounded border border-gray-100 transition-colors"
                        >
                          Mover para {s}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">{editingTicket ? 'Editar Ticket' : 'Novo Ticket'}</h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input 
                  required
                  className="w-full p-2 border rounded-lg"
                  value={newTicket.title}
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea 
                  required
                  className="w-full p-2 border rounded-lg h-24"
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Responsável</label>
                  <select 
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newTicket.responsible}
                    onChange={e => setNewTicket({...newTicket, responsible: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {admins.map(admin => <option key={admin.uid} value={admin.name}>{admin.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prazo de Resolução</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-lg" 
                    value={newTicket.deadline} 
                    onChange={e => setNewTicket({...newTicket, deadline: e.target.value})} 
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Alertas de e-mail serão enviados ao responsável.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select 
                  required
                  className="w-full p-2 border rounded-lg"
                  value={newTicket.clientId}
                  onChange={e => setNewTicket({...newTicket, clientId: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTicket(null);
                    setNewTicket({ title: '', description: '', status: 'A fazer', responsible: '', clientId: '', deadline: '' });
                  }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold"
                >
                  {editingTicket ? 'Salvar Alterações' : 'Criar Ticket'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
