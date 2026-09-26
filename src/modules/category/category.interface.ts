export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  display_order: number;
  created_at: Date;
}

export interface CreateCategoryInput {
  restaurant_id: string;
  name: string;
  display_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  display_order?: number;
}