'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { useMenu } from '@/hooks/useMenu';
import { useCategories } from '@/hooks/useCategories';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { OrderStatus, PaymentMethod } from '@rms/shared';
import { XMarkIcon, CheckCircleIcon, PlusIcon, MinusIcon, ShoppingCartIcon, PrinterIcon } from '@heroicons/react/24/outline';

interface PaymentFormData {
  discount: number;
  discountType: 'percentage' | 'fixed';
  serviceCharge: number;
  tip: number;
  paymentMethod: PaymentMethod;
}

interface ManualOrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// Manual Bill Receipt Modal Component
interface ManualBillReceiptModalProps {
  receipt: any;
  onClose: () => void;
}

function ManualBillReceiptModal({ receipt, onClose }: ManualBillReceiptModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Bill Processed
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receipt Preview
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-4">
          {/* Bill Info */}
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Bill ID</p>
            <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
              {receipt.billId}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {new Date(receipt.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {receipt.items.map((item: ManualOrderItem) => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-gray-900 dark:text-white">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span>${receipt.totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Tax ({receipt.totals.taxRate}%):</span>
              <span>${receipt.totals.tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>Total:</span>
                <span>${receipt.totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {receipt.paymentMethod}
              </span>
            </div>
            {receipt.paymentMethod === PaymentMethod.CASH && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cash Received:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${receipt.cashReceived.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Change:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ${receipt.change.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white 
                     rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            ✓ Receipt has been printed
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { orders, isLoading } = useOrders();
  const { tables } = useTables();
  const { menuItems, isLoading: menuLoading } = useMenu();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    discount: 0,
    discountType: 'percentage',
    serviceCharge: 0,
    tip: 0,
    paymentMethod: PaymentMethod.CASH,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processedPayment, setProcessedPayment] = useState<any>(null);
  
  // Manual billing state
  const [manualOrderItems, setManualOrderItems] = useState<ManualOrderItem[]>([]);
  const [showPrintingAnimation, setShowPrintingAnimation] = useState(false);
  
  // Manual bill payment state
  const [manualBillPaymentMethod, setManualBillPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashReceived, setCashReceived] = useState(0);
  const [showManualBillReceipt, setShowManualBillReceipt] = useState(false);
  const [manualBillReceipt, setManualBillReceipt] = useState<any>(null);

  // Fetch global tax rate from settings
  const { data: taxRateSetting } = useQuery({
    queryKey: ['setting', 'TAX_RATE'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ status: string; data: { setting: { key: string; value: string } } }>('/settings/TAX_RATE');
        return parseFloat(response.data.setting.value);
      } catch (error) {
        // If setting doesn't exist, return default 10%
        return 10;
      }
    },
  });

  const taxRate = taxRateSetting || 10;

  // Filter unpaid orders (status: SERVED)
  const unpaidOrders = useMemo(() => {
    const ordersList = Array.isArray(orders) ? orders : [];
    return ordersList.filter((order) => order.status === OrderStatus.SERVED);
  }, [orders]);

  // Get selected order details
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return unpaidOrders.find((order) => order.id === selectedOrderId) || null;
  }, [selectedOrderId, unpaidOrders]);

  // Calculate totals with discounts, service charge, and tip
  const calculatedTotals = useMemo(() => {
    if (!selectedOrder) {
      return {
        subtotal: 0,
        tax: 0,
        discount: 0,
        serviceCharge: 0,
        tip: 0,
        total: 0,
      };
    }

    const subtotal = Number(selectedOrder.subtotal);
    const tax = Number(selectedOrder.tax);
    
    // Calculate discount
    let discountAmount = 0;
    if (paymentForm.discountType === 'percentage') {
      discountAmount = (subtotal * paymentForm.discount) / 100;
    } else {
      discountAmount = paymentForm.discount;
    }

    const serviceCharge = paymentForm.serviceCharge;
    const tip = paymentForm.tip;
    
    // Total = subtotal + tax - discount + serviceCharge + tip
    const total = subtotal + tax - discountAmount + serviceCharge + tip;

    return {
      subtotal,
      tax,
      discount: discountAmount,
      serviceCharge,
      tip,
      total: Math.max(0, total), // Ensure total is not negative
    };
  }, [selectedOrder, paymentForm]);

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId) throw new Error('No order selected');

      // First update the order with discount, service charge, and tip
      await apiClient.patch(`/orders/${selectedOrderId}`, {
        discount: calculatedTotals.discount,
        serviceCharge: calculatedTotals.serviceCharge,
        tip: calculatedTotals.tip,
      });

      // Then process the payment
      const response = await apiClient.post('/payments', {
        orderId: selectedOrderId,
        amount: calculatedTotals.total,
        method: paymentForm.paymentMethod,
      });

      return response;
    },
    onSuccess: async (response: any) => {
      // Show printing animation
      setShowPrintingAnimation(true);
      
      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowPrintingAnimation(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrderId] });
      
      // Store payment info for confirmation
      setProcessedPayment({
        ...response.data,
        order: selectedOrder,
        totals: calculatedTotals,
      });
      
      // Show confirmation modal
      setShowConfirmation(true);
      
      // Reset form
      resetForm();
    },
    onError: (error: any) => {
      alert(`Payment failed: ${error.message || 'Unknown error'}`);
    },
  });

  const resetForm = () => {
    setPaymentForm({
      discount: 0,
      discountType: 'percentage',
      serviceCharge: 0,
      tip: 0,
      paymentMethod: PaymentMethod.CASH,
    });
    setSelectedOrderId(null);
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    // Reset form when selecting a new order
    setPaymentForm({
      discount: 0,
      discountType: 'percentage',
      serviceCharge: 0,
      tip: 0,
      paymentMethod: PaymentMethod.CASH,
    });
  };

  const handleProcessPayment = () => {
    if (!selectedOrderId) {
      alert('Please select an order first');
      return;
    }

    if (calculatedTotals.total <= 0) {
      alert('Total amount must be greater than zero');
      return;
    }

    processPaymentMutation.mutate();
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setProcessedPayment(null);
  };

  // Manual billing functions
  const clearManualBilling = () => {
    setManualOrderItems([]);
    setManualBillPaymentMethod(PaymentMethod.CASH);
    setCashReceived(0);
  };

  const addItemToManualOrder = (menuItem: any) => {
    setManualOrderItems((prev) => {
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

  const updateItemQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setManualOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
    } else {
      setManualOrderItems((prev) =>
        prev.map((item) =>
          item.menuItemId === menuItemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const removeItemFromManualOrder = (menuItemId: string) => {
    setManualOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  // Calculate manual bill totals
  const manualBillTotals = useMemo(() => {
    const subtotal = manualOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      taxRate,
      total: Math.max(0, total),
    };
  }, [manualOrderItems, taxRate]);

  // Process manual bill (direct payment, no order creation)
  const processManualBillMutation = useMutation({
    mutationFn: async () => {
      if (manualOrderItems.length === 0) {
        throw new Error('Please add at least one item');
      }

      // Simulate printing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Return receipt data
      return {
        billId: `BILL-${Date.now()}`,
        items: manualOrderItems,
        totals: manualBillTotals,
        paymentMethod: manualBillPaymentMethod,
        cashReceived,
        change: manualBillPaymentMethod === PaymentMethod.CASH ? Math.max(0, cashReceived - manualBillTotals.total) : 0,
        timestamp: new Date().toISOString(),
      };
    },
    onSuccess: (receipt) => {
      setShowPrintingAnimation(false);
      setManualBillReceipt(receipt);
      setShowManualBillReceipt(true);
      // Don't close modal - reset items for next order
      setManualOrderItems([]);
      setManualBillPaymentMethod(PaymentMethod.CASH);
      setCashReceived(0);
    },
    onError: (error: any) => {
      setShowPrintingAnimation(false);
      alert(`Failed to process bill: ${error.message || 'Unknown error'}`);
    },
  });

  const handleProcessManualBill = () => {
    if (manualBillPaymentMethod === PaymentMethod.CASH && cashReceived < manualBillTotals.total) {
      alert('Cash received is less than the total amount');
      return;
    }
    
    setShowPrintingAnimation(true);
    processManualBillMutation.mutate();
  };



  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [buffetCount, setBuffetCount] = useState(1);

  const selectedCategory = useMemo(() => {
    return categories.find((cat) => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems.filter((item) => item.available);
    
    // Filter out buffet items - buffet is only for dine-in, not takeaway
    const buffetCategoryIds = categories.filter((cat) => cat.isBuffet).map((cat) => cat.id);
    items = items.filter((item) => !buffetCategoryIds.includes(item.categoryId));
    
    // Filter by category if selected and not buffet
    if (selectedCategoryId && !selectedCategory?.isBuffet) {
      items = items.filter((item) => item.categoryId === selectedCategoryId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }
    
    return items;
  }, [menuItems, selectedCategoryId, selectedCategory, searchQuery, categories]);

  const changeAmount = useMemo(() => {
    if (manualBillPaymentMethod !== PaymentMethod.CASH) return 0;
    return Math.max(0, cashReceived - manualBillTotals.total);
  }, [manualBillPaymentMethod, cashReceived, manualBillTotals.total]);

  const handleBuffetAdd = () => {
    if (!selectedCategory) return;
    
    // Get buffet price from the category's buffetPrice field
    const buffetPrice = selectedCategory.buffetPrice || 0;
    
    if (buffetPrice <= 0) {
      alert('Buffet price is not set for this category. Please contact the administrator.');
      return;
    }
    
    // For buffet, we add a special item representing the buffet charge
    const buffetItem = {
      menuItemId: `buffet-${selectedCategory.id}`,
      name: `${selectedCategory.name} Buffet`,
      price: buffetPrice,
      quantity: buffetCount,
    };
    
    // Check if buffet already added
    const existing = manualOrderItems.find((item) => item.menuItemId === buffetItem.menuItemId);
    if (existing) {
      updateItemQuantity(buffetItem.menuItemId, existing.quantity + buffetCount);
    } else {
      addItemToManualOrder(buffetItem);
    }
    
    setBuffetCount(1);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Category Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
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
              categories
                .filter((category) => !category.isBuffet) // Filter out buffet categories for takeaway
                .map((category) => (
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
              </button>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Search Items */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Search items</h3>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
            {/* Buffet Section */}
            {selectedCategory?.isBuffet ? (
              <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🍽️</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedCategory.name} Buffet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Flat rate pricing - no need to select individual items
                  </p>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Number of people:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBuffetCount(Math.max(1, buffetCount - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-bold text-lg text-gray-900 dark:text-white">
                        {buffetCount}
                      </span>
                      <button
                        onClick={() => setBuffetCount(buffetCount + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleBuffetAdd}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white 
                             rounded-lg font-semibold transition-colors"
                  >
                    Add Buffet ($
                    {selectedCategory.buffetPrice 
                      ? (selectedCategory.buffetPrice * buffetCount).toFixed(2)
                      : 'Price not set'
                    })
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {filteredMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItemToManualOrder(item)}
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
              </>
            )}
          </div>
        </div>
        </div>

        {/* Right Side - Items Added */}
        <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Items Added</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div>
              {manualOrderItems.length === 0 ? (
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
                  {manualOrderItems.map((item) => (
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
                          onClick={() => removeItemFromManualOrder(item.menuItemId)}
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
        </div>
      </div>

      {/* Bottom Bar - Actions */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 flex items-center gap-4">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Discount %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              className="w-20 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex-1"></div>

          {/* Buttons */}
          <button
            onClick={clearManualBilling}
            disabled={processManualBillMutation.isPending}
            className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-semibold transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handleProcessManualBill}
            disabled={processManualBillMutation.isPending || manualOrderItems.length === 0}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            {processManualBillMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <PrinterIcon className="w-5 h-5" />
                <span>Print Invoice</span>
              </>
            )}
          </button>

          {/* Total */}
          <div className="ml-4 px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg min-w-[120px]">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${manualBillTotals.total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Bill Receipt Modal */}
      {showManualBillReceipt && manualBillReceipt && (
        <ManualBillReceiptModal
          receipt={manualBillReceipt}
          onClose={() => {
            setShowManualBillReceipt(false);
            setManualBillReceipt(null);
          }}
        />
      )}

      {/* Printing Animation Overlay */}
      {showPrintingAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="relative inline-block">
                <PrinterIcon className="w-20 h-20 text-blue-600 dark:text-blue-400 mx-auto animate-bounce" />
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
                Printing Receipt...
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please wait while we print your receipt
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
