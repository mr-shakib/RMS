/**
 * Helper utility to transform Prisma MenuItem results into the format expected by the UI
 * This extracts buffetCategoryIds and buffetCategories from the junction table structure
 */

import { MenuItem as PrismaMenuItem, Category } from '@prisma/client';

// Extended types that include the junction table relations
type MenuItemWithBuffets = PrismaMenuItem & {
  buffetCategories?: Array<{
    buffetCategory: Category;
  }>;
  category?: Category;
};

// Transformed type for the UI
export interface TransformedMenuItem {
  id: string;
  itemNumber?: number | null;
  name: string;
  categoryId: string;
  category?: Category;
  buffetCategoryIds: string[];
  buffetCategories: Category[];
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  available: boolean;
  alwaysPriced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transform a single menu item from Prisma format to UI format
 */
export function transformMenuItem(item: MenuItemWithBuffets): TransformedMenuItem {
  const buffetCategories = item.buffetCategories?.map(bc => bc.buffetCategory) || [];
  const buffetCategoryIds = buffetCategories.map(bc => bc.id);

  return {
    id: item.id,
    itemNumber: item.itemNumber,
    name: item.name,
    categoryId: item.categoryId,
    category: item.category,
    buffetCategoryIds,
    buffetCategories,
    price: item.price,
    description: item.description,
    imageUrl: item.imageUrl,
    available: item.available,
    alwaysPriced: item.alwaysPriced || false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Transform an array of menu items from Prisma format to UI format
 */
export function transformMenuItems(items: MenuItemWithBuffets[]): TransformedMenuItem[] {
  return items.map(transformMenuItem);
}

/**
 * Check if a menu item is assigned to a specific buffet category
 */
export function isItemInBuffet(item: TransformedMenuItem, buffetCategoryId: string): boolean {
  return item.buffetCategoryIds.includes(buffetCategoryId);
}

/**
 * Check if a menu item is assigned to any buffet category
 */
export function isItemInAnyBuffet(item: TransformedMenuItem): boolean {
  return item.buffetCategoryIds.length > 0;
}

/**
 * Get the names of all buffet categories an item is assigned to
 */
export function getItemBuffetNames(item: TransformedMenuItem): string[] {
  return item.buffetCategories.map(bc => bc.name);
}

/**
 * Filter items by buffet category
 */
export function filterItemsByBuffet(
  items: TransformedMenuItem[],
  buffetCategoryId: string
): TransformedMenuItem[] {
  return items.filter(item => isItemInBuffet(item, buffetCategoryId));
}

/**
 * Filter items that are NOT in any buffet (All Items only)
 */
export function filterNonBuffetItems(items: TransformedMenuItem[]): TransformedMenuItem[] {
  return items.filter(item => !isItemInAnyBuffet(item));
}
