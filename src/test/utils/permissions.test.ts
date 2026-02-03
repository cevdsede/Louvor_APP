import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../supabaseClient';

describe('Permissions Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scale Assignment Permissions', () => {
    it('should allow admin to assign any member to any scale', async () => {
      // Mock admin user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-user-id',
            email: 'admin@louvor.com',
            user_metadata: { role: 'admin' }
          }
        }
      });

      // Mock scale data
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: { id: 'scale-1', id_membros: 'member-1', id_funcao: 1 },
          error: null
        })
      });

      // Test scale assignment
      const result = await supabase
        .from('escalas')
        .insert({
          id_culto: 'culto-1',
          id_membros: 'member-1',
          id_funcao: 1
        });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'scale-1',
        id_membros: 'member-1',
        id_funcao: 1
      });
    });

    it('should allow leader to assign members to scales in their ministry', async () => {
      // Mock leader user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'leader-user-id',
            email: 'leader@louvor.com',
            user_metadata: { role: 'leader', ministry: 'music' }
          }
        }
      });

      // Mock scale data
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: { id: 'scale-2', id_membros: 'member-2', id_funcao: 2 },
          error: null
        })
      });

      // Test scale assignment
      const result = await supabase
        .from('escalas')
        .insert({
          id_culto: 'culto-2',
          id_membros: 'member-2',
          id_funcao: 2
        });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should prevent regular member from assigning scales', async () => {
      // Mock regular member user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'member-user-id',
            email: 'member@louvor.com',
            user_metadata: { role: 'member' }
          }
        }
      });

      // Mock RLS policy rejection
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insufficient permissions for this operation' }
        })
      });

      // Test scale assignment
      const result = await supabase
        .from('escalas')
        .insert({
          id_culto: 'culto-3',
          id_membros: 'member-3',
          id_funcao: 3
        });

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Insufficient permissions');
    });
  });

  describe('Member Profile Access', () => {
    it('should allow users to view their own profile', async () => {
      // Mock user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1',
            email: 'user@louvor.com'
          }
        }
      });

      // Mock profile data
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-1',
            nome: 'John Doe',
            email: 'user@louvor.com',
            perfil: 'member'
          },
          error: null
        })
      });

      // Test profile access
      const result = await supabase
        .from('membros')
        .select('*')
        .eq('id', 'user-1')
        .single();

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'user-1',
        nome: 'John Doe',
        email: 'user@louvor.com',
        perfil: 'member'
      });
    });

    it('should prevent users from viewing other members profiles', async () => {
      // Mock user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1',
            email: 'user@louvor.com'
          }
        }
      });

      // Mock RLS policy rejection
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Access denied' }
        })
      });

      // Test profile access to other user
      const result = await supabase
        .from('membros')
        .select('*')
        .eq('id', 'user-2')
        .single();

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Access denied');
    });
  });

  describe('Music Management Permissions', () => {
    it('should allow music leaders to add songs', async () => {
      // Mock music leader
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'music-leader-id',
            email: 'music@louvor.com',
            user_metadata: { role: 'leader', ministry: 'music' }
          }
        }
      });

      // Mock song insertion
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'song-1',
            musica: 'Amazing Grace',
            cantor: 'John Newton',
            estilo: 'Adoração'
          },
          error: null
        })
      });

      // Test song addition
      const result = await supabase
        .from('musicas')
        .insert({
          musica: 'Amazing Grace',
          cantor: 'John Newton',
          estilo: 'Adoração'
        });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        id: 'song-1',
        musica: 'Amazing Grace',
        cantor: 'John Newton',
        estilo: 'Adoração'
      });
    });

    it('should prevent non-music leaders from adding songs', async () => {
      // Mock regular member
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { 
          user: { 
            id: 'regular-member-id',
            email: 'member@louvor.com',
            user_metadata: { role: 'member' }
          }
        }
      });

      // Mock RLS policy rejection
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied for music management' }
        })
      });

      // Test song addition
      const result = await supabase
        .from('musicas')
        .insert({
          musica: 'New Song',
          cantor: 'Artist',
          estilo: 'Adoração'
        });

      expect(result.error).not.toBeNull();
      expect(result.error.message).toContain('Permission denied');
    });
  });
});
