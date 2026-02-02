import { Member } from '../types';

// Role icons mapping e ordem específica
export const roleOrder = [
  { label: 'Ministro', role: 'Ministro', icon: 'fa-crown', priority: 1 },
  { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines', priority: 2 },
  { label: 'Violão', role: 'Violão', icon: 'fa-guitar', priority: 3 },
  { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard', priority: 4 },
  { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt', priority: 5 },
  { label: 'Baixo', role: 'Baixo', icon: 'fa-music', priority: 6 },
  { label: 'Bateria', role: 'Bateria', icon: 'fa-drum', priority: 7 },
  { label: 'Sax', role: 'Sax', icon: 'fa-saxophone', priority: 8 },
  { label: 'Sonoplastia', role: 'Sonoplastia', icon: 'fa-headphones', priority: 9 },
  { label: 'Projeção', role: 'Projeção', icon: 'fa-video', priority: 10 }
];

// Função para ordenar membros pela hierarquia musical
export const sortMembersByRole = (membersList: Member[]) => {
  return membersList.sort((a, b) => {
    const roleA = roleOrder.find(r => r.role.toLowerCase() === a.role.toLowerCase());
    const roleB = roleOrder.find(r => r.role.toLowerCase() === b.role.toLowerCase());
    
    const priorityA = roleA?.priority || 999;
    const priorityB = roleB?.priority || 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Se mesma prioridade, ordenar por nome (com fallback para string vazia)
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
};

// Função para obter ícone da função
export const getRoleIcon = (role: string) => {
  const found = roleOrder.find(r => r.role.toLowerCase() === role.toLowerCase());
  return found ? found.icon : 'fa-user';
};
