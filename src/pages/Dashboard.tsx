import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Ticket, Meeting, Material, Client } from '../types';
import { 
  Trello, 
  Calendar, 
  BookOpen, 
  Clock, 
  ArrowRight,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [clientInfo, setClientInfo] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      try {
        // Fetch Tickets
        let ticketsQuery = query(
          collection(db, 'tickets'),
          orderBy('updatedAt', 'desc'),
          limit(5)
        );
        if (profile.role === 'USUARIO') {
          ticketsQuery = query(
            collection(db, 'tickets'),
            where('clientId', '==', profile.clientId),
            orderBy('updatedAt', 'desc'),
            limit(5)
          );
          
          // Fetch Client Info for Responsible
          const clientSnap = await getDocs(query(collection(db, 'clients'), where('id', '==', profile.clientId)));
          if (!clientSnap.empty) {
            setClientInfo(clientSnap.docs[0].data() as Client);
          }
        }
        const ticketsSnap = await getDocs(ticketsQuery);
        setTickets(ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket)));

        // Fetch Meetings
        let meetingsQuery = query(
          collection(db, 'meetings'),
          orderBy('date', 'asc'),
          limit(3)
        );
        if (profile.role === 'USUARIO') {
          meetingsQuery = query(
            collection(db, 'meetings'),
            where('clientId', '==', profile.clientId),
            where('date', '>=', new Date().toISOString()),
            orderBy('date', 'asc'),
            limit(3)
          );
        }
        const meetingsSnap = await getDocs(meetingsQuery);
        setMeetings(meetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting)));

        // Fetch Materials Count
        let materialsQuery = query(collection(db, 'materials'));
        if (profile.role === 'USUARIO') {
          materialsQuery = query(collection(db, 'materials'), where('clientId', '==', profile.clientId));
        }
        const materialsSnap = await getDocs(materialsQuery);
        setMaterialsCount(materialsSnap.size);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const stats = [
    { label: 'Tickets Abertos', value: tickets.filter(t => t.status !== 'Concluído').length, icon: Trello, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Próximas Reuniões', value: meetings.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Materiais Disponíveis', value: materialsCount, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-32 bg-gray-200 rounded-2xl"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-64 bg-gray-200 rounded-2xl"></div>
      <div className="h-64 bg-gray-200 rounded-2xl"></div>
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {profile?.name}! 👋</h1>
        <p className="text-gray-500">Bem-vindo ao seu portal de acompanhamento.</p>
      </header>

      {profile?.role === 'USUARIO' && clientInfo && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            {clientInfo.responsiblePhotoURL ? (
              <img 
                src={clientInfo.responsiblePhotoURL} 
                alt={clientInfo.responsibleName}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {clientInfo.responsibleName?.charAt(0) || 'A'}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider">Responsável pela sua conta</h3>
              <p className="text-xl font-bold text-gray-900">{clientInfo.responsibleName || 'Administrador Geral'}</p>
              <p className="text-gray-500">{clientInfo.responsibleEmail || 'suporte@setuptecnologia.com.br'}</p>
            </div>
          </div>
          <a 
            href="https://wa.me/5554991448008" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-200"
          >
            <MessageCircle className="w-5 h-5" /> Falar com Suporte
          </a>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <TrendingUp className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tickets */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Trello className="w-5 h-5 text-primary" />
              Tickets Recentes
            </h2>
            <button className="text-primary text-sm font-semibold flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div key={ticket.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{ticket.description}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium",
                    ticket.status === 'Concluído' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(ticket.updatedAt), 'dd MMM', { locale: ptBR })}</span>
                  <span>Resp: {ticket.responsible}</span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">Nenhum ticket encontrado.</div>
            )}
          </div>
        </section>

        {/* Upcoming Meetings */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximas Reuniões
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {meetings.length > 0 ? meetings.map(meeting => (
              <div key={meeting.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center text-primary">
                  <span className="text-xs font-bold uppercase">{format(new Date(meeting.date), 'MMM', { locale: ptBR })}</span>
                  <span className="text-lg font-bold leading-none">{format(new Date(meeting.date), 'dd')}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                  <p className="text-sm text-gray-500">{format(new Date(meeting.date), "HH:mm '•' EEEE", { locale: ptBR })}</p>
                </div>
                <a 
                  href={meeting.link.startsWith('http') ? meeting.link : `https://${meeting.link}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">Nenhuma reunião agendada.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
