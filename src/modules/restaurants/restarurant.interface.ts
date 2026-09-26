export interface CreateRestaurantInput {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface UpdateRestaurantInput {
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: Date;
}