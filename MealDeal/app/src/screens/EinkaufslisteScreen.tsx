import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert,
} from 'react-native';
import { Colors } from '../constants/colors';

interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  checked: boolean;
  store: string;
  offerPrice?: number;
  offerProductName?: string;
}

const STORE_COLORS: Record<string, string> = {
  rewe: Colors.rewe,
  lidl: Colors.lidl,
  aldi: Colors.aldi,
  edeka: Colors.edeka,
  penny: Colors.penny,
  netto: Colors.netto,
  kaufland: Colors.kaufland,
};

const UNITS = ['kg', 'g', 'L', 'ml', 'Stück', 'Packung', 'Bund', 'Dose'];

/**
 * Add Item Modal
 */
function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; amount: string; unit: string }) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('Stück');

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Artikelnamen ein');
      return;
    }
    onAdd({ name: name.trim(), amount, unit });
    setName('');
    setAmount('');
    setUnit('Stück');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Artikel hinzufügen</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalInputSection}>
            <Text style={styles.modalLabel}>Artikelname *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="z.B. Milch, Brot..."
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.modalRowInputs}>
            <View style={[styles.modalInputSection, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.modalLabel}>Menge</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="z.B. 2, 500..."
                placeholderTextColor={Colors.textLight}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.modalInputSection, { flex: 1 }]}>
              <Text style={styles.modalLabel}>Einheit</Text>
              <TouchableOpacity style={styles.modalSelect}>
                <Text style={styles.modalSelectText}>{unit}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.modalAddButton} onPress={handleAdd}>
            <Text style={styles.modalAddButtonText}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Shopping List Item
 */
function ShoppingListItem({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={[styles.itemContainer, item.checked && styles.itemContainerChecked]}>
      <TouchableOpacity
        style={styles.checkboxArea}
        onPress={() => onToggle(item.id)}
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.name}
        </Text>
        {item.amount && (
          <Text style={styles.itemAmount}>
            {item.amount} {item.unit}
          </Text>
        )}
        {item.offerPrice && (
          <Text style={styles.offerBadge}>
            {item.offerProductName} · €{item.offerPrice.toFixed(2)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.id)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Main Shopping List Screen
 */
export default function EinkaufslisteScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  /**
   * Toggle item checked state
   */
  const handleToggleItem = (id: string) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, checked: !i.checked } : i
    ));
  };

  /**
   * Remove item from list
   */
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  /**
   * Add new custom item
   */
  const handleAddItem = (newItem: { name: string; amount: string; unit: string }) => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      ...newItem,
      checked: false,
      store: 'Sonstiges',
    }]);
  };

  /**
   * Complete shopping (clear checked items)
   */
  const handleCompleteShoppingTrip = () => {
    if (checkedCount === 0) {
      Alert.alert('Keine Artikel erledigt', 'Häkche zuerst Artikel ab');
      return;
    }

    Alert.alert(
      'Einkauf abschließen',
      `${checkedCount} Artikel wurden als erledigt markiert. Möchtest du diese entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, entfernen',
          onPress: () => {
            setItems(prev => prev.filter(i => !i.checked));
          },
        },
      ]
    );
  };

  /**
   * Clear entire list
   */
  const handleClearList = () => {
    if (items.length === 0) return;

    Alert.alert(
      'Liste leeren',
      'Möchtest du alle Artikel wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Leeren',
          onPress: () => setItems([]),
          style: 'destructive',
        },
      ]
    );
  };

  /**
   * Group items by store
   */
  const groupedByStore = items.reduce((acc, item) => {
    const store = item.store || 'Sonstiges';
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const isEmpty = items.length === 0;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      {!isEmpty && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Fortschritt</Text>
            <Text style={styles.progressCount}>
              {checkedCount}/{totalCount} erledigt
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(checkedCount / totalCount) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Empty State */}
      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Deine Einkaufsliste ist leer</Text>
          <Text style={styles.emptySubtitle}>
            Tippe auf die Schaltfläche unten, um Artikel hinzuzufügen
          </Text>
        </View>
      ) : (
        // Shopping List by Store
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedByStore).map(([store, storeItems]) => (
            <View key={store} style={styles.storeGroup}>
              <View
                style={[
                  styles.storeHeader,
                  { borderLeftColor: STORE_COLORS[store.toLowerCase()] || Colors.textSecondary },
                ]}
              >
                <View style={styles.storeHeaderLeft}>
                  <View
                    style={[
                      styles.storeColorDot,
                      { backgroundColor: STORE_COLORS[store.toLowerCase()] || Colors.textSecondary },
                    ]}
                  />
                  <Text style={styles.storeHeaderText}>{store}</Text>
                </View>
                <Text style={styles.storeItemCount}>{storeItems.length}</Text>
              </View>

              <View style={styles.storeItems}>
                {storeItems.map(item => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.spacer} />
        </ScrollView>
      )}

      {/* Floating Action Buttons */}
      <View style={styles.bottomActions}>
        {!isEmpty && (
          <>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteShoppingTrip}
              activeOpacity={0.7}
            >
              <Text style={styles.completeButtonText}>Einkauf abschließen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearList}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Liste leeren</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Add Item Modal */}
      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Progress Section
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressInfo: {
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // List Container
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  storeGroup: {
    marginBottom: 20,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  storeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  storeHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  storeItemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  storeItems: {
    gap: 8,
  },
  // Shopping List Item
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 10,
    gap: 10,
  },
  itemContainerChecked: {
    opacity: 0.6,
  },
  checkboxArea: {
    paddingVertical: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  itemAmount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  offerBadge: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  removeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 24,
    color: Colors.dealBadge,
    fontWeight: '300',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseText: {
    fontSize: 24,
    color: Colors.textLight,
  },
  modalInputSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalRowInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modalSelect: {
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  modalSelectText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  modalAddButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Bottom Actions
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completeButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearButton: {
    backgroundColor: Colors.dealBackground,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dealBadge,
  },
  addButton: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  spacer: {
    height: 20,
  },
});
