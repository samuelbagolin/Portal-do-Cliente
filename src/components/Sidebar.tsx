import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Calendar, 
  Trello, 
  BookOpen, 
  LogOut,
  ChevronRight,
  Camera,
  Loader2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handlePhotoClick = () => {
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
      
      // The profile in AuthContext should update automatically if it's listening to snapshots
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao carregar foto de perfil.');
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
          P
        </div>
        <h1 className="font-bold text-xl text-gray-800">Portal</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.filter(item => item.roles.includes(profile?.role || '')).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-50 hover:text-primary"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            <ChevronRight className={cn(
              "ml-auto w-4 h-4 opacity-0 transition-opacity",
              "group-hover:opacity-100"
            )} />
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div 
            className="relative group cursor-pointer"
            onClick={handlePhotoClick}
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden border border-gray-100">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.name.charAt(0)
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</p>
            <p className="text-xs text-gray-500 truncate">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};
