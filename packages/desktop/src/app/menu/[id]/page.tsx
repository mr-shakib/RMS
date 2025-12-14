'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { ArrowLeftIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from '@/store/toastStore';

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { menuItems, createMenuItem, updateMenuItem, deleteMenuItem, isUpdating, isDeleting } = useMenu();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { formatCurrency, symbol } = useCurrency();

  const [formData, setFormData] = useState({
    name: '',
    itemNumber: '',
    categoryId: '', // The actual category (Main Course, Appetizer, etc.)
    secondaryCategoryId: '',
    price: '',
    description: '',
    imageUrl: '',
    available: true,
    alwaysPriced: false,
    addToLunchBuffet: false,
    addToDinnerBuffet: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Get buffet and regular categories
  const buffetCategories = Array.isArray(categories) ? categories.filter((cat) => cat.isBuffet) : [];
  const regularCategories = Array.isArray(categories) ? categories.filter((cat) => !cat.isBuffet) : [];
  const selectedCategory = Array.isArray(categories) ? categories.find((cat) => cat.id === formData.categoryId) : undefined;

  // Get the buffet category based on main category selection
  const dinnerBuffetCategory = buffetCategories.find((cat) => cat.name.toLowerCase().includes('dinner'));
  const launchBuffetCategory = buffetCategories.find((cat) => cat.name.toLowerCase().includes('launch') || cat.name.toLowerCase().includes('lunch'));

  // Load menu item data
  useEffect(() => {
    const item = menuItems.find((m) => m.id === itemId);
    if (item) {
      // Get buffet categories from the junction table
      const buffetCats = (item as any).buffetCategories || [];
      const buffetCategoryIds = buffetCats.map((bc: any) => bc.buffetCategoryId);

      // Check buffet membership
      const isInLunchBuffet = buffetCategoryIds.includes(launchBuffetCategory?.id);
      const isInDinnerBuffet = buffetCategoryIds.includes(dinnerBuffetCategory?.id);

      setFormData({
        name: item.name,
        itemNumber: (item as any).itemNumber?.toString() || '',
        categoryId: item.categoryId,
        secondaryCategoryId: '', // No longer used
        price: item.price.toString(),
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        available: item.available,
        alwaysPriced: (item as any).alwaysPriced || false,
        addToLunchBuffet: isInLunchBuffet,
        addToDinnerBuffet: isInDinnerBuffet,
      });
      if (item.imageUrl) {
        setImagePreview(item.imageUrl);
      }
      setIsLoading(false);
    } else if (menuItems.length > 0) {
      // Item not found and menu items are loaded
      setIsLoading(false);
    }
  }, [itemId, menuItems, categories, launchBuffetCategory, dinnerBuffetCategory]);

  // Handle image file upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, JPEG, GIF)', 'Invalid File Type');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`Image size is ${sizeMB}MB. Please choose an image smaller than 5MB.`, 'File Too Large');
      e.target.value = ''; // Reset input
      return;
    }

    setUploadedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setFormData((prev) => ({ ...prev, imageUrl: base64String }));
      toast.success('Image uploaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read the image file. Please try again.', 'Upload Error');
      e.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);

    // Clear error
    if (errors.image) {
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setUploadedFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.itemNumber) {
      const itemNum = parseInt(formData.itemNumber);
      if (isNaN(itemNum) || itemNum < 1) {
        newErrors.itemNumber = 'Item number must be a positive number';
      }
    }

    // Category validation
    // Category is always required
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        newErrors.price = 'Price must be a valid positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Determine buffet category assignments
      const buffetCategoryIds: string[] = [];
      
      // Add buffets to the array
      if (formData.addToLunchBuffet && launchBuffetCategory) {
        buffetCategoryIds.push(launchBuffetCategory.id);
      }
      if (formData.addToDinnerBuffet && dinnerBuffetCategory) {
        buffetCategoryIds.push(dinnerBuffetCategory.id);
      }

      await updateMenuItem({
        id: itemId,
        data: {
          name: formData.name.trim(),
          categoryId: formData.categoryId,
          buffetCategoryIds: buffetCategoryIds.length > 0 ? buffetCategoryIds : [],
          price: parseFloat(formData.price),
          description: formData.description.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          available: formData.available,
          itemNumber: formData.itemNumber ? parseInt(formData.itemNumber) : undefined,
          alwaysPriced: formData.alwaysPriced,
        },
      });

      toast.success('Menu item updated successfully!', 'Success');
      setTimeout(() => {
        router.push('/menu');
      }, 1000);
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to update menu item';

      // Handle payload too large error
      if (error.message?.includes('too large') || error.message?.includes('PayloadTooLarge')) {
        errorMessage = 'Image file is too large. Please upload a smaller image (recommended: under 2MB).';
      }

      toast.error(errorMessage, 'Error');
      setErrors({ submit: errorMessage });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteMenuItem(itemId);
      toast.success('Menu item deleted successfully!', 'Success');
      setTimeout(() => {
        router.push('/menu');
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete menu item', 'Error');
      setErrors({ submit: error.message || 'Failed to delete menu item' });
      setShowDeleteModal(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/menu');
  };

  // Loading state
  if (isLoading || categoriesLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading menu item...</span>
          </div>
        </div>
      </div>
    );
  }

  // Item not found
  const item = menuItems.find((m) => m.id === itemId);
  if (!item) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Menu item not found</p>
            <button
              onClick={handleCancel}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Menu Item</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update menu item details
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 
                   text-white rounded-lg transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
          Delete
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-400 font-medium">
            ✓ Menu item updated successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent ${errors.name
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
              }`}
            placeholder="e.g., Margherita Pizza"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Item Number */}
        <div>
          <label htmlFor="itemNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Item Number
          </label>
          <input
            type="number"
            id="itemNumber"
            name="itemNumber"
            value={formData.itemNumber}
            onChange={handleChange}
            min="1"
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent ${errors.itemNumber
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
              }`}
            placeholder="Item number"
          />
          {errors.itemNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.itemNumber}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Change the item number or leave empty to keep current number
          </p>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Primary Category <span className="text-red-500">*</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                     text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                     focus:border-transparent ${errors.categoryId
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
              }`}
          >
            <option value="">Select a category</option>
            {regularCategories.length > 0 && (
              <optgroup label="All Items Categories">
                {regularCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
            {buffetCategories.length > 0 && (
              <optgroup label="Buffet Categories">
                {buffetCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({formatCurrency(Number(category.buffetPrice || 0))})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {errors.categoryId && (
            <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
          )}
        </div>

        {/* Secondary Category (for buffet items) */}
        {selectedCategory?.isBuffet && (
          <div>
            <label htmlFor="secondaryCategoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              All Items Category <span className="text-red-500">*</span>
            </label>
            <select
              id="secondaryCategoryId"
              name="secondaryCategoryId"
              value={formData.secondaryCategoryId}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                       focus:border-transparent ${errors.secondaryCategoryId
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                }`}
            >
              <option value="">Select category for All Items menu</option>
              {regularCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This item will also appear in the All Items menu under this category with individual pricing
            </p>
            {errors.secondaryCategoryId && (
              <p className="text-red-500 text-sm mt-1">{errors.secondaryCategoryId}</p>
            )}
          </div>
        )}

        {/* Buffet Options */}
        <div>
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Add to Buffet (Optional)
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="addToLunchBuffet"
                  checked={formData.addToLunchBuffet}
                  onChange={handleChange}
                  disabled={!launchBuffetCategory}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Add to Lunch Buffet
                  {!launchBuffetCategory && <span className="text-xs text-red-500 ml-2">(Buffet category not found)</span>}
                </span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="addToDinnerBuffet"
                  checked={formData.addToDinnerBuffet}
                  onChange={handleChange}
                  disabled={!dinnerBuffetCategory}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Add to Dinner Buffet
                  {!dinnerBuffetCategory && <span className="text-xs text-red-500 ml-2">(Buffet category not found)</span>}
                </span>
              </label>
            </div>
            {(formData.addToLunchBuffet || formData.addToDinnerBuffet) && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 italic">
                ✓ This item will be available in {formData.addToLunchBuffet && formData.addToDinnerBuffet ? 'both Lunch and Dinner buffets' : formData.addToLunchBuffet ? 'Lunch buffet' : 'Dinner buffet'}
              </p>
            )}
          </div>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Individual Price <span className="text-red-500">*</span>
          </label>
          {selectedCategory?.isBuffet && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              This price will be shown when the item appears in the All Items menu
            </p>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {symbol}
            </span>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                       text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                       focus:border-transparent ${errors.price
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="0.00"
            />
          </div>
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description of the menu item"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Image
          </label>

          {!imagePreview ? (
            <div>
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed 
                         border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer 
                         bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <PhotoIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {errors.image && (
                <p className="text-red-500 text-sm mt-1">{errors.image}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <PhotoIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {uploadedFile?.name || 'Current image'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 
                           dark:hover:text-red-300 font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="available"
            name="available"
            checked={formData.available}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded 
                     focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 
                     focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label htmlFor="available" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Available for ordering
          </label>
        </div>

        {/* Always Priced */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="alwaysPriced"
              name="alwaysPriced"
              checked={formData.alwaysPriced}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 text-purple-600 bg-gray-100 border-gray-300 rounded 
                       focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 
                       focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="ml-3">
              <label htmlFor="alwaysPriced" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Always price individually (even in buffet)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Check this for beverages, desserts, or special items that should be charged separately even when customer orders a buffet.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                     dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Delete Menu Item
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Are you sure you want to delete <strong>{item.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This action cannot be undone. Menu items in active orders cannot be deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                           dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
