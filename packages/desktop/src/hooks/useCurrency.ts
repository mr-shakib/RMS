import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface CurrencySettings {
  symbol: string;
  code: string;
  position: 'before' | 'after';
}

const CURRENCY_MAP: Record<string, CurrencySettings> = {
  USD: { symbol: '$', code: 'USD', position: 'before' },
  EUR: { symbol: '€', code: 'EUR', position: 'before' },
  GBP: { symbol: '£', code: 'GBP', position: 'before' },
  INR: { symbol: '₹', code: 'INR', position: 'before' },
  JPY: { symbol: '¥', code: 'JPY', position: 'before' },
};

export function useCurrency() {
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get<{ status: string; data: { settings: Record<string, string> } }>('/settings'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const currencyCode = settingsResponse?.data.settings.CURRENCY || 'EUR';
  const currencySettings = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;

  const formatCurrency = (amount: number): string => {
    const formattedAmount = amount.toFixed(2);
    
    if (currencySettings.position === 'before') {
      return `${currencySettings.symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount}${currencySettings.symbol}`;
    }
  };

  return {
    currency: currencyCode,
    symbol: currencySettings.symbol,
    formatCurrency,
  };
}
