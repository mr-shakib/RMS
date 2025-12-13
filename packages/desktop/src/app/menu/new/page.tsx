'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { toast } from '@/store/toastStore';
import { useCurrency } from '@/hooks/useCurrency';

export default function NewMenuItemPage() {
  const router = useRouter();
  const { createMenuItem, isCreating } = useMenu();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { symbol } = useCurrency();
  
  const [formData, setFormData] = useState({
    name: '',
    itemNumber: '',
    categoryId: '', // The actual category (Main Course, Appetizer, etc.)
    price: '',
    description: '',
    imageUrl: '',
    available: true,
    alwaysPriced: false, // If true, item is always individually priced (even in buffet)
    addToLunchBuffet: false,
    addToDinnerBuffet: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Get buffet and regular categories
  const buffetCategories = categories.filter((cat) => cat.isBuffet);
  const regularCategories = categories.filter((cat) => !cat.isBuffet);
  
  // Get the buffet category based on main category selection
  const dinnerBuffetCategory = buffetCategories.find((cat) => cat.name.toLowerCase().includes('dinner'));
  const launchBuffetCategory = buffetCategories.find((cat) => cat.name.toLowerCase().includes('launch') || cat.name.toLowerCase().includes('lunch'));
  
  // Get categories to display based on main category filter
  const displayCategories = regularCategories; // Always show regular categories as subcategories

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
      toast.success('Image uploaded successfully', 'Success');
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
      setFormData((prev) => {
        const newData = { ...prev, [name]: value };
        
        // Auto-detect if item should be always priced based on category
        if (name === 'categoryId' && value) {
          const selectedCat = categories.find(cat => cat.id === value);
          if (selectedCat) {
            const categoryName = selectedCat.name.toLowerCase();
            // Auto-check alwaysPriced for beverages, desserts, drinks, sweets
            if (categoryName.includes('beverage') || categoryName.includes('dessert') || 
                categoryName.includes('drink') || categoryName.includes('sweet')) {
              newData.alwaysPriced = true;
            }
          }
        }
        
        return newData;
      });
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
    
    console.log('🔵 Form submitted!');
    console.log('📝 Form data:', formData);

    if (!validateForm()) {
      console.log('❌ Form validation failed', errors);
      toast.error('Please fill in all required fields', 'Validation Error');
      return;
    }
    
    console.log('✅ Form validation passed');

    try {
      console.log('🚀 Creating menu item...');
      // Determine buffet category assignments
      const buffetCategoryIds: string[] = [];
      
      // Add buffets to the array
      if (formData.addToLunchBuffet && launchBuffetCategory) {
        buffetCategoryIds.push(launchBuffetCategory.id);
      }
      if (formData.addToDinnerBuffet && dinnerBuffetCategory) {
        buffetCategoryIds.push(dinnerBuffetCategory.id);
      }
      
      const menuItemData = {
        name: formData.name.trim(),
        categoryId: formData.categoryId,
        buffetCategoryIds: buffetCategoryIds.length > 0 ? buffetCategoryIds : undefined,
        price: parseFloat(formData.price),
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        available: formData.available,
        itemNumber: formData.itemNumber ? parseInt(formData.itemNumber) : undefined,
        alwaysPriced: formData.alwaysPriced,
      };
      
      console.log('📦 Sending menu item data:', menuItemData);
      
      // Create the menu item with categories assigned
      const result = await createMenuItem(menuItemData);
      
      console.log('✅ Menu item created successfully:', result);
      toast.success('Menu item created successfully!', 'Success');
      setTimeout(() => {
        console.log('↪️  Redirecting to menu page...');
        router.push('/menu');
      }, 1000);
    } catch (error: any) {
      console.error('❌ Error creating menu item:', error);
      let errorMessage = error.message || 'Failed to create menu item';
      
      // Handle payload too large error
      if (error.message?.includes('too large') || error.message?.includes('PayloadTooLarge')) {
        errorMessage = 'Image file is too large. Please upload a smaller image (recommended: under 2MB).';
      }
      
      toast.error(errorMessage, 'Error');
      setErrors({ submit: errorMessage });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/menu');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add Menu Item</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new menu item for your restaurant
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-400 font-medium">
            ✓ Menu item created successfully! Redirecting...
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
                     focus:border-transparent ${
                       errors.name
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
                     focus:border-transparent ${
                       errors.itemNumber
                         ? 'border-red-500 dark:border-red-500'
                         : 'border-gray-300 dark:border-gray-600'
                     }`}
            placeholder="Leave empty for auto-assignment"
          />
          {errors.itemNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.itemNumber}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optional: Assign a specific number or leave empty to auto-assign the next available number
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Category <span className="text-red-500">*</span>
          </label>
          
          {/* Category Selection */}
          {categoriesLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading categories...</div>
          ) : displayCategories.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No categories available. Please create categories first.
            </div>
          ) : (
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 
                         text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent ${
                           errors.categoryId
                             ? 'border-red-500 dark:border-red-500'
                             : 'border-gray-300 dark:border-gray-600'
                         }`}
              >
                <option value="">Select a category</option>
                {displayCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This item will appear in the All Items menu and any buffets selected below
              </p>
            </div>
          )}
          {errors.categoryId && (
            <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
          )}
        </div>
          
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
          {(formData.addToLunchBuffet || formData.addToDinnerBuffet) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              This price will be shown in the All Items menu. Buffet pricing is based on the buffet category rate.
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
                       focus:border-transparent ${
                         errors.price
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
                    {uploadedFile?.name || 'Image uploaded'}
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
                This is automatically checked for Beverage and Dessert categories.
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
            disabled={isCreating || categoriesLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Menu Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
