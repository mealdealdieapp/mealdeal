import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getMealLabel, getMealEmoji, CATEGORY_ORDER, MEAL_CONFIG } from '../lib/mealConfig';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface Recipe {
  id: string;
  name: string;
  emoji: string;
  meal: string | null;
  calories: number;
  difficulty: string;
  time_minutes: number;
  servings: number;
  saved?: number | null;
  cost?: number | null;
  tag?: string;
  tag_color?: string;
  image_url?: string;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
}

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
}

/**
 * Recipe Card Component
 */
function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const hasSavings = (recipe.saved ?? 0) > 0;

  return (
    <TouchableOpacity style={styles.recipeCard} activeOpacity={0.75} onPress={onPress}>
      {/* Emoji/Image Section */}
      <View style={[styles.recipeImage, { backgroundColor: '#FFF3E0' }]}>
        <Text style={styles.recipeEmoji}>{recipe.emoji || getMealEmoji(recipe.meal)}</Text>
        {hasSavings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>-{recipe.saved ?? 0}€</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.recipeContent}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {recipe.name}
        </Text>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>⏱ {recipe.time_minutes} Min</Text>
          <Text style={styles.metaItem}>🔥 {recipe.calories}</Text>
        </View>

        {/* Difficulty */}
        <Text style={styles.difficulty}>
          📊 {recipe.difficulty || 'Mittel'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Category Chip Component
 */
function CategoryChip({
  category,
  isSelected,
  onPress,
}: {
  category: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const config = MEAL_CONFIG[category as keyof typeof MEAL_CONFIG];
  if (!config) return null;

  return (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        isSelected && styles.categoryChipSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryChipEmoji}>{config.emoji}</Text>
      <Text
        style={[
          styles.categoryChipLabel,
          isSelected && styles.categoryChipLabelSelected,
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Main Discovery Screen Component
 */
export default function DiscoveryScreen() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  /**
   * Fetch recipes from Supabase
   */
  const fetchRecipes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching recipes:', error);
        return;
      }

      setRecipes(data || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
    }
  }, []);

  /**
   * Load recipes on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setIsLoading(true);
        await fetchRecipes();
        setIsLoading(false);
      };
      loadData();
    }, [fetchRecipes])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecipes();
    setIsRefreshing(false);
  };

  /**
   * Filter recipes based on search and category
   */
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Category filter
      if (selectedCategory) {
        // Check virtual categories
        if (selectedCategory === 'quick' && recipe.time_minutes > 15) {
          return false;
        }
        if (selectedCategory === 'budget' && ((recipe.cost ?? 0) > 5)) {
          return false;
        }
        if (selectedCategory === 'meal_prep' && recipe.tag !== 'meal-prep' && recipe.servings < 6) {
          return false;
        }
        // Check meal category
        if (
          selectedCategory !== 'quick' &&
          selectedCategory !== 'budget' &&
          selectedCategory !== 'meal_prep' &&
          recipe.meal !== selectedCategory
        ) {
          return false;
        }
      }

      // Search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        return recipe.name.toLowerCase().includes(search);
      }

      return true;
    });
  }, [recipes, selectedCategory, searchText]);

  /**
   * Handle recipe card press
   */
  const handleRecipePress = (recipe: Recipe) => {
    (navigation as any).navigate('RecipeDetail', { recipeId: recipe.id });
  };

  /**
   * Surprise me - pick random recipe
   */
  const handleSurpriseMe = async () => {
    if (recipes.length === 0) {
      Alert.alert('Überrasch mich!', 'Keine Rezepte verfügbar');
      return;
    }

    setIsLoadingRandom(true);
    try {
      // Randomly select from all recipes
      const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
      handleRecipePress(randomRecipe);
    } catch (err) {
      console.error('Error loading random recipe:', err);
      Alert.alert('Fehler', 'Fehler beim Laden eines Rezepts');
    } finally {
      setIsLoadingRandom(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Rezepte werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rezepte entdecken</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rezepte suchen..."
            placeholderTextColor={Colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Category Chips - Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORY_ORDER.map((category) => (
          <CategoryChip
            key={category}
            category={category}
            isSelected={selectedCategory === category}
            onPress={() =>
              setSelectedCategory(selectedCategory === category ? null : category)
            }
          />
        ))}
      </ScrollView>

      {/* Recipes Grid */}
      {filteredRecipes.length > 0 ? (
        <FlatList
          data={filteredRecipes}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.recipeRow}
          contentContainerStyle={styles.recipeListContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔍</Text>
          <Text style={styles.emptyStateText}>
            {searchText || selectedCategory
              ? 'Keine Rezepte gefunden'
              : 'Keine Rezepte verfügbar'}
          </Text>
        </View>
      )}

      {/* Surprise Me Button - Floating */}
      {recipes.length > 0 && (
        <TouchableOpacity
          style={styles.surpriseButton}
          onPress={handleSurpriseMe}
          disabled={isLoadingRandom}
          activeOpacity={0.8}
        >
          {isLoadingRandom ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.surpriseEmoji}>🎲</Text>
              <Text style={styles.surpriseText}>Überrasch mich!</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  categoriesScroll: {
    paddingVertical: 12,
  },
  categoriesContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundGrey,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    maxWidth: 80,
  },
  categoryChipLabelSelected: {
    color: '#FFFFFF',
  },
  recipeListContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  recipeRow: {
    paddingHorizontal: 8,
    gap: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  recipeCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  recipeEmoji: {
    fontSize: 56,
  },
  savingsBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.dealBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recipeContent: {
    padding: 12,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  difficulty: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  surpriseButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  surpriseEmoji: {
    fontSize: 18,
  },
  surpriseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
