// 1. Database Entity Interface
export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_paise: number;
  is_available: boolean;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// 2. DTO Inputs for API Payloads
export interface CreateMenuItemInput {
  category_id?: string;
  name: string;
  description?: string;
  price_paise: number;
  is_available?: boolean;
  image_url?: string;
}

export interface UpdateMenuItemInput {
  category_id?: string;
  name?: string;
  description?: string;
  price_paise?: number;
  is_available?: boolean;
  image_url?: string | null; // Fixed: Optional 
}

// 3. Database Raw Row Type (Flat SQL query result ke liye)
export interface RestaurantMenuItemRow {
  id: string;
  name: string;
  description: string | null;
  price_paise: number;
  is_available: boolean;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_display_order: number | null;
}

// 4. Client Display DTO (Nested Array Item representation without duplicate category info)
export interface MenuItemDTO {
  id: string;
  name: string;
  description: string | null;
  price_paise: number;
  is_available: boolean;
  image_url: string | null;
}

// 5. Final Client Response Types
export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItemDTO[]; // Fixed: MenuItemDTO Array
}

export interface RestaurantMenu {
  restaurantId: string;
  categories: MenuCategory[];
}