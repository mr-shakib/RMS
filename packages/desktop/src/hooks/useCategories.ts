import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Category, CreateCategoryDTO } from '@rms/shared';

interface CategoryWithCount extends Category {
  _count?: {
    menuItems: number;
  };
}

export function useCategories() {
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading, error, refetch } = useQuery<CategoryWithCount[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get<{ status: string; data: { categories: CategoryWithCount[] } }>('/categories');
      const list = response.data?.categories || [];
      return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CreateCategoryDTO) => {
      const response = await apiClient.post<{ status: string; data: { category: Category } }>('/categories', data);
      return response.data.category;
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData<CategoryWithCount[]>(['categories'], (old) => {
        const updated = [...(old || []), newCategory];
        return updated.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      const response = await apiClient.patch<{ status: string; data: { category: Category } }>(`/categories/${id}`, data);
      return response.data.category;
    },
    onSuccess: (updatedCategory) => {
      queryClient.setQueryData<CategoryWithCount[]>(['categories'], (old) => {
        const updated = (old || []).map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat));
        return updated.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<CategoryWithCount[]>(['categories'], (old) => {
        if (!old) return [];
        return old.filter((cat) => cat.id !== deletedId);
      });
    },
  });

  return {
    categories: categories || [],
    isLoading,
    error,
    refetch,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isCreating: createCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isDeleting: deleteCategoryMutation.isPending,
  };
}
