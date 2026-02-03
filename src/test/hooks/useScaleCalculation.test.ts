import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { supabase } from '../../supabaseClient';

// Mock the scale calculation hook
const mockUseScaleCalculation = vi.fn();

describe('Scale Calculation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scale Assignment Algorithm', () => {
    it('should calculate optimal scale assignments based on member availability', async () => {
      // Mock member data
      const mockMembers = [
        { id: '1', nome: 'John', funcoes: ['Vocal', 'Teclado'], disponibilidade: ['Sábado', 'Domingo'] },
        { id: '2', nome: 'Mary', funcoes: ['Vocal'], disponibilidade: ['Domingo'] },
        { id: '3', nome: 'Peter', funcoes: ['Guitarra'], disponibilidade: ['Sábado'] }
      ];

      // Mock scale requirements
      const scaleRequirements = {
        'Sábado': { 'Vocal': 2, 'Teclado': 1, 'Guitarra': 1 },
        'Domingo': { 'Vocal': 2, 'Teclado': 1 }
      };

      // Mock Supabase responses
      vi.mocked(supabase.from).mockReturnValue((table: string) => {
        if (table === 'membros') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: mockMembers,
              error: null
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ data: {}, error: null })
        };
      });

      // Test scale calculation
      const result = calculateOptimalScale(mockMembers, scaleRequirements);

      expect(result['Sábado']).toEqual({
        'Vocal': ['John'],
        'Teclado': ['John'],
        'Guitarra': ['Peter']
      });

      expect(result['Domingo']).toEqual({
        'Vocal': ['John', 'Mary'],
        'Teclado': ['John']
      });
    });

    it('should handle conflicts when member is assigned to multiple roles', async () => {
      const mockMembers = [
        { id: '1', nome: 'John', funcoes: ['Vocal', 'Teclado'], disponibilidade: ['Domingo'] },
        { id: '2', nome: 'Mary', funcoes: ['Vocal'], disponibilidade: ['Domingo'] }
      ];

      const scaleRequirements = {
        'Domingo': { 'Vocal': 2, 'Teclado': 1 }
      };

      const result = calculateOptimalScale(mockMembers, scaleRequirements);

      // John should be prioritized for Teclado (more specialized role)
      expect(result['Domingo']['Teclado']).toEqual(['John']);
      // Vocal should be filled with John and Mary
      expect(result['Domingo']['Vocal']).toHaveLength(2);
    });

    it('should handle insufficient members gracefully', async () => {
      const mockMembers = [
        { id: '1', nome: 'John', funcoes: ['Vocal'], disponibilidade: ['Domingo'] }
      ];

      const scaleRequirements = {
        'Domingo': { 'Vocal': 3, 'Teclado': 1 }
      };

      const result = calculateOptimalScale(mockMembers, scaleRequirements);

      expect(result['Domingo']['Vocal']).toEqual(['John']);
      expect(result['Domingo']['Teclado']).toEqual([]);
    });
  });

  describe('Member Availability Logic', () => {
    it('should correctly identify member availability based on preferences', () => {
      const member = {
        id: '1',
        nome: 'John',
        preferencias: {
          'Sábado': { available: true, maxScales: 2 },
          'Domingo': { available: false, maxScales: 0 },
          'Quarta': { available: true, maxScales: 1 }
        },
        escalasAtuais: {
          'Sábado': 1,
          'Quarta': 1
        }
      };

      expect(isMemberAvailable(member, 'Sábado')).toBe(true);
      expect(isMemberAvailable(member, 'Domingo')).toBe(false);
      expect(isMemberAvailable(member, 'Quarta')).toBe(false); // Already at max
      expect(isMemberAvailable(member, 'Sexta')).toBe(true); // No preference = available
    });

    it('should respect member maximum scale limits', () => {
      const member = {
        id: '1',
        nome: 'John',
        preferencias: {
          'Sábado': { available: true, maxScales: 1 },
          'Domingo': { available: true, maxScales: 2 }
        },
        escalasAtuais: {
          'Sábado': 1,
          'Domingo': 1
        }
      };

      expect(isMemberAvailable(member, 'Sábado')).toBe(false); // At max
      expect(isMemberAvailable(member, 'Domingo')).toBe(true);  // Below max
    });
  });

  describe('Scale Conflict Detection', () => {
    it('should detect when member is double-booked', () => {
      const scales = [
        { id: '1', id_culto: 'culto-1', id_membros: 'member-1', id_funcao: 1 },
        { id: '2', id_culto: 'culto-1', id_membros: 'member-1', id_funcao: 2 }
      ];

      const conflicts = detectScaleConflicts(scales);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual({
        member: 'member-1',
        culto: 'culto-1',
        conflicts: [1, 2] // function IDs
      });
    });

    it('should detect time conflicts between different cults', () => {
      const scales = [
        { 
          id: '1', 
          id_culto: 'culto-1', 
          id_membros: 'member-1', 
          id_funcao: 1,
          cultos: { data_culto: '2024-01-20T19:00:00Z' }
        },
        { 
          id: '2', 
          id_culto: 'culto-2', 
          id_membros: 'member-1', 
          id_funcao: 2,
          cultos: { data_culto: '2024-01-20T19:30:00Z' }
        }
      ];

      const conflicts = detectTimeConflicts(scales);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].member).toBe('member-1');
    });
  });

  describe('Scale Balance Optimization', () => {
    it('should distribute scales evenly among available members', () => {
      const members = [
        { id: '1', nome: 'John', funcoes: ['Vocal'], disponibilidade: ['Sábado', 'Domingo'] },
        { id: '2', nome: 'Mary', funcoes: ['Vocal'], disponibilidade: ['Sábado', 'Domingo'] },
        { id: '3', nome: 'Peter', funcoes: ['Vocal'], disponibilidade: ['Sábado', 'Domingo'] }
      ];

      const requirements = {
        'Sábado': { 'Vocal': 2 },
        'Domingo': { 'Vocal': 2 }
      };

      const result = calculateOptimalScale(members, requirements);

      // Each member should get approximately equal assignments
      const assignments = {};
      Object.values(result).forEach(dayScales => {
        Object.values(dayScales).forEach(memberList => {
          memberList.forEach(memberId => {
            assignments[memberId] = (assignments[memberId] || 0) + 1;
          });
        });
      });

      const maxAssignments = Math.max(...Object.values(assignments));
      const minAssignments = Math.min(...Object.values(assignments));
      
      expect(maxAssignments - minAssignments).toBeLessThanOrEqual(1);
    });

    it('should prioritize members with specific skills for specialized roles', () => {
      const members = [
        { id: '1', nome: 'John', funcoes: ['Vocal'], nivel: 'basic', disponibilidade: ['Domingo'] },
        { id: '2', nome: 'Mary', funcoes: ['Teclado'], nivel: 'expert', disponibilidade: ['Domingo'] },
        { id: '3', nome: 'Peter', funcoes: ['Teclado'], nivel: 'basic', disponibilidade: ['Domingo'] }
      ];

      const requirements = {
        'Domingo': { 'Teclado': 1 }
      };

      const result = calculateOptimalScale(members, requirements);

      // Mary (expert) should be prioritized over Peter (basic)
      expect(result['Domingo']['Teclado']).toEqual(['Mary']);
    });
  });
});

// Helper functions for testing
function calculateOptimalScale(members, requirements) {
  const result = {};
  
  Object.entries(requirements).forEach(([day, roles]) => {
    result[day] = {};
    
    Object.entries(roles).forEach(([role, count]) => {
      const availableMembers = members.filter(member => 
        member.funcoes.includes(role) && 
        member.disponibilidade.includes(day)
      );
      
      result[day][role] = availableMembers
        .slice(0, count)
        .map(member => member.id);
    });
  });
  
  return result;
}

function isMemberAvailable(member, day) {
  const preference = member.preferencias?.[day];
  if (!preference) return true;
  
  if (!preference.available) return false;
  
  const currentAssignments = member.escalasAtuais?.[day] || 0;
  return currentAssignments < preference.maxScales;
}

function detectScaleConflicts(scales) {
  const memberScales = {};
  
  scales.forEach(scale => {
    if (!memberScales[scale.id_membros]) {
      memberScales[scale.id_membros] = {
        member: scale.id_membros,
        culto: scale.id_culto,
        conflicts: []
      };
    }
    memberScales[scale.id_membros].conflicts.push(scale.id_funcao);
  });
  
  return Object.values(memberScales).filter(ms => ms.conflicts.length > 1);
}

function detectTimeConflicts(scales) {
  const conflicts = [];
  
  for (let i = 0; i < scales.length; i++) {
    for (let j = i + 1; j < scales.length; j++) {
      if (scales[i].id_membros === scales[j].id_membros) {
        const time1 = new Date(scales[i].cultos.data_culto);
        const time2 = new Date(scales[j].cultos.data_culto);
        const timeDiff = Math.abs(time1 - time2);
        
        // If less than 2 hours apart, consider it a conflict
        if (timeDiff < 2 * 60 * 60 * 1000) {
          conflicts.push({
            member: scales[i].id_membros,
            culto1: scales[i].id_culto,
            culto2: scales[j].id_culto,
            timeDiff
          });
        }
      }
    }
  }
  
  return conflicts;
}
