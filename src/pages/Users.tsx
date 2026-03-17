import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Client, UserRole } from '../types';
import { Users, Plus, Trash2, Mail, Shield, Building2 } from 'lucide-react';
import { motion } from 'motion/react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // New user state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USUARIO' as UserRole,
    clientId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersSnap, clientsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'clients'))
    ]);
    
    setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      // In this environment, we use the server endpoint to create the user in Auth
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      setShowModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'USUARIO', clientId: '' });
      fetchData();
      alert('Usuário criado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Excluir este usuário?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Nenhum';
    return clients.find(c => c.id === clientId)?.name || 'Desconhecido';
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500">Gerencie os acessos ao portal.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Novo Usuário
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-sm font-bold text-gray-600">Nome</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-600">E-mail</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-600">Perfil</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-600">Cliente</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs overflow-hidden border border-gray-100">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                    user.role === 'ADMIN' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {getClientName(user.clientId)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(user.uid)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Completo</label>
                  <input 
                    required 
                    className="w-full p-2 border rounded-lg" 
                    value={newUser.name} 
                    onChange={e => setNewUser({...newUser, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail</label>
                  <input 
                    required 
                    type="email"
                    className="w-full p-2 border rounded-lg" 
                    value={newUser.email} 
                    onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha Inicial</label>
                <input 
                  required 
                  type="password"
                  className="w-full p-2 border rounded-lg" 
                  value={newUser.password} 
                  onChange={e => setNewUser({...newUser, password: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Perfil</label>
                  <select 
                    className="w-full p-2 border rounded-lg" 
                    value={newUser.role} 
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  >
                    <option value="USUARIO">Usuário (Cliente)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                {newUser.role === 'USUARIO' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Vincular Cliente</label>
                    <select 
                      required
                      className="w-full p-2 border rounded-lg" 
                      value={newUser.clientId} 
                      onChange={e => setNewUser({...newUser, clientId: e.target.value})}
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  {creating ? 'Criando...' : 'Criar Usuário'}
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
