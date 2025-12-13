/**
 * Example Menu Item Form Component
 * This shows how to implement the UI for the new many-to-many buffet category relationship
 * 
 * Replace the old checkbox approach with a multi-select or checkbox list
 */

import React, { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  isBuffet: boolean;
  buffetPrice?: number;
}

interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  buffetCategoryIds: string[];
  price: number;
  description?: string;
  available: boolean;
}

interface MenuItemFormProps {
  item?: MenuItem;  // If editing existing item
  onSubmit: (data: Partial<MenuItem>) => Promise<void>;
  onCancel: () => void;
}

export function MenuItemForm({ item, onSubmit, onCancel }: MenuItemFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: item?.name || '',
    categoryId: item?.categoryId || '',
    buffetCategoryIds: item?.buffetCategoryIds || [],
    price: item?.price?.toString() || '',
    description: item?.description || '',
    available: item?.available ?? true,
  });

  useEffect(() => {
    // Fetch categories
    fetch('/api/menu/categories')
      .then(res => res.json())
      .then(data => setCategories(data.data.categories));
  }, []);

  // Separate regular and buffet categories
  const regularCategories = categories.filter(c => !c.isBuffet);
  const buffetCategories = categories.filter(c => c.isBuffet);

  const handleBuffetToggle = (buffetId: string) => {
    setFormData(prev => {
      const buffetIds = prev.buffetCategoryIds;
      const isSelected = buffetIds.includes(buffetId);
      
      return {
        ...prev,
        buffetCategoryIds: isSelected
          ? buffetIds.filter(id => id !== buffetId)  // Remove
          : [...buffetIds, buffetId],                // Add
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      buffetCategoryIds: formData.buffetCategoryIds,
      price: parseFloat(formData.price),
      description: formData.description.trim() || undefined,
      available: formData.available,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
      </div>

      {/* Primary Category (for "All Items") */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Category (All Items Menu) <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.categoryId}
          onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
          required
        >
          <option value="">Select a category</option>
          {regularCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          This determines where the item appears in the "All Items" menu
        </p>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Individual Price <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Price when ordered individually (not from buffet)
        </p>
      </div>

      {/* Buffet Category Assignment (Many-to-Many) */}
      <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
        <label className="block text-sm font-medium mb-3">
          Add to Buffet Categories (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Select which buffet(s) this item should appear in. You can select multiple buffets.
        </p>
        
        {buffetCategories.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No buffet categories available</p>
        ) : (
          <div className="space-y-2">
            {buffetCategories.map(buffet => (
              <label
                key={buffet.id}
                className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-purple-100"
              >
                <input
                  type="checkbox"
                  checked={formData.buffetCategoryIds.includes(buffet.id)}
                  onChange={() => handleBuffetToggle(buffet.id)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm font-medium">
                  {buffet.name}
                  {buffet.buffetPrice && (
                    <span className="text-gray-500 ml-2">
                      (€{buffet.buffetPrice.toFixed(2)})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Show selected buffets */}
        {formData.buffetCategoryIds.length > 0 && (
          <div className="mt-3 p-2 bg-purple-100 rounded">
            <p className="text-xs font-medium text-purple-800">
              ✓ This item will appear in:
            </p>
            <ul className="text-xs text-purple-700 mt-1 ml-4 list-disc">
              {formData.buffetCategoryIds.map(id => {
                const buffet = buffetCategories.find(b => b.id === id);
                return buffet ? <li key={id}>{buffet.name}</li> : null;
              })}
              <li>All Items menu (with individual pricing)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
        />
      </div>

      {/* Available */}
      <div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.available}
            onChange={e => setFormData(prev => ({ ...prev, available: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Available for ordering</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {item ? 'Update Item' : 'Create Item'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * Example usage in a page component:
 */
export function ExampleUsage() {
  const handleCreateItem = async (data: Partial<MenuItem>) => {
    const response = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create item');
    }
    
    const result = await response.json();
    console.log('Created item:', result.data.menuItem);
  };

  const handleUpdateItem = async (itemId: string, data: Partial<MenuItem>) => {
    const response = await fetch(`/api/menu/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update item');
    }
    
    const result = await response.json();
    console.log('Updated item:', result.data.menuItem);
  };

  return (
    <div>
      <h1>Create New Menu Item</h1>
      <MenuItemForm
        onSubmit={handleCreateItem}
        onCancel={() => console.log('Cancelled')}
      />
    </div>
  );
}

/**
 * Example: Display menu item with buffet badges
 */
export function MenuItemCard({ item }: { item: MenuItem & { buffetCategories?: Category[] } }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold">{item.name}</h3>
      <p className="text-sm text-gray-600">{item.description}</p>
      <p className="text-lg font-semibold mt-2">€{item.price.toFixed(2)}</p>
      
      {/* Show buffet badges */}
      {item.buffetCategories && item.buffetCategories.length > 0 && (
        <div className="flex gap-2 mt-2">
          {item.buffetCategories.map(buffet => (
            <span
              key={buffet.id}
              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
            >
              {buffet.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example: Filter menu items by buffet
 */
export function BuffetMenuView({ buffetCategoryId }: { buffetCategoryId: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    // Fetch all items with buffet information
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        // Filter items that belong to this buffet
        const buffetItems = data.data.menuItems.filter((item: any) => 
          item.buffetCategories?.some((bc: any) => 
            bc.buffetCategory.id === buffetCategoryId
          )
        );
        setItems(buffetItems);
      });
  }, [buffetCategoryId]);

  return (
    <div>
      <h2>Buffet Menu</h2>
      <div className="grid gap-4">
        {items.map(item => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
