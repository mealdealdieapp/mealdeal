import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getMealEmoji } from '../lib/mealConfig';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface Recipe {
  id: string;
  name: string;
  emoji: string;
  meal: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  difficulty: string;
  time_minutes: number;
  servings: number;
  image_url: string | null;
  steps: string[];
  diets: string[] | null;
  tag: string | null;
  tag_color: string | null;
  saved: number | null;
  cost: number | null;
}

interface RecipeIngredient {
  amount: number;
  unit: string;
  ingredient_id: string;
  ingredients: any;
}

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
}

/**
 * Nutrition Bar Component
 */
function NutritionBar({
  label,
  value,
  unit,
  percentage,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  percentage: number;
  color: string;
}) {
  return (
    <View style={styles.nutritionItem}>
      <View style={styles.nutritionHeader}>
        <Text style={styles.nutritionLabel}>{label}</Text>
        <Text style={styles.nutritionValue}>
          {Math.round(value)}
          {unit}
        </Text>
      </View>
      <View style={styles.nutritionBarBg}>
        <View
          style={[
            styles.nutritionBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Ingredient Item Component
 */
function IngredientItem({
  ingredient,
  amount,
  unit,
}: {
  ingredient: Ingredient;
  amount: number;
  unit: string;
}) {
  return (
    <View style={styles.ingredientRow}>
      <Text style={styles.ingredientEmoji}>{ingredient.emoji}</Text>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{ingredient.name}</Text>
        <Text style={styles.ingredientCategory}>{ingredient.category}</Text>
      </View>
      <Text style={styles.ingredientAmount}>
        {Math.round(amount * 10) / 10} {unit}
      </Text>
    </View>
  );
}

/**
 * Recipe Detail Screen Component
 */
export default function RecipeDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { recipeId } = route.params as { recipeId: string };

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [servings, setServings] = useState(1);

  /**
   * Fetch recipe details from Supabase
   */
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', recipeId)
          .single();

        if (recipeError) {
          console.error('Error fetching recipe:', recipeError);
          Alert.alert('Fehler', 'Rezept konnte nicht geladen werden');
          navigation.goBack();
          return;
        }

        setRecipe(recipeData);
        setServings(recipeData.servings || 1);
        setIsSaved(recipeData.saved ? true : false);

        // Fetch ingredients
        const { data: ingredientData, error: ingredientError } = await supabase
          .from('recipe_ingredients')
          .select('amount, unit, ingredient_id, ingredients(*)')
          .eq('recipe_id', recipeId);

        if (!ingredientError && ingredientData) {
          // Normalize ingredients data: handle both single object and array cases
          const normalizedData = ingredientData.map((item) => ({
            ...item,
            ingredients: Array.isArray(item.ingredients)
              ? item.ingredients[0]
              : item.ingredients,
          }));
          setIngredients(normalizedData);
        }
      } catch (err) {
        console.error('Error fetching recipe:', err);
        Alert.alert('Fehler', 'Rezept konnte nicht geladen werden');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, navigation]);

  /**
   * Handle save/unsave recipe
   */
  const handleToggleSave = useCallback(async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      const newSavedValue = isSaved ? null : new Date().getTime();

      const { error } = await supabase
        .from('recipes')
        .update({ saved: newSavedValue })
        .eq('id', recipe.id);

      if (error) {
        console.error('Error saving recipe:', error);
        Alert.alert('Fehler', 'Rezept konnte nicht gespeichert werden');
      } else {
        setIsSaved(!isSaved);
        Alert.alert(
          'Erfolgreich',
          isSaved ? 'Rezept entfernt' : 'Rezept gespeichert'
        );
      }
    } catch (err) {
      console.error('Error saving recipe:', err);
      Alert.alert('Fehler', 'Rezept konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  }, [recipe, isSaved]);

  /**
   * Handle add to shopping list
   */
  const handleAddToShoppingList = useCallback(async () => {
    if (!recipe || ingredients.length === 0) {
      Alert.alert('Info', 'Keine Zutaten zum Hinzufügen');
      return;
    }

    try {
      // Add ingredients to shopping list
      const shoppingListItems = ingredients.map((ing) => ({
        recipe_id: recipe.id,
        ingredient_id: ing.ingredient_id,
        amount: ing.amount * servings,
        unit: ing.unit,
        checked: false,
      }));

      const { error } = await supabase
        .from('shopping_list')
        .insert(shoppingListItems);

      if (error) {
        console.error('Error adding to shopping list:', error);
        Alert.alert('Fehler', 'Zutaten konnten nicht hinzugefügt werden');
      } else {
        Alert.alert(
          'Erfolgreich',
          `${ingredients.length} Zutaten zur Einkaufsliste hinzugefügt`
        );
      }
    } catch (err) {
      console.error('Error adding to shopping list:', err);
      Alert.alert('Fehler', 'Zutaten konnten nicht hinzugefügt werden');
    }
  }, [recipe, ingredients, servings]);

  if (isLoading || !recipe) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Rezept wird geladen...</Text>
      </View>
    );
  }

  // Calculate nutrition per adjusted servings
  const adjustedCalories = (recipe.calories / recipe.servings) * servings;
  const adjustedProtein = (recipe.protein / recipe.servings) * servings;
  const adjustedCarbs = (recipe.carbs / recipe.servings) * servings;
  const adjustedFat = (recipe.fat / recipe.servings) * servings;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroBg}>
            <Text style={styles.heroEmoji}>
              {recipe.emoji || getMealEmoji(recipe.meal)}
            </Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Title & Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{recipe.name}</Text>
              {recipe.tag && (
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: recipe.tag_color || Colors.primary },
                  ]}
                >
                  <Text style={styles.tagText}>{recipe.tag}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Info Row */}
          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>⏱️</Text>
              <Text style={styles.quickInfoText}>{recipe.time_minutes} Min</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>📊</Text>
              <Text style={styles.quickInfoText}>{recipe.difficulty}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoIcon}>👥</Text>
              <Text style={styles.quickInfoText}>{servings} Port.</Text>
            </View>
          </View>

          {/* Servings Adjustment */}
          <View style={styles.servingsControl}>
            <Text style={styles.servingsLabel}>Portionen anpassen:</Text>
            <View style={styles.servingsButtons}>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(Math.max(1, servings - 1))}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsValue}>{servings}</Text>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings(servings + 1)}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Nutrition Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nährwerte (pro Portion)</Text>
          <NutritionBar
            label="Kalorien"
            value={adjustedCalories}
            unit="kcal"
            percentage={(adjustedCalories / 2000) * 100}
            color={Colors.primary}
          />
          <NutritionBar
            label="Protein"
            value={adjustedProtein}
            unit="g"
            percentage={(adjustedProtein / 50) * 100}
            color={Colors.secondary}
          />
          <NutritionBar
            label="Kohlenhydrate"
            value={adjustedCarbs}
            unit="g"
            percentage={(adjustedCarbs / 300) * 100}
            color={Colors.accent}
          />
          <NutritionBar
            label="Fett"
            value={adjustedFat}
            unit="g"
            percentage={(adjustedFat / 70) * 100}
            color="#FF9F43"
          />
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zutaten</Text>
          <View style={styles.ingredientsList}>
            {ingredients.length > 0 ? (
              ingredients.map((ingredient, index) => (
                <IngredientItem
                  key={`${ingredient.ingredient_id}-${index}`}
                  ingredient={Array.isArray(ingredient.ingredients) ? ingredient.ingredients[0] : ingredient.ingredients}
                  amount={ingredient.amount * servings}
                  unit={ingredient.unit}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>Keine Zutaten verfügbar</Text>
            )}
          </View>
        </View>

        {/* Preparation Section */}
        {recipe.steps && recipe.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zubereitung</Text>
            <View style={styles.stepsList}>
              {recipe.steps.map((step, index) => (
                <View key={`step-${index}`} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Diets Section */}
        {recipe.diets && recipe.diets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ernährungsformen</Text>
            <View style={styles.dietsList}>
              {recipe.diets.map((diet, index) => (
                <View key={`diet-${index}`} style={styles.dietBadge}>
                  <Text style={styles.dietText}>{diet}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spacer for floating buttons */}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Action Buttons - Fixed Bottom */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleAddToShoppingList}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Zur Einkaufsliste</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isSaved ? styles.savedButton : styles.saveButton]}
          onPress={handleToggleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isSaved ? '❤️ Gespeichert' : '🤍 Speichern'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  heroSection: {
    position: 'relative',
    height: 280,
  },
  heroBg: {
    height: '100%',
    backgroundColor: Colors.backgroundGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 80,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.text,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickInfoItem: {
    alignItems: 'center',
    gap: 4,
  },
  quickInfoIcon: {
    fontSize: 18,
  },
  quickInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  servingsButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  nutritionItem: {
    marginBottom: 16,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nutritionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nutritionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  nutritionBarBg: {
    height: 6,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutritionBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 8,
    gap: 10,
  },
  ingredientEmoji: {
    fontSize: 20,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  ingredientCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  ingredientAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingTop: 2,
  },
  dietsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.backgroundGrey,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dietText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: Colors.backgroundGrey,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  savedButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
});
