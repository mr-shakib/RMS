'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTables } from '@/hooks/useTables';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { ArrowLeftIcon, XMarkIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '@/hooks/useCurrency';

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
  const { formatCurrency } = useCurrency();
  
  const { tables } = useTables();
  const { menuItems, isLoading: menuLoading } = useMenu();
  const { categories, isLoading: categoriesLoading } = useCategories();
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [buffetCount, setBuffetCount] = useState(1);
  
  // Drag scrolling for categories
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
        // Include items where primary category matches
        const isPrimaryMatch = item.categoryId === selectedCategoryId;
        // Or any buffet category matches (buffet items can also be in regular categories)
        const buffetCats = (item as any).buffetCategories || [];
        const isBuffetMatch = buffetCats.some((bc: any) => bc.buffetCategoryId === selectedCategoryId);
        return isPrimaryMatch || isBuffetMatch;
      });
    }
    
    // Filter by search query (name or item number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const numberMatch = (item as any).itemNumber?.toString() === searchQuery.trim();
        return nameMatch || numberMatch;
      });
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

  // Drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!categoryScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - categoryScrollRef.current.offsetLeft);
    setScrollLeft(categoryScrollRef.current.scrollLeft);
    categoryScrollRef.current.style.cursor = 'grabbing';
    categoryScrollRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    if (!categoryScrollRef.current) return;
    setIsDragging(false);
    categoryScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseUp = () => {
    if (!categoryScrollRef.current) return;
    setIsDragging(false);
    categoryScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    categoryScrollRef.current.scrollLeft = scrollLeft - walk;
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/tables')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {currentTable?.name || `Table ${tableId}`}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Create new order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Menu Items */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 lg:border-r border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Category Bar */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Category</h2>
            <div 
              ref={categoryScrollRef}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              <button
                onClick={() => setSelectedCategoryId(null)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium whitespace-nowrap transition-colors text-sm sm:text-base flex-shrink-0
                  ${
                    !selectedCategoryId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                All Items
              </button>
              {categoriesLoading ? (
                <div className="px-4 sm:px-6 py-2 sm:py-3 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Loading categories...</div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium whitespace-nowrap transition-colors text-sm sm:text-base flex-shrink-0
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
          <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
            <div className="space-y-3 sm:space-y-4">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search by name or item number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Menu Items Grid */}
              {menuLoading ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading menu items...</span>
                      </div>
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No items found' : selectedCategoryId ? 'No items in this category' : 'No available menu items'}
                      </p>
                    </div>
                  ) : selectedCategory?.isBuffet ? (
                    // Buffet category UI
                    <div className="max-w-md mx-auto">
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 bg-white dark:bg-gray-800">
                        <div className="text-center mb-4 sm:mb-6">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {selectedCategory.name}
                          </h3>
                          <p className="text-xl sm:text-2xl text-blue-600 dark:text-blue-400 font-bold">
                            {formatCurrency(Number(selectedCategory.buffetPrice))} <span className="text-xs sm:text-sm font-normal">per person</span>
                          </p>
                        </div>
                        
                        <div className="mb-4 sm:mb-6">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of People
                          </label>
                          <div className="flex items-center justify-center gap-3 sm:gap-4">
                            <button
                              onClick={() => setBuffetCount(Math.max(1, buffetCount - 1))}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 
                                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                                       flex items-center justify-center text-lg sm:text-xl font-semibold"
                            >
                              -
                            </button>
                            <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white w-12 sm:w-16 text-center">
                              {buffetCount}
                            </span>
                            <button
                              onClick={() => setBuffetCount(buffetCount + 1)}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 
                                       hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                                       flex items-center justify-center text-lg sm:text-xl font-semibold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handleBuffetAdd}
                          className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white 
                                   rounded-lg font-semibold transition-colors text-sm sm:text-base"
                        >
                          Add Buffet to Order
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular menu items grid - Responsive columns
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                      {filteredMenuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItemToOrder(item)}
                          className="relative border-2 border-gray-200 dark:border-gray-700 rounded-lg
                                   hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all
                                   bg-white dark:bg-gray-800 overflow-hidden aspect-square group"
                        >
                          {/* Background Image */}
                          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                          
                          {/* Item Number Badge */}
                          <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shadow-lg">
                            #{(item as any).itemNumber}
                          </div>
                          
                          {/* Content Overlay */}
                          <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3">
                            <h3 className="font-bold text-white text-center text-xs sm:text-sm md:text-base line-clamp-2 mb-1">
                              {item.name}
                            </h3>
                            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-yellow-400 font-bold text-center">
                              {formatCurrency(Number(item.price))}
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
        <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-gray-50 dark:bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 max-h-[40vh] lg:max-h-none">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Order Items ({orderItems.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            <div>
              {orderItems.length === 0 ? (
                <div className="h-full flex items-center justify-center py-8 sm:py-12">
                  <div className="text-center">
                    <ShoppingCartIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      No items added yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div
                      key={item.menuItemId}
                      className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeItemFromOrder(item.menuItemId)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity - 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg
                                     bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                     text-gray-700 dark:text-gray-300 flex-shrink-0"
                          >
                            <MinusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <span className="w-6 sm:w-8 text-center font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(item.menuItemId, item.quantity + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg
                                     bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                                     text-gray-700 dark:text-gray-300 flex-shrink-0"
                          >
                            <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4 flex-shrink-0">
            <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-bold pt-1.5 sm:pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.total)}</span>
              </div>
            </div>
            <button
              onClick={handleCreateOrder}
              disabled={createOrderMutation.isPending || orderItems.length === 0}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                       font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {createOrderMutation.isPending ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
