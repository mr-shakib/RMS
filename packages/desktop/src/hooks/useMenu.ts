import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { apiClient } from '@/lib/apiClient';
import type { MenuItem, CreateMenuItemDTO } from '@rms/shared';

export function useMenu() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Fetch menu items
  const { data: menuItems, isLoading, error, refetch } = useQuery<MenuItem[]>({
    queryKey: ['menu'],
    queryFn: async () => {
      const response = await apiClient.get<{ status: string; data: { menuItems: MenuItem[] } }>('/menu');
      return response.data.menuItems;
    },
  });

  // Subscribe to menu updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle menu updated
    const handleMenuUpdated = (updatedMenuItem: MenuItem) => {
      queryClient.setQueryData<MenuItem[]>(['menu'], (old) => {
        if (!old) return [updatedMenuItem];
        const exists = old.some((item) => item.id === updatedMenuItem.id);
        if (exists) {
          return old.map((item) => (item.id === updatedMenuItem.id ? updatedMenuItem : item));
        } else {
          return [...old, updatedMenuItem];
        }
      });
    };

    socket.on('menu:updated', handleMenuUpdated);

    return () => {
      socket.off('menu:updated', handleMenuUpdated);
    };
  }, [socket, isConnected, queryClient]);

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: async (data: CreateMenuItemDTO) => {
      console.log('🔷 useMenu: createMenuItem mutation called with:', data);
      const response = await apiClient.post<{ status: string; data: { menuItem: MenuItem } }>('/menu', data);
      console.log('🔷 useMenu: API response received:', response);
      return response.data.menuItem;
    },
    onSuccess: (newMenuItem) => {
      console.log('🔷 useMenu: Mutation success, updating cache with:', newMenuItem);
      queryClient.setQueryData<MenuItem[]>(['menu'], (old) => {
        if (!old) return [newMenuItem];
        const exists = old.some((item) => item.id === newMenuItem.id);
        if (exists) {
          return old.map((item) => (item.id === newMenuItem.id ? newMenuItem : item));
        }
        return [...old, newMenuItem];
      });
    },
    onError: (error) => {
      console.error('🔷 useMenu: Mutation error:', error);
    },
  });

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuItem> }) => {
      const response = await apiClient.patch<{ status: string; data: { menuItem: MenuItem } }>(`/menu/${id}`, data);
      return response.data.menuItem;
    },
    onSuccess: (updatedMenuItem) => {
      queryClient.setQueryData<MenuItem[]>(['menu'], (old) => {
        if (!old) return [updatedMenuItem];
        return old.map((item) => (item.id === updatedMenuItem.id ? updatedMenuItem : item));
      });
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<{ status: string; data: { menuItem: MenuItem } }>(`/menu/${id}/availability`);
      return response.data.menuItem;
    },
    onSuccess: (updatedMenuItem) => {
      queryClient.setQueryData<MenuItem[]>(['menu'], (old) => {
        if (!old) return [updatedMenuItem];
        return old.map((item) => (item.id === updatedMenuItem.id ? updatedMenuItem : item));
      });
    },
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/menu/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<MenuItem[]>(['menu'], (old) => {
        if (!old) return [];
        return old.filter((item) => item.id !== deletedId);
      });
    },
  });

  return {
    menuItems: menuItems || [],
    isLoading,
    error,
    refetch,
    createMenuItem: createMenuItemMutation.mutateAsync,
    updateMenuItem: updateMenuItemMutation.mutateAsync,
    toggleAvailability: toggleAvailabilityMutation.mutateAsync,
    deleteMenuItem: deleteMenuItemMutation.mutateAsync,
    isCreating: createMenuItemMutation.isPending,
    isUpdating: updateMenuItemMutation.isPending,
    isDeleting: deleteMenuItemMutation.isPending,
    isTogglingAvailability: toggleAvailabilityMutation.isPending,
  };
}
