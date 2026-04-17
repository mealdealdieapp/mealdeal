export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      custom_recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string | null
          diff: string | null
          emoji: string | null
          fat: number | null
          id: string
          image_url: string | null
          ings: Json | null
          meal: string | null
          name: string
          protein: number | null
          servings: number | null
          steps: string[] | null
          time_minutes: number | null
          user_id: string | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          diff?: string | null
          emoji?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ings?: Json | null
          meal?: string | null
          name: string
          protein?: number | null
          servings?: number | null
          steps?: string[] | null
          time_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          diff?: string | null
          emoji?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ings?: Json | null
          meal?: string | null
          name?: string
          protein?: number | null
          servings?: number | null
          steps?: string[] | null
          time_minutes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ingredient_synonyms: {
        Row: {
          canonical: string
          id: string
          synonym: string
        }
        Insert: {
          canonical: string
          id?: string
          synonym: string
        }
        Update: {
          canonical?: string
          id?: string
          synonym?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          calories_per_100: number | null
          carbs_per_100: number | null
          category: string | null
          created_at: string | null
          emoji: string | null
          fat_per_100: number | null
          id: string
          name: string
          price: number | null
          protein_per_100: number | null
          quantity: string | null
          unit: string | null
        }
        Insert: {
          calories_per_100?: number | null
          carbs_per_100?: number | null
          category?: string | null
          created_at?: string | null
          emoji?: string | null
          fat_per_100?: number | null
          id?: string
          name: string
          price?: number | null
          protein_per_100?: number | null
          quantity?: string | null
          unit?: string | null
        }
        Update: {
          calories_per_100?: number | null
          carbs_per_100?: number | null
          category?: string | null
          created_at?: string | null
          emoji?: string | null
          fat_per_100?: number | null
          id?: string
          name?: string
          price?: number | null
          protein_per_100?: number | null
          quantity?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount: number | null
          base_price: number | null
          base_unit: string | null
          brand: string | null
          canonical_key: string | null
          category: string | null
          created_at: string | null
          discount_percent: number | null
          emoji: string | null
          fingerprint: string | null
          id: string
          image_url: string | null
          is_bio: boolean | null
          is_food: boolean | null
          is_real_deal: boolean | null
          is_regional: boolean | null
          offer_price: number
          original_price: number | null
          plz: string | null
          plz_prefix: string | null
          product_id: string | null
          product_name: string
          quantity: string | null
          real_discount_percent: number | null
          region: string | null
          store: string
          subcategory: string | null
          unit: string | null
          valid_from: string | null
          valid_until: string
        }
        Insert: {
          amount?: number | null
          base_price?: number | null
          base_unit?: string | null
          brand?: string | null
          canonical_key?: string | null
          category?: string | null
          created_at?: string | null
          discount_percent?: number | null
          emoji?: string | null
          fingerprint?: string | null
          id?: string
          image_url?: string | null
          is_bio?: boolean | null
          is_food?: boolean | null
          is_real_deal?: boolean | null
          is_regional?: boolean | null
          offer_price: number
          original_price?: number | null
          plz?: string | null
          plz_prefix?: string | null
          product_id?: string | null
          product_name: string
          quantity?: string | null
          real_discount_percent?: number | null
          region?: string | null
          store: string
          subcategory?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_until: string
        }
        Update: {
          amount?: number | null
          base_price?: number | null
          base_unit?: string | null
          brand?: string | null
          canonical_key?: string | null
          category?: string | null
          created_at?: string | null
          discount_percent?: number | null
          emoji?: string | null
          fingerprint?: string | null
          id?: string
          image_url?: string | null
          is_bio?: boolean | null
          is_food?: boolean | null
          is_real_deal?: boolean | null
          is_regional?: boolean | null
          offer_price?: number
          original_price?: number | null
          plz?: string | null
          plz_prefix?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: string | null
          real_discount_percent?: number | null
          region?: string | null
          store?: string
          subcategory?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      offer_ingredient_matches: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          match_reason: string | null
          match_score: number
          offer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          match_reason?: string | null
          match_score: number
          offer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          match_reason?: string | null
          match_score?: number
          offer_id?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          api_calls: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          offers_deduped: number | null
          offers_fetched: number | null
          offers_saved: number | null
          per_category: Json | null
          per_store: Json | null
          plz_prefix: string
          retries: number | null
          started_at: string
          status: string
          matches_created: number | null
        }
        Insert: {
          api_calls?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          offers_deduped?: number | null
          offers_fetched?: number | null
          offers_saved?: number | null
          per_category?: Json | null
          per_store?: Json | null
          plz_prefix: string
          retries?: number | null
          started_at?: string
          status?: string
          matches_created?: number | null
        }
        Update: {
          api_calls?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          offers_deduped?: number | null
          offers_fetched?: number | null
          offers_saved?: number | null
          per_category?: Json | null
          per_store?: Json | null
          plz_prefix?: string
          retries?: number | null
          started_at?: string
          status?: string
          matches_created?: number | null
        }
        Relationships: []
      }
      plz_regions: {
        Row: {
          bundesland: string | null
          plz: string
          region: string
        }
        Insert: {
          bundesland?: string | null
          plz: string
          region: string
        }
        Update: {
          bundesland?: string | null
          plz?: string
          region?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          amount: number | null
          base_price: number | null
          canonical_key: string | null
          created_at: string | null
          id: string
          market: string
          original_price: number | null
          plz: string | null
          plz_prefix: string | null
          price: number
          product_id: string
          seen_at: string | null
          source: string | null
          unit: string | null
          valid_from: string
          valid_until: string | null
          week_number: number | null
        }
        Insert: {
          amount?: number | null
          base_price?: number | null
          canonical_key?: string | null
          created_at?: string | null
          id?: string
          market: string
          original_price?: number | null
          plz?: string | null
          plz_prefix?: string | null
          price: number
          product_id: string
          seen_at?: string | null
          source?: string | null
          unit?: string | null
          valid_from?: string
          valid_until?: string | null
          week_number?: number | null
        }
        Update: {
          amount?: number | null
          base_price?: number | null
          canonical_key?: string | null
          created_at?: string | null
          id?: string
          market?: string
          original_price?: number | null
          plz?: string | null
          plz_prefix?: string | null
          price?: number
          product_id?: string
          seen_at?: string | null
          source?: string | null
          unit?: string | null
          valid_from?: string
          valid_until?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_price: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          current_market: string | null
          current_price: number | null
          ean: string | null
          emoji: string | null
          highest_price: number | null
          id: string
          last_seen: string | null
          last_seen_at: string | null
          lowest_price: number | null
          max_price: number | null
          min_price: number | null
          name: string
          normal_price: number | null
          store: string | null
          times_on_sale: number | null
          unit: string | null
          unit_size: string | null
          uvp: number | null
        }
        Insert: {
          avg_price?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          current_market?: string | null
          current_price?: number | null
          ean?: string | null
          emoji?: string | null
          highest_price?: number | null
          id?: string
          last_seen?: string | null
          last_seen_at?: string | null
          lowest_price?: number | null
          max_price?: number | null
          min_price?: number | null
          name: string
          normal_price?: number | null
          store?: string | null
          times_on_sale?: number | null
          unit?: string | null
          unit_size?: string | null
          uvp?: number | null
        }
        Update: {
          avg_price?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          current_market?: string | null
          current_price?: number | null
          ean?: string | null
          emoji?: string | null
          highest_price?: number | null
          id?: string
          last_seen?: string | null
          last_seen_at?: string | null
          lowest_price?: number | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          normal_price?: number | null
          store?: string | null
          times_on_sale?: number | null
          unit?: string | null
          unit_size?: string | null
          uvp?: number | null
        }
        Relationships: []
      }
      purchase_log: {
        Row: {
          created_at: string | null
          date: string
          id: string
          item_count: number | null
          items: string[] | null
          not_bought: string[] | null
          offer_count: number | null
          total_cost: number | null
          total_saved: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          item_count?: number | null
          items?: string[] | null
          not_bought?: string[] | null
          offer_count?: number | null
          total_cost?: number | null
          total_saved?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          item_count?: number | null
          items?: string[] | null
          not_bought?: string[] | null
          offer_count?: number | null
          total_cost?: number | null
          total_saved?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      recipe_costs: {
        Row: {
          calculated_at: string | null
          cost: number | null
          id: string
          plz: string | null
          recipe_id: string
          region: string | null
          saved: number | null
        }
        Insert: {
          calculated_at?: string | null
          cost?: number | null
          id?: string
          plz?: string | null
          recipe_id: string
          region?: string | null
          saved?: number | null
        }
        Update: {
          calculated_at?: string | null
          cost?: number | null
          id?: string
          plz?: string | null
          recipe_id?: string
          region?: string | null
          saved?: number | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          ingredient_id: string | null
          recipe_id: string | null
          unit: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          recipe_id?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          recipe_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          diets: string[] | null
          difficulty: string | null
          emoji: string | null
          fat: number | null
          id: string
          image_url: string | null
          is_public: boolean | null
          meal: string | null
          name: string
          protein: number | null
          rid: string | null
          saved: number | null
          servings: number | null
          steps: string[] | null
          tag: string | null
          tag_color: string | null
          time_minutes: number | null
          status: string
          source: string
          quality_score: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          diets?: string[] | null
          difficulty?: string | null
          emoji?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          meal?: string | null
          name: string
          protein?: number | null
          rid?: string | null
          saved?: number | null
          servings?: number | null
          steps?: string[] | null
          tag?: string | null
          tag_color?: string | null
          time_minutes?: number | null
          status?: string
          source?: string
          quality_score?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          diets?: string[] | null
          difficulty?: string | null
          emoji?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          meal?: string | null
          name?: string
          protein?: number | null
          rid?: string | null
          saved?: number | null
          servings?: number | null
          steps?: string[] | null
          tag?: string | null
          tag_color?: string | null
          time_minutes?: number | null
          status?: string
          source?: string
          quality_score?: number | null
        }
        Relationships: []
      }
      saved_recipes: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_this_week: {
        Row: {
          id: string
          offers_count: number | null
          plz_prefix: string
          scraped_at: string | null
          store: string
          valid_until: string
        }
        Insert: {
          id?: string
          offers_count?: number | null
          plz_prefix: string
          scraped_at?: string | null
          store: string
          valid_until: string
        }
        Update: {
          id?: string
          offers_count?: number | null
          plz_prefix?: string
          scraped_at?: string | null
          store?: string
          valid_until?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          amount: number | null
          category: string | null
          checked: boolean | null
          created_at: string | null
          id: string
          name: string
          offer_discount_percent: number | null
          offer_id: string | null
          offer_original_price: number | null
          offer_price: number | null
          offer_product_name: string | null
          offer_store: string | null
          unit: string | null
          user_id: string | null
          week_start: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          checked?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          offer_discount_percent?: number | null
          offer_id?: string | null
          offer_original_price?: number | null
          offer_price?: number | null
          offer_product_name?: string | null
          offer_store?: string | null
          unit?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          checked?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          offer_discount_percent?: number | null
          offer_id?: string | null
          offer_original_price?: number | null
          offer_price?: number | null
          offer_product_name?: string | null
          offer_store?: string | null
          unit?: string | null
          user_id?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      unmatched_images: {
        Row: {
          bucket: string | null
          checked_at: string | null
          file_name: string
          id: string
        }
        Insert: {
          bucket?: string | null
          checked_at?: string | null
          file_name: string
          id?: string
        }
        Update: {
          bucket?: string | null
          checked_at?: string | null
          file_name?: string
          id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity: number | null
          age: number | null
          budget: number | null
          cal_target: number | null
          created_at: string | null
          diets: string[] | null
          gender: string | null
          goal: string | null
          height: number | null
          id: string
          markets: string[] | null
          plz: string | null
          preferences: string[] | null
          protein_target: number | null
          carbs_target: number | null
          fat_target: number | null
          quality: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          activity?: number | null
          age?: number | null
          budget?: number | null
          cal_target?: number | null
          created_at?: string | null
          diets?: string[] | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id: string
          markets?: string[] | null
          plz?: string | null
          preferences?: string[] | null
          protein_target?: number | null
          carbs_target?: number | null
          fat_target?: number | null
          quality?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          activity?: number | null
          age?: number | null
          budget?: number | null
          cal_target?: number | null
          created_at?: string | null
          diets?: string[] | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          markets?: string[] | null
          plz?: string | null
          preferences?: string[] | null
          protein_target?: number | null
          carbs_target?: number | null
          fat_target?: number | null
          quality?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          name: string
          target_price: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          name: string
          target_price?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          name?: string
          target_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          created_at: string | null
          id: string
          plan: Json
          user_id: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan: Json
          user_id?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: Json
          user_id?: string | null
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      recipe_offer_summary: {
        Row: {
          estimated_cost: number | null
          estimated_saved: number | null
          ingredients_on_sale: number | null
          recipe_id: string | null
          recipe_name: string | null
          rid: string | null
          total_ingredients: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      match_offers_for_recipe: {
        Args: { p_plz?: string; p_recipe_id: string }
        Returns: {
          all_offers: Json
          best_discount_percent: number
          best_offer_price: number
          best_original_price: number
          best_store: string
          fallback_price: number
          ingredient_emoji: string
          ingredient_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
