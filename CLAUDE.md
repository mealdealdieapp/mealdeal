# MealDeal - Development Rules

## Data Rules
- NIEMALS Daten hardcoden die aus Supabase kommen
- IMMER TypeScript types nutzen (aus database.types.ts)
- Profildaten (PLZ, Märkte, Ernährung) sind IMMER die Basis für alle Queries
- Angebote werden NUR gefiltert nach: user.plz + user.markets
- offers Tabelle hat plz_prefix Feld - matche mit den ersten 2-3 Stellen der User PLZ

## Tech Stack
- React 19 + TypeScript
- Vite 8
- Tailwind CSS 3 (NOT v4)
- TanStack Query für alle Supabase Queries
- Zustand nur für: auth session, user profile, aktiver Tab
- Supabase für Backend (Auth, DB, Storage)
- React Router v7 für Navigation
- Lucide React für Icons

## Component Rules
- Komponenten max 150 Zeilen - sonst aufteilen
- Kein inline CSS - nur Tailwind classes
- Alle Komponenten als TypeScript Function Components

## Design System
- Primaer: #028350 (Gruen)
- Erfolg/Ersparnis: #22C55E (Gruen)
- Hintergrund: #F5F5F0 (warmes Off-White)
- Karten: white, border-radius 18px, border 1.5px solid #EBEBEB (KEIN box-shadow)
- Font Headlines: Bricolage Grotesque (font-display), font-weight 800
- Font Body: DM Sans (font-sans)
- Border Radius: 18px Standard für Karten

## File Structure
- src/types/database.types.ts - Auto-generated from Supabase
- src/types/app.types.ts - Custom app types
- src/lib/supabase.ts - Supabase client
- src/lib/queryClient.ts - TanStack Query config
- src/store/useAppStore.ts - Zustand store
- src/hooks/ - All data fetching hooks
- src/components/ - UI components organized by feature
- src/pages/ - Page components

## Supabase Tables (Key ones)
- user_profiles: id, plz, markets[], diets[], budget, cal_target, gender, age, weight, height, activity, goal
- offers: product_name, store, plz, plz_prefix, offer_price, original_price, discount_percent, category, valid_from, valid_until
- recipes: name, emoji, meal, time_minutes, difficulty, servings, calories, protein, carbs, fat, cost, saved, diets[], steps[], image_url
- recipe_ingredients: recipe_id, ingredient_id, amount, unit
- ingredients: name, emoji, category, unit, calories_per_100, protein_per_100
- weekly_plans: user_id, week_start, plan (jsonb)
- shopping_items: user_id, name, amount, unit, category, checked, week_start
- saved_recipes: user_id, recipe_id
- plz_regions: plz, region, bundesland
