'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { PlusIcon, MagnifyingGlassIcon, Cog6ToothIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function MenuPage() {
  const router = useRouter();
  const { menuItems, isLoading, toggleAvailability } = useMenu();
  const { categories, isLoading: categoriesLoading, createCategory, updateCategory, deleteCategory, isCreating, isUpdating, isDeleting } = useCategories();
  
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'BUFFET' | 'ALL_ITEMS'>('ALL_ITEMS');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  
  // Category management modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', isBuffet: false, buffetPrice: 0 });
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Get buffet and regular categories
  const buffetCategories = useMemo(() => {
    return categories.filter((cat) => cat.isBuffet);
  }, [categories]);

  const regularCategories = useMemo(() => {
    return categories.filter((cat) => !cat.isBuffet);
  }, [categories]);

  // Get categories to display based on main filter
  const displayCategories = useMemo(() => {
    if (mainCategoryFilter === 'BUFFET') {
      return ['All', ...buffetCategories.map((cat) => cat.name)];
    } else {
      return ['All', ...regularCategories.map((cat) => cat.name)];
    }
  }, [mainCategoryFilter, buffetCategories, regularCategories]);

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    let filtered = menuItems;

    // Apply main category filter (Buffet vs All Items)
    if (mainCategoryFilter === 'BUFFET') {
      const buffetCategoryIds = buffetCategories.map((cat) => cat.id);
      filtered = filtered.filter((item) => buffetCategoryIds.includes(item.categoryId));
    } else {
      const regularCategoryIds = regularCategories.map((cat) => cat.id);
      filtered = filtered.filter((item) => regularCategoryIds.includes(item.categoryId));
    }

    // Apply subcategory filter
    if (categoryFilter !== 'All') {
      const selectedCat = categories.find((cat) => cat.name === categoryFilter);
      if (selectedCat) {
        filtered = filtered.filter((item) => item.categoryId === selectedCat.id);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [menuItems, categories, mainCategoryFilter, buffetCategories, regularCategories, categoryFilter, searchQuery]);

  // Handle availability toggle
  const handleToggleAvailability = async (itemId: string) => {
    try {
      setTogglingItemId(itemId);
      await toggleAvailability(itemId);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    } finally {
      setTogglingItemId(null);
    }
  };

  // Handle main category change
  const handleMainCategoryChange = (newMainCategory: 'BUFFET' | 'ALL_ITEMS') => {
    setMainCategoryFilter(newMainCategory);
    setCategoryFilter('All'); // Reset subcategory filter
  };

  // Category management handlers
  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    try {
      setCategoryError(null);
      await createCategory({
        name: categoryFormData.name.trim(),
        isBuffet: categoryFormData.isBuffet,
        buffetPrice: categoryFormData.isBuffet ? categoryFormData.buffetPrice : undefined,
      });
      setCategoryFormData({ name: '', isBuffet: false, buffetPrice: 0 });
      setShowAddCategoryModal(false);
    } catch (error: any) {
      setCategoryError(error.message || 'Failed to create category');
    }
  };

  const handleEditCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    if (!selectedCategory) return;

    try {
      setCategoryError(null);
      await updateCategory({
        id: selectedCategory.id,
        data: {
          name: categoryFormData.name.trim(),
          isBuffet: categoryFormData.isBuffet,
          buffetPrice: categoryFormData.isBuffet ? categoryFormData.buffetPrice : undefined,
        },
      });
      setShowEditCategoryModal(false);
      setSelectedCategory(null);
      setCategoryFormData({ name: '', isBuffet: false, buffetPrice: 0 });
    } catch (error: any) {
      setCategoryError(error.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      setCategoryError(null);
      await deleteCategory(selectedCategory.id);
      setShowDeleteCategoryModal(false);
      setSelectedCategory(null);
    } catch (error: any) {
      setCategoryError(error.message || 'Failed to delete category');
    }
  };

  const openEditCategoryModal = (category: any) => {
    setSelectedCategory(category);
    setCategoryFormData({ 
      name: category.name, 
      isBuffet: category.isBuffet,
      buffetPrice: category.buffetPrice || 0
    });
    setCategoryError(null);
    setShowEditCategoryModal(true);
  };

  const openDeleteCategoryModal = (category: any) => {
    setSelectedCategory(category);
    setCategoryError(null);
    setShowDeleteCategoryModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage menu items, categories, and availability
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 
                     text-white rounded-lg transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Manage Categories
          </button>
          <button
            onClick={() => router.push('/menu/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        {/* Main Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Main Category
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleMainCategoryChange('BUFFET')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors
                ${
                  mainCategoryFilter === 'BUFFET'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              🍽️ Buffet
              <span className="ml-2 text-xs opacity-75">
                ({buffetCategories.length} categories)
              </span>
            </button>
            <button
              onClick={() => handleMainCategoryChange('ALL_ITEMS')}
              className={`px-6 py-3 rounded-lg text-sm font-semibold transition-colors
                ${
                  mainCategoryFilter === 'ALL_ITEMS'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              📋 All Items
              <span className="ml-2 text-xs opacity-75">
                ({regularCategories.length} categories)
              </span>
            </button>
          </div>
        </div>

        {/* Subcategory Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {mainCategoryFilter === 'BUFFET' ? 'Buffet Type' : 'Category'}
          </label>
          {categoriesLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading categories...</div>
          ) : displayCategories.length === 1 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No {mainCategoryFilter === 'BUFFET' ? 'buffet' : 'regular'} categories available
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {displayCategories.map((categoryName) => {
                const category = categories.find((cat) => cat.name === categoryName);
                let count = 0;
                
                if (categoryName === 'All') {
                  // Count all items in current main category
                  if (mainCategoryFilter === 'BUFFET') {
                    const buffetCategoryIds = buffetCategories.map((cat) => cat.id);
                    count = menuItems.filter((item) => buffetCategoryIds.includes(item.categoryId)).length;
                  } else {
                    const regularCategoryIds = regularCategories.map((cat) => cat.id);
                    count = menuItems.filter((item) => regularCategoryIds.includes(item.categoryId)).length;
                  }
                } else {
                  count = category ? menuItems.filter((item) => item.categoryId === category.id).length : 0;
                }

                return (
                  <button
                    key={categoryName}
                    onClick={() => setCategoryFilter(categoryName)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        categoryFilter === categoryName
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {categoryName}
                    {category?.isBuffet && category.buffetPrice && (
                      <span className="ml-1 text-xs font-bold">${category.buffetPrice.toFixed(2)}</span>
                    )}
                    <span className="ml-2 text-xs opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div>
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading menu items...</span>
            </div>
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No menu items found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {searchQuery
                  ? 'Try a different search term or filter'
                  : 'Click "Add Menu Item" to create your first menu item'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMenuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                category={categories.find((cat) => cat.id === item.categoryId)}
                onEdit={() => router.push(`/menu/${item.id}`)}
                onToggleAvailability={() => handleToggleAvailability(item.id)}
                isToggling={togglingItemId === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onAdd={() => {
            setShowCategoryModal(false);
            setCategoryFormData({ name: '', isBuffet: false, buffetPrice: 0 });
            setCategoryError(null);
            setShowAddCategoryModal(true);
          }}
          onEdit={openEditCategoryModal}
          onDelete={openDeleteCategoryModal}
        />
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <CategoryFormModal
          title="Add Category"
          formData={categoryFormData}
          error={categoryError}
          isSubmitting={isCreating}
          onChange={setCategoryFormData}
          onSubmit={handleAddCategory}
          onClose={() => {
            setShowAddCategoryModal(false);
            setCategoryFormData({ name: '', isBuffet: false, buffetPrice: 0 });
            setCategoryError(null);
          }}
        />
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && selectedCategory && (
        <CategoryFormModal
          title="Edit Category"
          formData={categoryFormData}
          error={categoryError}
          isSubmitting={isUpdating}
          onChange={setCategoryFormData}
          onSubmit={handleEditCategory}
          onClose={() => {
            setShowEditCategoryModal(false);
            setSelectedCategory(null);
            setCategoryFormData({ name: '', isBuffet: false, buffetPrice: 0 });
            setCategoryError(null);
          }}
        />
      )}

      {/* Delete Category Modal */}
      {showDeleteCategoryModal && selectedCategory && (
        <DeleteCategoryModal
          category={selectedCategory}
          error={categoryError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteCategory}
          onClose={() => {
            setShowDeleteCategoryModal(false);
            setSelectedCategory(null);
            setCategoryError(null);
          }}
        />
      )}
    </div>
  );
}

// Menu Item Card Component
interface MenuItemCardProps {
  item: any;
  category?: any;
  onEdit: () => void;
  onToggleAvailability: () => void;
  isToggling: boolean;
}

function MenuItemCard({ item, category, onEdit, onToggleAvailability, isToggling }: MenuItemCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg 
                 transition-shadow overflow-hidden cursor-pointer"
      onClick={onEdit}
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        {/* Buffet Badge */}
        {category?.isBuffet && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              Buffet
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name and Category */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
          {item.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {category?.name || 'Uncategorized'}
        </p>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Price */}
        <div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
          </span>
        </div>
      </div>
    </div>
  );
}

// Category Management Modal Component
interface CategoryManagementModalProps {
  categories: any[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (category: any) => void;
  onDelete: (category: any) => void;
}

function CategoryManagementModal({ categories, onClose, onAdd, onEdit, onDelete }: CategoryManagementModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Categories</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{category.name}</h3>
                    {category.isBuffet && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        Buffet
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {category._count?.menuItems || 0} items
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(category)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDelete(category)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                     dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}

// Category Form Modal Component
interface CategoryFormModalProps {
  title: string;
  formData: { name: string; isBuffet: boolean; buffetPrice: number };
  error: string | null;
  isSubmitting: boolean;
  onChange: (data: { name: string; isBuffet: boolean; buffetPrice: number }) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function CategoryFormModal({ title, formData, error, isSubmitting, onChange, onSubmit, onClose }: CategoryFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Appetizers"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBuffet"
              checked={formData.isBuffet}
              onChange={(e) => onChange({ ...formData, isBuffet: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded 
                       focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 
                       focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isBuffet" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Buffet category (flat pricing)
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Buffet categories charge customers a flat rate instead of per-item pricing
          </p>

          {formData.isBuffet && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buffet Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.buffetPrice}
                  onChange={(e) => onChange({ ...formData, buffetPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The flat rate customers will pay for this buffet
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                     dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Category Modal Component
interface DeleteCategoryModalProps {
  category: any;
  error: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteCategoryModal({ category, error, isDeleting, onConfirm, onClose }: DeleteCategoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Category</h2>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the category <strong>{category.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. Categories with menu items cannot be deleted.
          </p>

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
