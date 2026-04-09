import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useAppStore, updateProfile, setOnboardingComplete } from '../store/useAppStore';

const ProfilScreen = () => {
  const profile = useAppStore((s) => s.profile);

  const [plzModalVisible, setPlzModalVisible] = useState(false);
  const [tempPlz, setTempPlz] = useState(profile?.plz || '');

  const [marketModalVisible, setMarketModalVisible] = useState(false);
  const availableMarkets = ['REWE', 'EDEKA', 'ALDI', 'LIDL', 'PENNY', 'NETTO', 'KAUFLAND', 'BIPA', 'DM', 'BAUMARKT', 'ROSSMANN', 'MÜLLER'];

  const [dietModalVisible, setDietModalVisible] = useState(false);
  const dietOptions = ['Omnivore', 'Vegetarisch', 'Vegan', 'Glutenfrei', 'Laktosefrei'];

  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const preferenceOptions = ['Bio', 'Regional', 'Fair Trade', 'Verpackungsarm'];

  const [calorieModalVisible, setCalorieModalVisible] = useState(false);
  const [tempCalorie, setTempCalorie] = useState(profile?.cal_target?.toString() || '2000');

  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [tempBudget, setTempBudget] = useState(profile?.budget?.toString() || '100');

  const handlePlzSave = () => {
    if (tempPlz.length === 5 && /^\d+$/.test(tempPlz)) {
      updateProfile({ plz: tempPlz });
      setPlzModalVisible(false);
    } else {
      Alert.alert('Ungültige PLZ', 'Bitte geben Sie eine 5-stellige PLZ ein.');
    }
  };

  const handleMarketToggle = (market: string) => {
    const currentMarkets = profile?.markets || [];
    const updatedMarkets = currentMarkets.includes(market)
      ? currentMarkets.filter((m) => m !== market)
      : [...currentMarkets, market];
    updateProfile({ markets: updatedMarkets });
  };

  const handleDietSelect = (diet: string) => {
    const currentDiets = profile?.diets || [];
    const updatedDiets = currentDiets.includes(diet)
      ? currentDiets.filter((d) => d !== diet)
      : [...currentDiets, diet];
    updateProfile({ diets: updatedDiets });
    setDietModalVisible(false);
  };

  const handlePreferenceToggle = (pref: string) => {
    const currentPrefs = profile?.preferences || [];
    const updatedPrefs = currentPrefs.includes(pref)
      ? currentPrefs.filter((p) => p !== pref)
      : [...currentPrefs, pref];
    updateProfile({ preferences: updatedPrefs });
  };

  const handleCalorieSave = () => {
    const calorie = parseInt(tempCalorie, 10);
    if (!isNaN(calorie) && calorie > 0) {
      updateProfile({ cal_target: calorie });
      setCalorieModalVisible(false);
    } else {
      Alert.alert('Ungültige Eingabe', 'Bitte geben Sie eine gültige Kalorienzahl ein.');
    }
  };

  const handleBudgetSave = () => {
    const budget = parseFloat(tempBudget);
    if (!isNaN(budget) && budget > 0) {
      updateProfile({ budget });
      setBudgetModalVisible(false);
    } else {
      Alert.alert('Ungültige Eingabe', 'Bitte geben Sie ein gültiges Budget ein.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Abmelden',
      'Möchten Sie sich wirklich abmelden?',
      [
        { text: 'Abbrechen', onPress: () => {}, style: 'cancel' },
        {
          text: 'Abmelden',
          onPress: () => {
            updateProfile({
              plz: null,
              markets: null,
              diets: null,
              preferences: null,
              cal_target: null,
              budget: null,
            });
            setOnboardingComplete(false);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const marketBadgeColors: { [key: string]: string } = {
    REWE: '#003DA5',
    EDEKA: '#FFD700',
    ALDI: '#E4002B',
    LIDL: '#0066B2',
    PENNY: '#C00E0E',
    NETTO: '#FFB800',
    KAUFLAND: '#FF6600',
    BIPA: '#00A0D2',
    DM: '#0066CC',
    BAUMARKT: '#FF8000',
    ROSSMANN: '#006B35',
    MÜLLER: '#FF0000',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.plzText}>{profile?.plz || 'PLZ'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setTempPlz(profile?.plz || '');
                setPlzModalVisible(true);
              }}
            >
              <Text style={styles.editButtonText}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* Market Badges */}
          <View style={styles.badgesContainer}>
            {(profile?.markets || []).map((market) => (
              <View
                key={market}
                style={[
                  styles.badge,
                  { backgroundColor: marketBadgeColors[market] || '#FF6B35' },
                ]}
              >
                <Text style={styles.badgeText}>{market}</Text>
              </View>
            ))}
          </View>

          {/* Diet & Preferences */}
          {(profile?.diets?.length || 0) > 0 || (profile?.preferences?.length || 0) > 0 ? (
            <View style={styles.dietRow}>
              {profile?.diets && profile.diets.length > 0 && (
                <Text style={styles.dietText}>🥗 {profile.diets.join(', ')}</Text>
              )}
              {profile?.preferences && profile.preferences.length > 0 && (
                <Text style={styles.dietText}>• {profile.preferences.join(', ')}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>€245</Text>
            <Text style={styles.statLabel}>Gespart</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Einkäufe</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Rezepte</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Einstellungen</Text>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              setTempPlz(profile?.plz || '');
              setPlzModalVisible(true);
            }}
          >
            <Text style={styles.settingsLabel}>Postleitzahl</Text>
            <Text style={styles.settingsValue}>{profile?.plz || 'Nicht gesetzt'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setMarketModalVisible(true)}
          >
            <Text style={styles.settingsLabel}>Supermärkte</Text>
            <Text style={styles.settingsValue}>
              {(profile?.markets || []).length} ausgewählt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setDietModalVisible(true)}
          >
            <Text style={styles.settingsLabel}>Ernährung</Text>
            <Text style={styles.settingsValue}>
              {profile?.diets && profile.diets.length > 0 ? profile.diets.length : 'Keine'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setPreferencesModalVisible(true)}
          >
            <Text style={styles.settingsLabel}>Vorlieben</Text>
            <Text style={styles.settingsValue}>
              {(profile?.preferences || []).length} ausgewählt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              setTempCalorie(profile?.cal_target?.toString() || '2000');
              setCalorieModalVisible(true);
            }}
          >
            <Text style={styles.settingsLabel}>Kalorienziel</Text>
            <Text style={styles.settingsValue}>
              {profile?.cal_target || 'Nicht gesetzt'} kcal/Tag
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              setTempBudget(profile?.budget?.toString() || '100');
              setBudgetModalVisible(true);
            }}
          >
            <Text style={styles.settingsLabel}>Budget pro Woche</Text>
            <Text style={styles.settingsValue}>
              {profile?.budget ? `€${profile.budget.toFixed(2)}` : 'Nicht gesetzt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rechtliches</Text>

          <TouchableOpacity style={styles.settingsRow} onPress={() => Alert.alert('Datenschutz', 'Datenschutzerklärung wird angezeigt.')}>
            <Text style={styles.settingsLabel}>Datenschutz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsRow} onPress={() => Alert.alert('Impressum', 'Impressum wird angezeigt.')}>
            <Text style={styles.settingsLabel}>Impressum</Text>
          </TouchableOpacity>

          <View style={[styles.settingsRow, styles.disabledRow]}>
            <Text style={styles.settingsLabel}>App-Version</Text>
            <Text style={styles.settingsValue}>1.0.0</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Abmelden</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      {/* PLZ Modal */}
      <Modal visible={plzModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Postleitzahl ändern</Text>
            <TextInput
              style={styles.textInput}
              placeholder="PLZ eingeben"
              placeholderTextColor="#9CA3AF"
              value={tempPlz}
              onChangeText={setTempPlz}
              keyboardType="numeric"
              maxLength={5}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPlzModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handlePlzSave}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Markets Modal */}
      <Modal visible={marketModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supermärkte auswählen</Text>
            <FlatList
              data={availableMarkets}
              renderItem={({ item }) => {
                const isSelected = (profile?.markets || []).includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.marketItem, isSelected && styles.marketItemSelected]}
                    onPress={() => handleMarketToggle(item)}
                  >
                    <Text style={styles.marketItemText}>
                      {isSelected ? '✓ ' : '  '}{item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => setMarketModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Fertig</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Diet Modal */}
      <Modal visible={dietModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ernährungsweise auswählen</Text>
            <FlatList
              data={dietOptions}
              renderItem={({ item }) => {
                const isSelected = (profile?.diets || []).includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.dietItem, isSelected && styles.dietItemSelected]}
                    onPress={() => handleDietSelect(item)}
                  >
                    <Text style={styles.dietItemText}>
                      {isSelected ? '✓ ' : '  '}{item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => setDietModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Fertig</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Preferences Modal */}
      <Modal visible={preferencesModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vorlieben auswählen</Text>
            <FlatList
              data={preferenceOptions}
              renderItem={({ item }) => {
                const isSelected = (profile?.preferences || []).includes(item);
                return (
                  <TouchableOpacity
                    style={[styles.prefItem, isSelected && styles.prefItemSelected]}
                    onPress={() => handlePreferenceToggle(item)}
                  >
                    <Text style={styles.prefItemText}>
                      {isSelected ? '✓ ' : '  '}{item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => item}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => setPreferencesModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Fertig</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calorie Modal */}
      <Modal visible={calorieModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kalorienziel (kcal/Tag)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. 2000"
              placeholderTextColor="#9CA3AF"
              value={tempCalorie}
              onChangeText={setTempCalorie}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCalorieModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCalorieSave}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Budget Modal */}
      <Modal visible={budgetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Budget pro Woche (€)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. 100"
              placeholderTextColor="#9CA3AF"
              value={tempBudget}
              onChangeText={setTempBudget}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleBudgetSave}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerCard: {
    backgroundColor: '#F5F5F5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plzText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dietRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dietText: {
    fontSize: 13,
    color: '#666666',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  disabledRow: {
    opacity: 0.6,
  },
  settingsLabel: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  settingsValue: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A2E',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#1A1A2E',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  marketItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  marketItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  marketItemText: {
    fontSize: 14,
    color: '#1A1A2E',
  },
  dietItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dietItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  dietItemText: {
    fontSize: 14,
    color: '#1A1A2E',
  },
  prefItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  prefItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  prefItemText: {
    fontSize: 14,
    color: '#1A1A2E',
  },
});

export default ProfilScreen;
