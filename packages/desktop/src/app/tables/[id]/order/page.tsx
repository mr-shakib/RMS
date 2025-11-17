'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTables } from '@/hooks/useTables';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { ArrowLeftIcon, XMarkIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isBuffet?: boolean;
  categoryId?: string;
}

export default function TableOrderPage() {
  const router = useRouter();
  const params = useParams();
  const tableId = params.id as string;
  const queryClient = useQueryClient();
  
  const { tables } = useTables();
  const { menuItems, isLoading: menuLoading } = useMenu();
  const { categories, isLoading: categoriesLoading } = useCategories();
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [buffetCount, setBuffetCount] = useState(1);

  // Find the current table
  const currentTable = useMemo(() => {
    return tables.find((t) => t.id === parseInt(tableId));
  }, [tables, tableId]);

  // Get selected category
  const selectedCategory = useMemo(() => {
    return categories.find((cat) => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    let items = menuItems.filter((item) => item.available);
    
    // Filter by category if selected and not buffet
    if (selectedCategoryId && !selectedCategory?.isBuffet) {
      items = items.filter((item) => {
        // Include items where either primary or secondary category matches
        const isPrimaryMatch = item.categoryId === selectedCategoryId;
        const isSecondaryMatch = (item as any).secondaryCategoryId === selectedCategoryId;
        return isPrimaryMatch || isSecondaryMatch;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }
    
    return items;
  }, [menuItems, selectedCategoryId, selectedCategory, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal;

    return {
      subtotal,
      total,
    };
  }, [orderItems]);

  // Add buffet to order
  const handleBuffetAdd = () => {
    if (selectedCategory && selectedCategory.isBuffet && selectedCategory.buffetPrice) {
      const newItem: OrderItem = {
        menuItemId: `buffet-${selectedCategory.id}`,
        name: selectedCategory.name,
        price: selectedCategory.buffetPrice,
        quantity: buffetCount,
        isBuffet: true,
        categoryId: selectedCategory.id,
      };
      setOrderItems([...orderItems, newItem]);
      setBuffetCount(1);
      setSelectedCategoryId(null);
    }
  };

  // Add item to order
  const addItemToOrder = (menuItem: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.menuItemId === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
        },
      ];
    });
  };

  // Update item quantity
  const updateItemQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
    } else {
      setOrderItems((prev) =>
        prev.map((item) =>
          item.menuItemId === menuItemId ? { ...item, quantity } : item
        )
      );
    }
  };

  // Remove item from order
  const removeItemFromOrder = (menuItemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (orderItems.length === 0) {
        throw new Error('Please add at least one item');
      }

      // Check if this is a buffet order
      const buffetItem = orderItems.find(item => item.isBuffet);
      
      const response = await apiClient.post('/orders', {
        tableId: parseInt(tableId),
        isBuffet: !!buffetItem,
        buffetCategoryId: buffetItem?.categoryId,
        buffetQuantity: buffetItem?.quantity,
        items: buffetItem ? [] : orderItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      router.push('/tables');
    },
    onError: (error: any) => {
      alert(`Failed to create order: ${error.message || 'Unknown error'}`);
    },
  });

  const handleCreateOrder = () => {
    if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    createOrderMutation.mutate();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/tables')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentTable?.name || `Table ${tableId}`}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create new order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Menu Items */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Category Bar */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Category</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-colors min-w-[120px]
                  ${
                    !selectedCategoryId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                All Items
              </button>
              {categoriesLoading ? (
                <div className="px-6 py-3 text-gray-500 dark:text-gray-400">Loading categories...</div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-colors min-w-[120px]
                      ${
                        selectedCategoryId === category.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                  >
                    {category.name}
                    {category.isBuffet && (
                      <span className="ml-1 text-xs">🍽️</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Menu Items Grid */}
              {menuLoading ? (
                    <div className="text-center py-12">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading menu items...</span>
                      </div>
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No items found' : selectedCategoryId ? 'No items in this category' : 'No available menu items'}
                      </p>
                    </div>
                  ) : selectedCategory?.isBuffet ? (
                    // Buffet category UI
                    <div className="max-w-md mx-auto">
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                        <div className="text-center mb-6">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {selectedCategory.name}
                          </h3>
                          <p className="text-2xl text-blue-600 dark:text-blue-400 font-bold">
                            ${Number(selectedCategory.buffetPrice).toFixed(2)} <span className="text-sm font-normal">per person</span>
                          </p>
                        </div>
                        
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of People
                          </label>
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setBuffetCount(Math.max(1, buffetCount - 1))}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 
                                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                                       flex items-center justify-center text-xl font-semibold"
                            >
                              -
                            </button>
                            <span className="text-3xl font-bold text-gray-900 dark:text-white w-16 text-center">
                              {buffetCount}
                            </span>
                            <button
                              onClick={() => setBuffetCount(buffetCount + 1)}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 
                                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                                       flex items-center justify-center text-xl font-semibold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handleBuffetAdd}
                          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white 
                                   rounded-lg font-semibold transition-colors"
                        >
                          Add Buffet to Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular menu items grid
                    <div className="grid grid-cols-4 gap-4">
                      {filteredMenuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItemToOrder(item)}
                          className="border-2 border-gray-200 dark:border-gray-700 rounded-lg
                                   hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all
                                   bg-white dark:bg-gray-800 overflow-hidden flex flex-col group"
                        >
                          {/* Image */}
                          <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-700">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          {/* Content */}
                          <div className="p-4 flex flex-col gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-center text-sm line-clamp-2 min-h-[2.5rem]">
                              {item.name}
                            </h3>
                            <p className="text-lg text-blue-600 dark:text-blue-400 font-bold text-center">
                              ${Number(item.price).toFixed(2)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
            </div>
          </div>
        </div>

        {/* Right Side - Order Items */}
        <div className="w-96 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Order Items</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div>
              {orderItems.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ShoppingCartIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No items added yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${item.price.toFixed(2)} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeItemFromOrder(item.menuItemId)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg
                                     bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                     text-gray-700 dark:text-gray-300"
                          >
                            <MinusIcon className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg
                                     bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                     text-gray-700 dark:text-gray-300"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">${totals.total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleCreateOrder}
              disabled={createOrderMutation.isPending || orderItems.length === 0}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createOrderMutation.isPending ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
