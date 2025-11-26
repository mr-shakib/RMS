'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { OrderStatus, PaymentMethod } from '@rms/shared';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  PrinterIcon,
  CalculatorIcon,
  CreditCardIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface CalculatorState {
  display: string;
  previousValue: number;
  operation: string | null;
  waitingForOperand: boolean;
}

export default function PaymentPage() {
  const { orders, isLoading, refetch } = useOrders();
  const queryClient = useQueryClient();
  
  // State management
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);
  const [showPrintingAnimation, setShowPrintingAnimation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Calculator state
  const [calculator, setCalculator] = useState<CalculatorState>({
    display: '0',
    previousValue: 0,
    operation: null,
    waitingForOperand: false,
  });
  
  // Auto-refresh orders every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  // Filter unpaid orders (exclude PAID and CANCELLED)
  const unpaidOrders = useMemo(() => {
    const ordersList = Array.isArray(orders) ? orders : [];
    return ordersList.filter((order) => 
      order.status !== OrderStatus.PAID && 
      order.status !== OrderStatus.CANCELLED
    );
  }, [orders]);
  
  // Apply search filter
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return unpaidOrders;
    
    const query = searchQuery.toLowerCase();
    return unpaidOrders.filter((order) => {
      const orderId = order.id.toLowerCase();
      const tableName = (order as any).table?.name?.toLowerCase() || '';
      return orderId.includes(query) || tableName.includes(query);
    });
  }, [unpaidOrders, searchQuery]);
  
  // Get selected order details
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return unpaidOrders.find((order) => order.id === selectedOrderId) || null;
  }, [selectedOrderId, unpaidOrders]);
  
  // Calculate order totals
  const orderTotals = useMemo(() => {
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
    
    return {
      subtotal: Number(selectedOrder.subtotal || 0),
      tax: Number(selectedOrder.tax || 0),
      discount: Number(selectedOrder.discount || 0),
      serviceCharge: Number(selectedOrder.serviceCharge || 0),
      tip: Number(selectedOrder.tip || 0),
      total: Number(selectedOrder.total || 0),
    };
  }, [selectedOrder]);
  
  // Calculator functions
  const handleNumberClick = (num: string) => {
    const { display } = calculator;
    
    setCalculator({
      ...calculator,
      display: display === '0' ? num : display + num,
      waitingForOperand: false,
    });
  };
  
  const handleDecimalClick = () => {
    const { display } = calculator;
    
    if (display.indexOf('.') === -1) {
      setCalculator({
        ...calculator,
        display: display + '.',
        waitingForOperand: false,
      });
    }
  };
  
  const handleClearClick = () => {
    setCalculator({
      display: '0',
      previousValue: 0,
      operation: null,
      waitingForOperand: false,
    });
  };
  
  const handleOperationClick = (nextOperation: string) => {
    const { display, previousValue, operation } = calculator;
    const inputValue = parseFloat(display);
    
    if (previousValue === 0) {
      setCalculator({
        ...calculator,
        previousValue: inputValue,
        operation: nextOperation,
        waitingForOperand: true,
      });
    } else if (operation) {
      const currentValue = previousValue;
      let newValue = currentValue;
      
      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '*':
          newValue = currentValue * inputValue;
          break;
        case '/':
          newValue = currentValue / inputValue;
          break;
      }
      
      setCalculator({
        display: String(newValue),
        previousValue: newValue,
        operation: nextOperation,
        waitingForOperand: true,
      });
    }
  };
  
  const handleEqualsClick = () => {
    const { display, previousValue, operation } = calculator;
    const inputValue = parseFloat(display);
    
    if (operation) {
      let newValue = previousValue;
      
      switch (operation) {
        case '+':
          newValue = previousValue + inputValue;
          break;
        case '-':
          newValue = previousValue - inputValue;
          break;
        case '*':
          newValue = previousValue * inputValue;
          break;
        case '/':
          newValue = previousValue / inputValue;
          break;
      }
      
      setCalculator({
        display: String(newValue),
        previousValue: 0,
        operation: null,
        waitingForOperand: true,
      });
    }
  };
  
  // Keyboard support for calculator
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle keyboard when calculator is visible (order selected and cash payment)
      if (!selectedOrderId || paymentMethod !== PaymentMethod.CASH) return;
      
      // Prevent default for number keys
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimalClick();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClearClick();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        // Remove last digit
        setCalculator(prev => ({
          ...prev,
          display: prev.display.length > 1 ? prev.display.slice(0, -1) : '0'
        }));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedOrderId, paymentMethod, handleNumberClick, handleDecimalClick, handleClearClick]);
  
  // Payment processing
  const cashReceived = parseFloat(calculator.display) || 0;
  const changeAmount = Math.max(0, cashReceived - orderTotals.total);
  
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId) throw new Error('No order selected');
      
      // Validate payment
      if (paymentMethod === PaymentMethod.CASH && cashReceived < orderTotals.total) {
        throw new Error('Insufficient cash received');
      }
      
      // Process the payment directly - payment service handles status updates
      const response = await apiClient.post('/payments', {
        orderId: selectedOrderId,
        amount: orderTotals.total,
        method: paymentMethod,
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
      
      // Store payment info for success modal
      setSuccessReceipt({
        ...response.data,
        order: selectedOrder,
        totals: orderTotals,
        cashReceived: paymentMethod === PaymentMethod.CASH ? cashReceived : orderTotals.total,
        change: paymentMethod === PaymentMethod.CASH ? changeAmount : 0,
        paymentMethod,
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Reset form
      resetForm();
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Payment failed: ${errorMessage}`);
    },
  });
  
  const resetForm = () => {
    setSelectedOrderId(null);
    setPaymentMethod(PaymentMethod.CASH);
    setCalculator({
      display: '0',
      previousValue: 0,
      operation: null,
      waitingForOperand: false,
    });
  };
  
  const handleProcessPayment = () => {
    if (!selectedOrderId) {
      alert('Please select an order first');
      return;
    }
    
    if (paymentMethod === PaymentMethod.CASH && cashReceived < orderTotals.total) {
      alert(`Insufficient cash. Need at least $${orderTotals.total.toFixed(2)}`);
      return;
    }
    
    processPaymentMutation.mutate();
  };
  
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessReceipt(null);
  };
  
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Processing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select an order, calculate payment, and print receipt
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreditCardIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Order Selection & Calculator */}
        <div className="w-2/5 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Select Order ({filteredOrders.length})
              </h2>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 
                         dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 
                         transition-colors disabled:opacity-50"
                title="Refresh orders"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search order or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Order List - Upper 50% */}
          <div className="h-1/2 overflow-y-auto p-3 space-y-2 border-b border-gray-200 dark:border-gray-700">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ReceiptPercentIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No orders found' : 'No unpaid orders available'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {searchQuery ? 'Try a different search' : 'All unpaid orders will appear here'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const tableName = (order as any).table?.name || `Table ${order.tableId}`;
                const orderDate = new Date(order.createdAt);
                
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-2 rounded-lg border-2 transition-all
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                              }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                          {tableName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white block">
                          ${Number(order.total).toFixed(2)}
                        </span>
                        {isSelected && (
                          <CheckCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 inline-block" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Calculator - Lower 50% (Only for Cash) */}
          {selectedOrder && paymentMethod === PaymentMethod.CASH && (
            <div className="h-1/2 bg-gray-50 dark:bg-gray-900 p-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 h-full flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                    Amount Received
                  </h3>
                  <CalculatorIcon className="w-3 h-3 text-gray-400" />
                </div>
                
                {/* Calculator Display */}
                <div className="bg-gray-900 dark:bg-gray-950 rounded p-2 mb-1">
                  <div className="text-right text-xl font-mono font-bold text-green-400">
                    ${calculator.display}
                  </div>
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-5 gap-1 mb-1">
                  {[10, 20, 50, 100, 200].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCalculator({
                        display: String(amount),
                        previousValue: 0,
                        operation: null,
                        waitingForOperand: false,
                      })}
                      className="h-7 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                
                {/* Number Pad - Compact Layout */}
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <button onClick={() => handleNumberClick('7')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">7</button>
                  <button onClick={() => handleNumberClick('8')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">8</button>
                  <button onClick={() => handleNumberClick('9')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">9</button>
                  
                  <button onClick={() => handleNumberClick('4')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">4</button>
                  <button onClick={() => handleNumberClick('5')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">5</button>
                  <button onClick={() => handleNumberClick('6')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">6</button>
                  
                  <button onClick={() => handleNumberClick('1')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">1</button>
                  <button onClick={() => handleNumberClick('2')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">2</button>
                  <button onClick={() => handleNumberClick('3')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">3</button>
                  
                  <button onClick={handleDecimalClick} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">.</button>
                  <button onClick={() => handleNumberClick('0')} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-semibold text-base text-gray-900 dark:text-white transition-colors">0</button>
                  <button onClick={handleClearClick} className="bg-red-500 hover:bg-red-600 text-white rounded font-semibold text-xs transition-colors">CLR</button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Side - Payment Details & Summary */}
        <div className="w-3/5 flex flex-col bg-gray-50 dark:bg-gray-900">
          {!selectedOrder ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CreditCardIcon className="w-24 h-24 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No Order Selected
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Select an order from the left to process payment
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Order Summary */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  Order Summary
                </h2>
                
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white font-medium">${orderTotals.subtotal.toFixed(2)}</span>
                  </div>
                  {orderTotals.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                      <span className="text-gray-900 dark:text-white font-medium">${orderTotals.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {orderTotals.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Discount:</span>
                      <span className="font-medium">-${orderTotals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {orderTotals.serviceCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Service:</span>
                      <span className="text-gray-900 dark:text-white font-medium">${orderTotals.serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {orderTotals.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tip:</span>
                      <span className="text-gray-900 dark:text-white font-medium">${orderTotals.tip.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${orderTotals.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Payment Method Selection */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Payment Method
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all
                              ${paymentMethod === PaymentMethod.CASH
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                              }`}
                  >
                    <BanknotesIcon className="w-6 h-6 mx-auto mb-1 text-green-600 dark:text-green-400" />
                    <span className="block text-xs font-medium text-gray-900 dark:text-white">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all
                              ${paymentMethod === PaymentMethod.CARD
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                              }`}
                  >
                    <CreditCardIcon className="w-6 h-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                    <span className="block text-xs font-medium text-gray-900 dark:text-white">Card</span>
                  </button>
                </div>
              </div>
              
              {/* Payment Info - Amount Due, Received, Change */}
              {paymentMethod === PaymentMethod.CASH && (
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Cash Payment Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Amount Due:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        ${orderTotals.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cash Received:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${cashReceived.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change to Give:</span>
                      <span className={`text-2xl font-bold ${
                        changeAmount >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${changeAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Process Payment Button */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-auto">
                <div className="flex gap-2">
                  <button
                    onClick={resetForm}
                    disabled={processPaymentMutation.isPending}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                             dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg 
                             font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={processPaymentMutation.isPending || (paymentMethod === PaymentMethod.CASH && cashReceived < orderTotals.total)}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                             font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                  >
                    {processPaymentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <PrinterIcon className="w-5 h-5" />
                        <span>Process Payment & Print Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
                Processing Payment...
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please wait while we process your payment and print the receipt
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Modal */}
      {showSuccessModal && successReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                      Receipt has been printed
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeSuccessModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Order ID</p>
                <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                  {successReceipt.order?.id.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date().toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span>${successReceipt.totals.subtotal.toFixed(2)}</span>
                </div>
                {successReceipt.totals.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Tax:</span>
                    <span>${successReceipt.totals.tax.toFixed(2)}</span>
                  </div>
                )}
                {successReceipt.totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discount:</span>
                    <span>-${successReceipt.totals.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                    <span>Total Paid:</span>
                    <span>${successReceipt.totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {successReceipt.paymentMethod}
                  </span>
                </div>
                {successReceipt.paymentMethod === PaymentMethod.CASH && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Cash Received:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${successReceipt.cashReceived.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Change:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ${successReceipt.change.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeSuccessModal}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white 
                         rounded-lg font-semibold transition-colors"
              >
                Done
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
                ✓ Receipt printed successfully
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
