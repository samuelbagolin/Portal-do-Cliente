import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Meeting, Client, UserProfile } from '../types';
import { 
  Calendar, 
  Plus, 
  Video, 
  Clock, 
  User, 
  Trash2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AgendaPage: React.FC = () => {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '',
    link: '',
    responsible: '',
    clientId: ''
  });

  useEffect(() => {
    fetchMeetings();
    if (profile?.role === 'ADMIN') {
      fetchClients();
      fetchAdmins();
    }
  }, [profile, currentMonth]);

  const fetchMeetings = async () => {
    if (!profile) return;
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      
      let q = query(
        collection(db, 'meetings'),
        where('date', '>=', start),
        where('date', '<=', end),
        orderBy('date', 'asc')
      );
      
      if (profile.role === 'USUARIO') {
        q = query(
          collection(db, 'meetings'),
          where('clientId', '==', profile.clientId),
          where('date', '>=', start),
          where('date', '<=', end),
          orderBy('date', 'asc')
        );
      }
      
      const snap = await getDocs(q);
      setMeetings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting)));
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
      if (editingMeeting) {
        await updateDoc(doc(db, 'meetings', editingMeeting.id), newMeeting);
      } else {
        await addDoc(collection(db, 'meetings'), {
          ...newMeeting,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingMeeting(null);
      setNewMeeting({ title: '', date: '', link: '', responsible: '', clientId: '' });
      fetchMeetings();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar reunião.');
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setNewMeeting({
      title: meeting.title,
      date: meeting.date,
      link: meeting.link,
      responsible: meeting.responsible,
      clientId: meeting.clientId
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta reunião?')) return;
    try {
      await deleteDoc(doc(db, 'meetings', id));
      fetchMeetings();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir reunião.');
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500">Acompanhe suas reuniões e compromissos.</p>
        </div>
        {profile?.role === 'ADMIN' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nova Reunião
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-lg border border-gray-200">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-lg border border-gray-200">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => {
              const dayMeetings = meetings.filter(m => isSameDay(new Date(m.date), day));
              return (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "aspect-square p-2 border border-gray-50 rounded-xl flex flex-col items-center justify-center relative group transition-colors",
                    dayMeetings.length > 0 ? "bg-primary/5 border-primary/20" : "hover:bg-gray-50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-semibold",
                    isSameDay(day, new Date()) ? "text-primary" : "text-gray-700"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {dayMeetings.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* List View */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Próximos Eventos
          </h2>
          <div className="space-y-3">
            {meetings.length > 0 ? meetings.map(meeting => (
              <motion.div 
                key={meeting.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{meeting.title}</h3>
                  {profile?.role === 'ADMIN' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(meeting)} className="text-gray-400 hover:text-primary">
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                      <button onClick={() => handleDelete(meeting.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(meeting.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Resp: {meeting.responsible}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <a 
                    href={meeting.link.startsWith('http') ? meeting.link : `https://${meeting.link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-primary text-white py-2 rounded-lg text-center text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover"
                  >
                    <Video className="w-4 h-4" /> Entrar na Reunião
                  </a>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500">
                Nenhuma reunião para este mês.
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">{editingMeeting ? 'Editar Reunião' : 'Nova Reunião'}</h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input required className="w-full p-2 border rounded-lg" value={newMeeting.title} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data e Hora</label>
                  <input required type="datetime-local" className="w-full p-2 border rounded-lg" value={newMeeting.date} onChange={e => setNewMeeting({...newMeeting, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Responsável</label>
                  <select 
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newMeeting.responsible}
                    onChange={e => setNewMeeting({...newMeeting, responsible: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {admins.map(admin => <option key={admin.uid} value={admin.name}>{admin.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link da Reunião</label>
                <input required className="w-full p-2 border rounded-lg" value={newMeeting.link} onChange={e => setNewMeeting({...newMeeting, link: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select required className="w-full p-2 border rounded-lg" value={newMeeting.clientId} onChange={e => setNewMeeting({...newMeeting, clientId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setEditingMeeting(null);
                    setNewMeeting({ title: '', date: '', link: '', responsible: '', clientId: '' });
                  }} 
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold">
                  {editingMeeting ? 'Salvar Alterações' : 'Agendar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
