import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, TextInput, Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { MEAL_CONFIG } from '../lib/mealConfig';
import { getWeekNumber } from '../lib/weekNumber';

interface Recipe {
  id: string;
  title: string;
  emoji?: string;
  kcal?: number;
  zubereitungszeit_min?: number;
  portionen?: number;
}

interface DayMeals {
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe;
  snack?: Recipe;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Mock recipes for demonstration
const MOCK_RECIPES: Recipe[] = [
  { id: '1', title: 'Omelett mit Speck', emoji: '🍳', kcal: 320, zubereitungszeit_min: 15 },
  { id: '2', title: 'Müsli mit Joghurt', emoji: '🥣', kcal: 380, zubereitungszeit_min: 5 },
  { id: '3', title: 'Pasta Carbonara', emoji: '🍝', kcal: 620, zubereitungszeit_min: 25 },
  { id: '4', title: 'Hähnchen Curry', emoji: '🍛', kcal: 580, zubereitungszeit_min: 35 },
  { id: '5', title: 'Salat mit Feta', emoji: '🥗', kcal: 280, zubereitungszeit_min: 10 },
  { id: '6', title: 'Salmon Steak', emoji: '🐟', kcal: 520, zubereitungszeit_min: 30 },
  { id: '7', title: 'Pizza Margherita', emoji: '🍕', kcal: 650, zubereitungszeit_min: 40 },
  { id: '8', title: 'Veggie Burger', emoji: '🍔', kcal: 480, zubereitungszeit_min: 20 },
];

/**
 * Recipe Picker Modal
 */
function RecipePickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}) {
  const [searchText, setSearchText] = useState('');

  const filtered = MOCK_RECIPES.filter(r =>
    r.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.recipePickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Rezept wählen</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchContainer}>
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Rezepte durchsuchen..."
              placeholderTextColor={Colors.textLight}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recipePickerItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.recipePickerEmoji}>{item.emoji || '🍽️'}</Text>
                <View style={styles.recipePickerInfo}>
                  <Text style={styles.recipePickerTitle}>{item.title}</Text>
                  <Text style={styles.recipePickerMeta}>
                    {item.kcal} kcal · {item.zubereitungszeit_min} min
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.recipePickerList}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Meal Slot Component
 */
function MealSlot({
  mealType,
  recipe,
  onPress,
  onRemove,
}: {
  mealType: MealType;
  recipe?: Recipe;
  onPress: () => void;
  onRemove: () => void;
}) {
  const config = MEAL_CONFIG[mealType];

  return (
    <TouchableOpacity
      style={[styles.mealSlot, recipe && styles.mealSlotAssigned]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mealSlotHeader}>
        <Text style={styles.mealSlotEmoji}>{config.emoji}</Text>
        <Text style={styles.mealSlotLabel}>{config.label}</Text>
      </View>

      {recipe ? (
        <View style={styles.mealSlotContent}>
          <View style={styles.recipePreview}>
            <Text style={styles.recipePreviewEmoji}>{recipe.emoji || '🍽️'}</Text>
            <View style={styles.recipePreviewInfo}>
              <Text style={styles.recipePreviewTitle} numberOfLines={1}>
                {recipe.title}
              </Text>
              {recipe.kcal && (
                <Text style={styles.recipePreviewMeta}>
                  {recipe.kcal} kcal · {recipe.zubereitungszeit_min} min
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.mealSlotRemoveButton}
            onPress={onRemove}
          >
            <Text style={styles.mealSlotRemoveText}>×</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mealSlotEmpty}>
          <Text style={styles.mealSlotEmptyIcon}>+</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Day Card Component
 */
function DayCard({
  dayIndex,
  meals,
  onMealPress,
  onMealRemove,
}: {
  dayIndex: number;
  meals: DayMeals;
  onMealPress: (mealType: MealType) => void;
  onMealRemove: (mealType: MealType) => void;
}) {
  const dayTotalKcal = MEAL_TYPES.reduce((sum, type) => {
    const meal = meals[type];
    return sum + (meal?.kcal || 0);
  }, 0);

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{WEEKDAYS[dayIndex]}</Text>
        <Text style={styles.dayKcal}>{dayTotalKcal} kcal</Text>
      </View>

      <View style={styles.mealsGrid}>
        {MEAL_TYPES.map(mealType => (
          <MealSlot
            key={mealType}
            mealType={mealType}
            recipe={meals[mealType]}
            onPress={() => onMealPress(mealType)}
            onRemove={() => onMealRemove(mealType)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Main Weekly Plan Screen
 */
export default function WochenplanScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekPlan, setWeekPlan] = useState<DayMeals[]>(
    Array(7).fill(null).map(() => ({}))
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<{ dayIndex: number; mealType: MealType } | null>(null);

  const weekNumber = getWeekNumber() + weekOffset;

  /**
   * Handle meal selection
   */
  const handleMealSelect = (recipe: Recipe) => {
    if (!selectedMealSlot) return;

    setWeekPlan(prev => {
      const updated = [...prev];
      updated[selectedMealSlot.dayIndex] = {
        ...updated[selectedMealSlot.dayIndex],
        [selectedMealSlot.mealType]: recipe,
      };
      return updated;
    });
  };

  /**
   * Handle meal removal
   */
  const handleMealRemove = (dayIndex: number, mealType: MealType) => {
    setWeekPlan(prev => {
      const updated = [...prev];
      const dayMeals = { ...updated[dayIndex] };
      delete dayMeals[mealType];
      updated[dayIndex] = dayMeals;
      return updated;
    });
  };

  /**
   * Open recipe picker for specific meal
   */
  const openRecipePicker = (dayIndex: number, mealType: MealType) => {
    setSelectedMealSlot({ dayIndex, mealType });
    setPickerVisible(true);
  };

  /**
   * Calculate week total calories
   */
  const weekTotalKcal = weekPlan.reduce((sum, dayMeals) => {
    return sum + MEAL_TYPES.reduce((daySum, mealType) => {
      const meal = dayMeals[mealType];
      return daySum + (meal?.kcal || 0);
    }, 0);
  }, 0);

  /**
   * Add all ingredients to shopping list
   */
  const handleAddAllToList = () => {
    const recipesCount = weekPlan.reduce((sum, dayMeals) => {
      return sum + MEAL_TYPES.filter(type => dayMeals[type]).length;
    }, 0);

    if (recipesCount === 0) {
      Alert.alert('Keine Rezepte', 'Füge zuerst Rezepte zum Wochenplan hinzu');
      return;
    }

    Alert.alert(
      'Alle Zutaten zur Liste',
      `${recipesCount} Rezepte werden der Einkaufsliste hinzugefügt`,
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  /**
   * Generate plan with AI (placeholder)
   */
  const handleGeneratePlan = () => {
    Alert.alert(
      'Wochenplan generieren',
      'KI erstellt einen optimierten Wochenplan basierend auf deinen Vorlieben',
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity
          onPress={() => setWeekOffset(w => w - 1)}
          activeOpacity={0.6}
        >
          <Text style={styles.navArrow}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.weekLabel}>
          KW {weekNumber}
        </Text>

        <TouchableOpacity
          onPress={() => setWeekOffset(w => w + 1)}
          activeOpacity={0.6}
        >
          <Text style={styles.navArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Week Summary */}
      <View style={styles.weeklySummary}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>Wochenziel</Text>
          <Text style={styles.summaryKcal}>{weekTotalKcal} kcal</Text>
        </View>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>Rezepte</Text>
          <Text style={styles.summaryCount}>
            {weekPlan.reduce((sum, day) => sum + MEAL_TYPES.filter(t => day[t]).length, 0)}/28
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGeneratePlan}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>✨ Plan generieren</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddAllToList}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>🛒 Alle Zutaten</Text>
        </TouchableOpacity>
      </View>

      {/* Days Grid */}
      <View style={styles.daysContainer}>
        {WEEKDAYS.map((_, dayIndex) => (
          <DayCard
            key={dayIndex}
            dayIndex={dayIndex}
            meals={weekPlan[dayIndex]}
            onMealPress={(mealType) => openRecipePicker(dayIndex, mealType)}
            onMealRemove={(mealType) => handleMealRemove(dayIndex, mealType)}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      {/* Recipe Picker Modal */}
      <RecipePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleMealSelect}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Week Navigation
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navArrow: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  // Weekly Summary
  weeklySummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  summaryInfo: {
    flex: 1,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryKcal: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Days Container
  daysContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dayCard: {
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dayKcal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  mealsGrid: {
    gap: 8,
  },
  // Meal Slot
  mealSlot: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  mealSlotAssigned: {
    borderStyle: 'solid',
    borderColor: Colors.secondary,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  mealSlotEmoji: {
    fontSize: 18,
  },
  mealSlotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  mealSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recipePreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  recipePreviewEmoji: {
    fontSize: 20,
  },
  recipePreviewInfo: {
    flex: 1,
  },
  recipePreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  recipePreviewMeta: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mealSlotEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  mealSlotEmptyIcon: {
    fontSize: 20,
    color: Colors.textLight,
  },
  mealSlotRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dealBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotRemoveText: {
    fontSize: 18,
    color: Colors.dealBadge,
    fontWeight: '300',
  },
  // Recipe Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  recipePickerContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  pickerCloseText: {
    fontSize: 24,
    color: Colors.textLight,
  },
  pickerSearchContainer: {
    marginBottom: 12,
  },
  pickerSearchInput: {
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recipePickerList: {
    paddingBottom: 20,
  },
  recipePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  recipePickerEmoji: {
    fontSize: 24,
  },
  recipePickerInfo: {
    flex: 1,
  },
  recipePickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recipePickerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  spacer: {
    height: 20,
  },
});
