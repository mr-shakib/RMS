import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { apiClient } from '@/lib/apiClient';
import type { Table, CreateTableDTO } from '@rms/shared';

export function useTables() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Fetch tables
  const { data: tables, isLoading, error, refetch } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await apiClient.get<{ status: string; data: { tables: Table[] } }>('/tables');
      return response.data.tables;
    },
  });

  // Subscribe to table updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to tables room
    socket.emit('subscribe:tables');

    // Handle table updated
    const handleTableUpdated = (updatedTable: Table) => {
      queryClient.setQueryData<Table[]>(['tables'], (old) => {
        if (!old) return [updatedTable];
        const exists = old.some((table) => table.id === updatedTable.id);
        if (exists) {
          return old.map((table) => (table.id === updatedTable.id ? updatedTable : table));
        } else {
          return [...old, updatedTable];
        }
      });
    };

    socket.on('table:updated', handleTableUpdated);

    return () => {
      socket.emit('unsubscribe:tables');
      socket.off('table:updated', handleTableUpdated);
    };
  }, [socket, isConnected, queryClient]);

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (data: CreateTableDTO) => {
      const response = await apiClient.post<{ status: string; data: { table: Table } }>('/tables', data);
      return response.data.table;
    },
    onSuccess: (newTable) => {
      queryClient.setQueryData<Table[]>(['tables'], (old) => {
        if (!old) return [newTable];
        // Check if table already exists (from WebSocket) to prevent duplicates
        const exists = old.some((table) => table.id === newTable.id);
        if (exists) {
          return old.map((table) => (table.id === newTable.id ? newTable : table));
        }
        return [...old, newTable];
      });
    },
  });

  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Table> }) => {
      const response = await apiClient.patch<{ status: string; data: { table: Table } }>(`/tables/${id}`, data);
      return response.data.table;
    },
    onSuccess: (updatedTable) => {
      queryClient.setQueryData<Table[]>(['tables'], (old) => {
        if (!old) return [updatedTable];
        return old.map((table) => (table.id === updatedTable.id ? updatedTable : table));
      });
    },
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/tables/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Table[]>(['tables'], (old) => {
        if (!old) return [];
        return old.filter((table) => table.id !== deletedId);
      });
    },
  });

  return {
    tables: tables || [],
    isLoading,
    error,
    refetch,
    createTable: createTableMutation.mutateAsync,
    updateTable: updateTableMutation.mutateAsync,
    deleteTable: deleteTableMutation.mutateAsync,
    isCreating: createTableMutation.isPending,
    isUpdating: updateTableMutation.isPending,
    isDeleting: deleteTableMutation.isPending,
  };
}
