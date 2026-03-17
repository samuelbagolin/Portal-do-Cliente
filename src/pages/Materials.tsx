import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../AuthContext';
import { Material, MaterialCategory, MaterialType, Client } from '../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileText, 
  Video, 
  ExternalLink, 
  Trash2,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

export const MaterialsPage: React.FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'pdf' as MaterialType,
    url: '',
    category: 'Onboarding' as MaterialCategory,
    clientId: ''
  });

  useEffect(() => {
    fetchMaterials();
    if (profile?.role === 'ADMIN') fetchClients();
  }, [profile]);

  const fetchMaterials = async () => {
    if (!profile) return;
    try {
      let q = query(collection(db, 'materials'));
      if (profile.role === 'USUARIO') {
        q = query(collection(db, 'materials'), where('clientId', '==', profile.clientId));
      }
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `materials/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheet');
      
      setNewMaterial(prev => ({ 
        ...prev, 
        url, 
        type: isExcel ? 'video' : 'pdf' // Using video as a placeholder for excel if type is limited, or I'll just keep it as pdf for now
      }));
      alert('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await updateDoc(doc(db, 'materials', editingMaterial.id), newMaterial);
      } else {
        await addDoc(collection(db, 'materials'), {
          ...newMaterial,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingMaterial(null);
      setNewMaterial({ title: '', type: 'pdf', url: '', category: 'Onboarding', clientId: '' });
      fetchMaterials();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar material.');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setNewMaterial({
      title: material.title,
      type: material.type,
      url: material.url,
      category: material.category,
      clientId: material.clientId
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este material?')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
      fetchMaterials();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir material.');
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais</h1>
          <p className="text-gray-500">Acesse treinamentos, manuais e atualizações.</p>
        </div>
        {profile?.role === 'ADMIN' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Novo Material
          </button>
        )}
      </header>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar materiais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Onboarding', 'Treinamentos', 'Atualizações'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                categoryFilter === cat ? "bg-primary text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
          <motion.div
            key={material.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group"
          >
            <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
              {material.type === 'video' ? (
                <Video className="w-12 h-12 text-gray-300" />
              ) : (
                <FileText className="w-12 h-12 text-gray-300" />
              )}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  {material.category}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-4 line-clamp-1">{material.title}</h3>
              <div className="flex items-center justify-between">
                <a 
                  href={material.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  {material.type === 'video' ? 'Assistir Vídeo' : 'Abrir PDF'}
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="flex items-center gap-2">
                  {profile?.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleEdit(material)}
                      className="p-2 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  )}
                  {profile?.role === 'ADMIN' && (
                    <button 
                      onClick={() => handleDelete(material.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">{editingMaterial ? 'Editar Material' : 'Novo Material'}</h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input required className="w-full p-2 border rounded-lg" value={newMaterial.title} onChange={e => setNewMaterial({...newMaterial, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select className="w-full p-2 border rounded-lg" value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value as MaterialCategory})}>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Manual">Manual</option>
                    <option value="Treinamento">Treinamento</option>
                    <option value="Atualização">Atualização</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select className="w-full p-2 border rounded-lg" value={newMaterial.type} onChange={e => setNewMaterial({...newMaterial, type: e.target.value as MaterialType})}>
                    <option value="pdf">PDF / Documento</option>
                    <option value="video">Vídeo / Planilha</option>
                  </select>
                </div>
              </div>
              
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".pdf,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <BookOpen className={`w-8 h-8 ${uploading ? 'animate-pulse text-primary' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-600">
                    {uploading ? 'Enviando...' : 'Clique para enviar PDF ou Excel'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL do Material (ou use o upload acima)</label>
                <input required className="w-full p-2 border rounded-lg" value={newMaterial.url} onChange={e => setNewMaterial({...newMaterial, url: e.target.value})} placeholder="https://..." />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Cliente (Opcional - Deixe vazio para todos)</label>
                <select className="w-full p-2 border rounded-lg" value={newMaterial.clientId} onChange={e => setNewMaterial({...newMaterial, clientId: e.target.value})}>
                  <option value="">Todos os Clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false);
                    setEditingMaterial(null);
                    setNewMaterial({ title: '', type: 'pdf', url: '', category: 'Onboarding', clientId: '' });
                  }} 
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold">
                  {editingMaterial ? 'Salvar Alterações' : 'Criar Material'}
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
