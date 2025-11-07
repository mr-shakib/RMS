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

export default function BillingPage() {
  const { orders, isLoading } = useOrders();
  const { tables } = useTables();
  const { menuItems } = useMenu();
  const { categories } = useCategories();
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
  const [showManualBillingModal, setShowManualBillingModal] = useState(false);
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
  const openManualBillingModal = () => {
    setManualOrderItems([]);
    setManualBillPaymentMethod(PaymentMethod.CASH);
    setCashReceived(0);
    setShowManualBillingModal(true);
  };

  const closeManualBillingModal = () => {
    setShowManualBillingModal(false);
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
      closeManualBillingModal();
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



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing / POS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Process payments for served orders or create manual bills
          </p>
        </div>
        <button
          onClick={openManualBillingModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                   text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create Manual Bill
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Orders List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Unpaid Orders ({unpaidOrders.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading orders...</span>
              </div>
            ) : unpaidOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No unpaid orders</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Orders with status "SERVED" will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {unpaidOrders.map((order) => (
                  <OrderListItem
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onSelect={() => handleOrderSelect(order.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Payment Panel */}
        <div className="space-y-4">
          {selectedOrder ? (
            <>
              {/* Order Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Order Summary
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      #{selectedOrder.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Table:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(selectedOrder as any).table?.name || `Table ${selectedOrder.tableId}`}
                    </span>
                  </div>
                </div>

                {/* Itemized List */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Items
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(selectedOrder as any).items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          ${(Number(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Adjustments */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Payment Adjustments
                </h2>

                <div className="space-y-4">
                  {/* Discount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentForm.discount}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, discount: Number(e.target.value) })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                      <select
                        value={paymentForm.discountType}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            discountType: e.target.value as 'percentage' | 'fixed',
                          })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">$</option>
                      </select>
                    </div>
                    {calculatedTotals.discount > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Discount: -${calculatedTotals.discount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Service Charge */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Service Charge ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.serviceCharge}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, serviceCharge: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Tip */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tip ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.tip}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, tip: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(PaymentMethod).map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: method })}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors
                            ${
                              paymentForm.paymentMethod === method
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                            }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Total Breakdown
                </h2>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal:</span>
                    <span>${calculatedTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Tax:</span>
                    <span>${calculatedTotals.tax.toFixed(2)}</span>
                  </div>
                  {calculatedTotals.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Discount:</span>
                      <span>-${calculatedTotals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {calculatedTotals.serviceCharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Service Charge:</span>
                      <span>${calculatedTotals.serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {calculatedTotals.tip > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Tip:</span>
                      <span>${calculatedTotals.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                      <span>Total:</span>
                      <span>${calculatedTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Process Payment Button */}
                <button
                  onClick={handleProcessPayment}
                  disabled={processPaymentMutation.isPending}
                  className="w-full mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white 
                           rounded-lg font-semibold transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center space-x-2"
                >
                  {processPaymentMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Process Payment</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                  No Order Selected
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Select an order from the list to process payment
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmation && processedPayment && (
        <PaymentConfirmationModal
          payment={processedPayment}
          onClose={closeConfirmation}
        />
      )}

      {/* Manual Billing Modal */}
      {showManualBillingModal && (
        <ManualBillingModal
          menuItems={menuItems}
          categories={categories}
          manualOrderItems={manualOrderItems}
          paymentMethod={manualBillPaymentMethod}
          cashReceived={cashReceived}
          taxRate={taxRate}
          totals={manualBillTotals}
          isProcessing={processManualBillMutation.isPending}
          onAddItem={addItemToManualOrder}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItemFromManualOrder}
          onPaymentMethodChange={setManualBillPaymentMethod}
          onCashReceivedChange={setCashReceived}
          onProcess={handleProcessManualBill}
          onClose={closeManualBillingModal}
        />
      )}

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

// Order List Item Component
interface OrderListItemProps {
  order: any;
  isSelected: boolean;
  onSelect: () => void;
}

function OrderListItem({ order, isSelected, onSelect }: OrderListItemProps) {
  const tableName = order.table?.name || `Table ${order.tableId}`;
  const itemsCount = order.items?.length || 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{tableName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Order #{order.id.slice(0, 8)} • {itemsCount} items
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${Number(order.total).toFixed(2)}
          </p>
        </div>
      </div>
    </button>
  );
}

// Payment Confirmation Modal Component
interface PaymentConfirmationModalProps {
  payment: any;
  onClose: () => void;
}

function PaymentConfirmationModal({ payment, onClose }: PaymentConfirmationModalProps) {
  const order = payment.order;
  const totals = payment.totals;

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
                  Payment Successful
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
          {/* Order Info */}
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Order ID</p>
            <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
              #{order.id.slice(0, 8)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {order.table?.name || `Table ${order.tableId}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleString()}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                </span>
                <span className="text-gray-900 dark:text-white">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Tax:</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Discount:</span>
                <span>-${totals.discount.toFixed(2)}</span>
              </div>
            )}
            {totals.serviceCharge > 0 && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Service Charge:</span>
                <span>${totals.serviceCharge.toFixed(2)}</span>
              </div>
            )}
            {totals.tip > 0 && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tip:</span>
                <span>${totals.tip.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                <span>Total Paid:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {payment.data?.payment?.method || 'N/A'}
              </span>
            </div>
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
            Receipt has been sent to printer
          </p>
        </div>
      </div>
    </div>
  );
}


// Manual Billing Modal Component
interface ManualBillingModalProps {
  menuItems: any[];
  categories: any[];
  manualOrderItems: ManualOrderItem[];
  paymentMethod: PaymentMethod;
  cashReceived: number;
  taxRate: number;
  totals: {
    subtotal: number;
    tax: number;
    taxRate: number;
    total: number;
  };
  isProcessing: boolean;
  onAddItem: (menuItem: any) => void;
  onUpdateQuantity: (menuItemId: string, quantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCashReceivedChange: (amount: number) => void;
  onProcess: () => void;
  onClose: () => void;
}

function ManualBillingModal({
  menuItems,
  categories,
  manualOrderItems,
  paymentMethod,
  cashReceived,
  taxRate,
  totals,
  isProcessing,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onPaymentMethodChange,
  onCashReceivedChange,
  onProcess,
  onClose,
}: ManualBillingModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [buffetCount, setBuffetCount] = useState(1);

  const selectedCategory = useMemo(() => {
    return categories.find((cat) => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems.filter((item) => item.available);
    
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
  }, [menuItems, selectedCategoryId, selectedCategory, searchQuery]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== PaymentMethod.CASH) return 0;
    return Math.max(0, cashReceived - totals.total);
  }, [paymentMethod, cashReceived, totals.total]);

  const handleBuffetAdd = () => {
    if (!selectedCategory) return;
    
    // Get buffet price from the first item in the category or use default
    const buffetPrice = menuItems.find((item) => item.categoryId === selectedCategory.id)?.price || 15.00;
    
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
      onUpdateQuantity(buffetItem.menuItemId, existing.quantity + buffetCount);
    } else {
      onAddItem(buffetItem);
    }
    
    setBuffetCount(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Manual Bill
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select items and process payment directly - no table occupation
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Menu Items */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        !selectedCategoryId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    All Items
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          selectedCategoryId === category.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      {category.name}
                      {category.isBuffet && (
                        <span className="ml-1 text-xs">🍽️</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
                      Add Buffet (${((menuItems.find((item) => item.categoryId === selectedCategory.id)?.price || 15.00) * buffetCount).toFixed(2)})
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
                  <div className="grid grid-cols-2 gap-3">
                    {filteredMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onAddItem(item)}
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg
                                 hover:border-blue-500 dark:hover:border-blue-500 transition-colors
                                 text-left"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>

                  {filteredMenuItems.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No items found' : selectedCategoryId ? 'No items in this category' : 'No available menu items'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side - Bill Summary & Payment */}
          <div className="w-96 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="space-y-4">
              {/* Bill Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Order Items ({manualOrderItems.length})
                </h3>
                {manualOrderItems.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <ShoppingCartIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No items added yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {manualOrderItems.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.menuItemId)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
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
                              onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
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

              {/* Bill Summary & Calculator */}
              {manualOrderItems.length > 0 && (
                <>
                  {/* Bill Breakdown */}
                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Subtotal:</span>
                      <span>${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Tax ({taxRate}%):</span>
                      <span>${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                        <span>Total:</span>
                        <span>${totals.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.values(PaymentMethod).map((method) => (
                        <button
                          key={method}
                          onClick={() => onPaymentMethodChange(method)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors
                            ${
                              paymentMethod === method
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                            }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Calculator - Always Visible */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <h3 className="text-base font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💵</span>
                      Cash Calculator
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <label className="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">
                          Bill Amount
                        </label>
                        <div className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                          ${totals.total.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-800 dark:text-blue-400 mb-2">
                          Cash Received
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashReceived === 0 ? '' : cashReceived}
                          onChange={(e) => {
                            const value = e.target.value;
                            onCashReceivedChange(value === '' ? 0 : Number(value));
                          }}
                          className="w-full px-4 py-3 text-2xl font-bold border-2 border-blue-300 dark:border-blue-700 rounded-lg
                                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-green-300 dark:border-green-700">
                        <label className="block text-xs font-medium text-green-800 dark:text-green-400 mb-2">
                          Change to Return
                        </label>
                        <div className={`text-4xl font-bold ${
                          changeAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${changeAmount.toFixed(2)}
                        </div>
                        {paymentMethod === PaymentMethod.CASH && cashReceived < totals.total && cashReceived > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Insufficient cash received</span>
                          </p>
                        )}
                        {paymentMethod === PaymentMethod.CASH && cashReceived >= totals.total && cashReceived > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                            <span>✓</span>
                            <span>Payment sufficient</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                       dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onProcess}
              disabled={isProcessing || manualOrderItems.length === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <PrinterIcon className="w-5 h-5" />
                  <span>Print Bill & Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
