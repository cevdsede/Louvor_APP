import { Member } from '../types';

interface RoleIcon {
  [key: string]: string;
}

interface RoleColor {
  [key: string]: string;
}

interface RoleMap {
  [key: string]: string;
}

export const roleOrder: string[] = [
  'Ministro',
  'Vocal',
  'Teclado', 
  'Guitarra',
  'Baixo',
  'Bateria',
  'Sax',
  'Sonoplastia',
  'Projeção'
];

export const teamUtils = {
  // Funções utilitárias para gestão de equipe
  formatRole: (role: string): string => {
    const roleMap: RoleMap = {
      'Ministro': 'Ministro',
      'Vocal': 'Vocal',
      'Violão': 'Violonista',
      'Guitarra': 'Guitarrista',
      'Baixo': 'Baixista',
      'Bateria': 'Baterista',
      'Teclado': 'Tecladista',
      'Sax': 'Saxofonista',
      'Sonoplastia': 'Técnico de Som',
      'Projeção': 'Técnico de Projeção'
    };
    return roleMap[role] || role;
  },

  getRoleColor: (role: string): string => {
    const colorMap: RoleColor = {
      'Ministro': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'Vocal': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'Violão': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'Guitarra': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'Baixo': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'Bateria': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'Teclado': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'Sax': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'Sonoplastia': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      'Projeção': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

export const sortMembersByRole = (members: Member[]): Member[] => {
  return members.sort((a, b) => {
    // Extrair a primeira função de cada membro (caso tenha múltiplas)
    const aRole = a.role.split(',')[0].trim();
    const bRole = b.role.split(',')[0].trim();
    
    const aIndex = roleOrder.indexOf(aRole);
    const bIndex = roleOrder.indexOf(bRole);
    
    // Se não encontrar na ordem, colocar no final
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    
    return aIndex - bIndex;
  });
};

export const getRoleIcon = (role: string): string => {
  const iconMap: RoleIcon = {
    'Ministro': 'fa-crown',
    'Vocal': 'fa-microphone-lines',
    'Violão': 'fa-guitar',
    'Guitarra': 'fa-bolt',
    'Baixo': 'fa-music',
    'Bateria': 'fa-drum',
    'Teclado': 'fa-keyboard',
    'Sax': 'fa-saxophone',
    'Sonoplastia': 'fa-headphones',
    'Projeção': 'fa-video'
  };
  return iconMap[role] || 'fa-user';
};
