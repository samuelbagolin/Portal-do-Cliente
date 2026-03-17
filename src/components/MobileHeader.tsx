import React, { useRef, useState } from 'react';
import { Menu, X, Camera, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Calendar, 
  Trello, 
  BookOpen 
} from 'lucide-react';

export const MobileHeader: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `profile_photos/${profile.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: url
      });
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      let message = 'Erro ao carregar foto de perfil.';
      if (error.code === 'storage/unauthorized') {
        message = 'Sem permissão para carregar arquivos. Verifique as regras do Firebase Storage.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        message = 'Limite de tentativas excedido. Verifique sua conexão.';
      } else if (error.message.includes('Identity Toolkit')) {
        message = 'Erro de API: Ative a Identity Toolkit API no Google Cloud Console.';
      }
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['ADMIN', 'USUARIO'] },
    { icon: Building2, label: 'Clientes', path: '/clientes', roles: ['ADMIN'] },
    { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['ADMIN'] },
    { icon: Calendar, label: 'Agenda', path: '/agenda', roles: ['ADMIN', 'USUARIO'] },
    { icon: Trello, label: 'Tickets', path: '/tickets', roles: ['ADMIN', 'USUARIO'] },
    { icon: BookOpen, label: 'Materiais', path: '/materiais', roles: ['ADMIN', 'USUARIO'] },
  ];

  return (
    <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="font-bold text-gray-800">Portal</span>
        </div>
        
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
            <div className="relative" onClick={handlePhotoClick}>
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold overflow-hidden border border-gray-200">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.name.charAt(0)
                )}
              </div>
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white opacity-70" />}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile?.name}</p>
              <p className="text-xs text-gray-500">{profile?.role}</p>
            </div>
          </div>

          <nav className="p-2">
            {menuItems.filter(item => item.roles.includes(profile?.role || '')).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2 border-t border-gray-100 pt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};
