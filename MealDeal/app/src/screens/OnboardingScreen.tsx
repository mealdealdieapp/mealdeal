import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { setProfile, setOnboardingComplete, UserProfile } from '../store/useAppStore';

// Market data with emojis
const SUPERMAERKTE = [
  { id: 'rewe', label: 'REWE', emoji: '🟢' },
  { id: 'aldi_sued', label: 'ALDI Süd', emoji: '🔵' },
  { id: 'aldi_nord', label: 'ALDI Nord', emoji: '🔵' },
  { id: 'lidl', label: 'Lidl', emoji: '🟡' },
  { id: 'edeka', label: 'Edeka', emoji: '🟡' },
  { id: 'penny', label: 'Penny', emoji: '🔴' },
  { id: 'netto', label: 'Netto', emoji: '🟡' },
  { id: 'kaufland', label: 'Kaufland', emoji: '🔴' },
];

const ERNAEHRUNGSFORMEN = [
  { id: 'omnivor', label: 'Alles', emoji: '🍽️' },
  { id: 'vegetarisch', label: 'Vegetarisch', emoji: '🥬' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'pescetarisch', label: 'Pescetarisch', emoji: '🐟' },
];

// Additional diet options
const DIET_OPTIONS = [
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'koscher', label: 'Koscher', emoji: '✡️' },
  { id: 'high_protein', label: 'High-Protein', emoji: '💪' },
  { id: 'low_carb', label: 'Low-Carb', emoji: '🥑' },
];

const VORLIEBEN = [
  { id: 'bio', label: 'Bio', emoji: '🌿' },
  { id: 'bessere_haltung', label: 'Bessere Haltung', emoji: '🐄' },
  { id: 'regional', label: 'Regional', emoji: '📍' },
  { id: 'nachhaltig', label: 'Nachhaltig', emoji: '♻️' },
  { id: 'preis_leistung', label: 'Preis-Leistung', emoji: '💰' },
  { id: 'markenprodukte', label: 'Markenprodukte', emoji: '⭐' },
];

interface OnboardingState {
  plz: string;
  supermaerkte: string[];
  ernaehrungsform: string | null;
  dietOptions: string[];
  vorlieben: string[];
}

const initialState: OnboardingState = {
  plz: '',
  supermaerkte: [],
  ernaehrungsform: null,
  dietOptions: [],
  vorlieben: [],
};

type Step = 1 | 2 | 3 | 4 | 5;

export function OnboardingScreen({ navigation }: any) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<OnboardingState>(initialState);
  // Actions sind jetzt direkte Funktionen (kein zustand mehr)

  const handleNext = () => {
    // Validate current step
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step);
    } else {
      // Complete onboarding
      saveProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.plz) {
          Alert.alert('Fehler', 'Bitte PLZ eingeben');
          return false;
        }
        if (!/^\d{5}$/.test(formData.plz)) {
          Alert.alert('Fehler', 'PLZ muss genau 5 Ziffern haben');
          return false;
        }
        return true;
      case 2:
        if (formData.supermaerkte.length === 0) {
          Alert.alert('Fehler', 'Bitte mindestens einen Supermarkt wählen');
          return false;
        }
        return true;
      case 3:
        if (!formData.ernaehrungsform) {
          Alert.alert('Fehler', 'Bitte eine Ernährungsform wählen');
          return false;
        }
        return true;
      case 4:
        if (formData.vorlieben.length === 0) {
          Alert.alert('Fehler', 'Bitte mindestens eine Vorliebe wählen');
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const saveProfile = () => {
    const newProfile: UserProfile = {
      id: String(Date.now()),
      plz: formData.plz,
      markets: formData.supermaerkte,
      diets: [formData.ernaehrungsform || 'omnivor', ...formData.dietOptions],
      preferences: formData.vorlieben,
      goal: 'maintain',
      budget: null,
      cal_target: null,
      gender: null,
      age: null,
      weight: null,
      height: null,
      activity: null,
    };
    setProfile(newProfile);
    navigation?.replace('MainTabs');
  };

  const toggleSupermarkt = (id: string) => {
    setFormData((prev) => {
      const supermaerkte = prev.supermaerkte.includes(id)
        ? prev.supermaerkte.filter((s) => s !== id)
        : [...prev.supermaerkte, id];
      return { ...prev, supermaerkte };
    });
  };

  const toggleErnaehrungsform = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      ernaehrungsform: prev.ernaehrungsform === id ? null : id,
    }));
  };

  const toggleDietOption = (id: string) => {
    setFormData((prev) => {
      const dietOptions = prev.dietOptions.includes(id)
        ? prev.dietOptions.filter((d) => d !== id)
        : [...prev.dietOptions, id];
      return { ...prev, dietOptions };
    });
  };

  const toggleVorliebe = (id: string) => {
    setFormData((prev) => {
      const vorlieben = prev.vorlieben.includes(id)
        ? prev.vorlieben.filter((v) => v !== id)
        : [...prev.vorlieben, id];
      return { ...prev, vorlieben };
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>🍽️ MealDeal</Text>
        <Text style={styles.tagline}>Smarte Einkaufslisten für bessere Deals</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <Text style={styles.stepText}>
          Schritt {currentStep} von 5
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentInner}
      >
        {currentStep === 1 && <Step1PlzInput formData={formData} setFormData={setFormData} />}
        {currentStep === 2 && (
          <Step2Supermaerkte
            formData={formData}
            toggleSupermarkt={toggleSupermarkt}
          />
        )}
        {currentStep === 3 && (
          <Step3Ernaehrungsform
            formData={formData}
            toggleErnaehrungsform={toggleErnaehrungsform}
            toggleDietOption={toggleDietOption}
          />
        )}
        {currentStep === 4 && (
          <Step4Vorlieben formData={formData} toggleVorliebe={toggleVorliebe} />
        )}
        {currentStep === 5 && <Step5Zusammenfassung formData={formData} />}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleBack}
          >
            <Text style={styles.buttonTextSecondary}>Zurück</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentStep === 5 ? 'Los geht\'s!' : 'Weiter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// STEP 1: PLZ Input
// ============================================
function Step1PlzInput({
  formData,
  setFormData,
}: {
  formData: OnboardingState;
  setFormData: (data: OnboardingState) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>📍 Wo wohnst du?</Text>
      <Text style={styles.stepDescription}>
        Gib deine Postleitzahl ein, um Supermärkte und Angebote in deiner Nähe zu finden
      </Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Postleitzahl (z.B. 10115)"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          maxLength={5}
          value={formData.plz}
          onChangeText={(text) =>
            setFormData({ ...formData, plz: text.replace(/[^0-9]/g, '') })
          }
        />
        <Text style={styles.inputHint}>
          {formData.plz.length}/5 Ziffern
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Wir nutzen deine PLZ nur, um dir lokale Angebote zu zeigen und speichern sie nicht.
        </Text>
      </View>
    </View>
  );
}

// ============================================
// STEP 2: Supermarkets Selection
// ============================================
function Step2Supermaerkte({
  formData,
  toggleSupermarkt,
}: {
  formData: OnboardingState;
  toggleSupermarkt: (id: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>🛒 Welche Supermärkte nutzt du?</Text>
      <Text style={styles.stepDescription}>
        Wähle alle Märkte aus, in denen du einkaufen möchtest
      </Text>

      <View style={styles.gridContainer}>
        {SUPERMAERKTE.map((market) => {
          const isSelected = formData.supermaerkte.includes(market.id);
          return (
            <TouchableOpacity
              key={market.id}
              style={[
                styles.gridCard,
                isSelected && styles.gridCardSelected,
              ]}
              onPress={() => toggleSupermarkt(market.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.gridEmoji}>{market.emoji}</Text>
              <Text style={[styles.gridLabel, isSelected && styles.gridLabelSelected]}>
                {market.label}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Du kannst deine Auswahl später jederzeit ändern.
        </Text>
      </View>
    </View>
  );
}

// ============================================
// STEP 3: Diet & Preferences
// ============================================
function Step3Ernaehrungsform({
  formData,
  toggleErnaehrungsform,
  toggleDietOption,
}: {
  formData: OnboardingState;
  toggleErnaehrungsform: (id: string) => void;
  toggleDietOption: (id: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>🍽️ Ernährungsform</Text>
      <Text style={styles.stepDescription}>
        Wähle deine Ernährungsform aus
      </Text>

      {/* Main Diet Options */}
      <View style={styles.sectionContainer}>
        {ERNAEHRUNGSFORMEN.map((option) => {
          const isSelected = formData.ernaehrungsform === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => toggleErnaehrungsform(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </View>
              {isSelected && <Text style={styles.optionCheckmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Additional Diet Options */}
      <Text style={styles.sectionTitle}>Zusätzliche Optionen (optional)</Text>
      <View style={styles.multiSelectGrid}>
        {DIET_OPTIONS.map((option) => {
          const isSelected = formData.dietOptions.includes(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.multiSelectCard,
                isSelected && styles.multiSelectCardSelected,
              ]}
              onPress={() => toggleDietOption(option.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.gridEmoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.gridLabel,
                  isSelected && styles.gridLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ============================================
// STEP 4: Preferences
// ============================================
function Step4Vorlieben({
  formData,
  toggleVorliebe,
}: {
  formData: OnboardingState;
  toggleVorliebe: (id: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>❤️ Deine Vorlieben</Text>
      <Text style={styles.stepDescription}>
        Wähle mindestens eine Vorliebe aus
      </Text>

      <View style={styles.gridContainer}>
        {VORLIEBEN.map((pref) => {
          const isSelected = formData.vorlieben.includes(pref.id);
          return (
            <TouchableOpacity
              key={pref.id}
              style={[
                styles.gridCard,
                isSelected && styles.gridCardSelected,
              ]}
              onPress={() => toggleVorliebe(pref.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.gridEmoji}>{pref.emoji}</Text>
              <Text style={[styles.gridLabel, isSelected && styles.gridLabelSelected]}>
                {pref.label}
              </Text>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🎯 Deine Vorlieben helfen uns, die besten Angebote für dich zu finden.
        </Text>
      </View>
    </View>
  );
}

// ============================================
// STEP 5: Summary
// ============================================
function Step5Zusammenfassung({ formData }: { formData: OnboardingState }) {
  const selectedMarkets = SUPERMAERKTE.filter((m) =>
    formData.supermaerkte.includes(m.id)
  );
  const selectedDiet = ERNAEHRUNGSFORMEN.find(
    (e) => e.id === formData.ernaehrungsform
  );
  const selectedDietOptions = DIET_OPTIONS.filter((d) =>
    formData.dietOptions.includes(d.id)
  );
  const selectedPrefs = VORLIEBEN.filter((v) =>
    formData.vorlieben.includes(v.id)
  );

  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>✓ Zusammenfassung</Text>
      <Text style={styles.stepDescription}>
        Überprüfe deine Angaben
      </Text>

      {/* PLZ */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>📍 Postleitzahl</Text>
        <Text style={styles.summaryValue}>{formData.plz}</Text>
      </View>

      {/* Supermarkets */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>🛒 Supermärkte</Text>
        <View style={styles.summaryTags}>
          {selectedMarkets.map((m) => (
            <View key={m.id} style={styles.tag}>
              <Text style={styles.tagText}>{m.emoji} {m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Diet */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>🍽️ Ernährungsform</Text>
        <Text style={styles.summaryValue}>
          {selectedDiet?.emoji} {selectedDiet?.label}
        </Text>
        {selectedDietOptions.length > 0 && (
          <View style={styles.summaryTags}>
            {selectedDietOptions.map((d) => (
              <View key={d.id} style={styles.tag}>
                <Text style={styles.tagText}>{d.emoji} {d.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Preferences */}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>❤️ Vorlieben</Text>
        <View style={styles.summaryTags}>
          {selectedPrefs.map((p) => (
            <View key={p.id} style={styles.tag}>
              <Text style={styles.tagText}>{p.emoji} {p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🚀 Du bist bereit! Klicke auf "Los geht's!" um zu starten.
        </Text>
      </View>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.9,
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.backgroundGrey,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.secondary,
  },
  stepIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundGrey,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  step: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  gridCard: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    aspectRatio: 1,
  },
  gridCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF0E8',
  },
  gridEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  gridLabelSelected: {
    color: Colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: Colors.background,
    borderRadius: 50,
    paddingHorizontal: 5,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF0E8',
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionCheckmark: {
    fontSize: 20,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 12,
  },
  multiSelectGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  multiSelectCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    aspectRatio: 1,
  },
  multiSelectCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF0E8',
  },
  summarySection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summarySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.background,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.backgroundGrey,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default OnboardingScreen;
