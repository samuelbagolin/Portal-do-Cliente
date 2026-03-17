export type UserRole = 'ADMIN' | 'USUARIO';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  photoURL?: string;
  createdAt: any;
}

export interface Client {
  id: string;
  name: string;
  responsibleId?: string; // UID of the Admin responsible
  responsibleName?: string;
  responsibleEmail?: string;
  responsiblePhotoURL?: string;
  createdAt: any;
}

export type TicketStatus = 'A fazer' | 'Em andamento' | 'Aguardando cliente' | 'Concluído';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  responsible: string;
  clientId: string;
  deadline?: string;
  updatedAt: any;
}

export interface Meeting {
  id: string;
  title: string;
  date: any;
  link: string;
  responsible: string;
  clientId: string;
}

export type MaterialCategory = 'Onboarding' | 'Treinamentos' | 'Atualizações';
export type MaterialType = 'pdf' | 'video';

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  url: string;
  category: MaterialCategory;
  clientId: string;
}
