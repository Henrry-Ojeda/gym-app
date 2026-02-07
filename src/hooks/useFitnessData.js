import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook para obtener ejercicios con caché automática
 */
export const useExercises = () => {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
  });
};

/**
 * Hook para el progreso del usuario con soporte offline básico (via React Query cache)
 */
export const useUserProgress = (userId) => {
  return useQuery({
    queryKey: ['user_progress', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*, exercises(name)')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

/**
 * Mutación para subir progreso (Sincronización)
 */
export const useAddProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProgress) => {
      const { data, error } = await supabase
        .from('user_progress')
        .insert([newProgress])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidar caché para forzar recarga
      queryClient.invalidateQueries({ queryKey: ['user_progress', variables.user_id] });
    },
  });
};
