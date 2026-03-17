import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Client, UserProfile } from '../types';
import { Building2, Plus, Trash2, Search, Calendar, Camera, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newName, setNewName] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [responsiblePhotoURL, setResponsiblePhotoURL] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [clientsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'clients')),
      getDocs(collection(db, 'users'))
    ]);
    
    const allUsers = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    setUsers(allUsers);
    setAdmins(allUsers.filter(u => u.role === 'ADMIN'));
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `responsible_photos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setResponsiblePhotoURL(url);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao enviar foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const selectedAdmin = admins.find(a => a.uid === responsibleId);

    try {
      const clientData = {
        name: newName,
        responsibleId: responsibleId || null,
        responsibleName: selectedAdmin?.name || null,
        responsibleEmail: selectedAdmin?.email || null,
        responsiblePhotoURL: responsiblePhotoURL || null,
        updatedAt: new Date().toISOString()
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), clientData);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...clientData,
          createdAt: new Date().toISOString()
        });
      }

      setNewName('');
      setResponsibleId('');
      setResponsiblePhotoURL('');
      setEditingClient(null);
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar cliente.');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewName(client.name);
    setResponsibleId(client.responsibleId || '');
    setResponsiblePhotoURL(client.responsiblePhotoURL || '');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Todos os dados vinculados serão perdidos.')) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir cliente.');
    }
  };

  const getClientUsers = (clientId: string) => {
    return users.filter(u => u.clientId === clientId);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie as empresas parceiras.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Cliente
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => {
          const clientUsers = getClientUsers(client.id);
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(client)}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45" /> {/* Using Plus rotated as a placeholder for Edit if Pencil is not imported, but I'll use a generic icon or text */}
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
              
              <div className="mt-4 space-y-3">
                {client.responsibleName && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
                    {client.responsiblePhotoURL ? (
                      <img 
                        src={client.responsiblePhotoURL} 
                        alt={client.responsibleName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {client.responsibleName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Responsável</p>
                      <p className="text-sm font-semibold text-gray-700">{client.responsibleName}</p>
                      <p className="text-xs text-gray-500">{client.responsibleEmail}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuários Vinculados ({clientUsers.length})</p>
                <div className="flex -space-x-2 overflow-hidden">
                  {clientUsers.slice(0, 5).map(user => (
                    <div 
                      key={user.uid} 
                      title={user.name}
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600"
                    >
                      {user.name.charAt(0)}
                    </div>
                  ))}
                  {clientUsers.length > 5 && (
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                      +{clientUsers.length - 5}
                    </div>
                  )}
                  {clientUsers.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nenhum usuário vinculado</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Criado em {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
                <input 
                  required
                  autoFocus
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Setup Tecnologia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Responsável pela Carteira (Admin)</label>
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    {responsiblePhotoURL ? (
                      <img src={responsiblePhotoURL} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera className="w-6 h-6 text-gray-400" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">
                    {responsiblePhotoURL ? 'Alterar Foto' : 'Adicionar Foto'}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                  {responsiblePhotoURL && (
                    <button 
                      type="button" 
                      onClick={() => setResponsiblePhotoURL('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <select 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                  value={responsibleId} 
                  onChange={e => setResponsibleId(e.target.value)}
                >
                  <option value="">Selecione um administrador...</option>
                  {admins.map(admin => (
                    <option key={admin.uid} value={admin.uid}>{admin.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1 italic">Este administrador será exibido na home do cliente.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                    setNewName('');
                    setResponsibleId('');
                  }}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold"
                >
                  {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
