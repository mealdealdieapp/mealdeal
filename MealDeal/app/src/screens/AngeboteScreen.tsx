import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';
import { OFFER_CATEGORY_CONFIG, OFFER_CATEGORY_ORDER } from '../lib/offerCategoryConfig';

interface Offer {
  id: string;
  product_name: string;
  store: string;
  offer_price: number;
  original_price: number;
  discount_percent: number;
  valid_from: string;
  valid_until: string;
  category: string;
  emoji: string;
  quantity?: number;
  unit?: string;
  image_url?: string;
  plz_prefix: string;
}

interface CategoryGroup {
  category: string;
  config: typeof OFFER_CATEGORY_CONFIG[string];
  offers: Offer[];
  expanded: boolean;
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

/**
 * Store Color Badge
 */
function StoreColorBadge({ store }: { store: string }) {
  const color = STORE_COLORS[store.toLowerCase()] || Colors.textSecondary;
  return <View style={[styles.storeColorBadge, { backgroundColor: color }]} />;
}

/**
 * Offer Card Component
 */
function OfferCard({ offer, onAddToList }: { offer: Offer; onAddToList: () => void }) {
  const discountColor = offer.discount_percent > 30 ? Colors.dealBadge : Colors.warning;

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTitleRow}>
          <StoreColorBadge store={offer.store} />
          <Text style={styles.storeName}>{offer.store.toUpperCase()}</Text>
        </View>
        <Text style={[styles.discountBadge, { backgroundColor: discountColor }]}>
          {Math.round(offer.discount_percent)}%
        </Text>
      </View>

      <Text style={styles.productName} numberOfLines={2}>
        {offer.product_name}
      </Text>

      <View style={styles.priceSection}>
        <View>
          <Text style={styles.offerPrice}>€{offer.offer_price.toFixed(2)}</Text>
          {offer.original_price > offer.offer_price && (
            <Text style={styles.originalPrice}>€{offer.original_price.toFixed(2)}</Text>
          )}
        </View>
        {offer.quantity && offer.unit && (
          <Text style={styles.quantity}>
            {offer.quantity} {offer.unit}
          </Text>
        )}
      </View>

      <Text style={styles.validUntil}>
        Gültig bis: {new Date(offer.valid_until).toLocaleDateString('de-DE')}
      </Text>

      <TouchableOpacity
        style={styles.addToListButton}
        onPress={onAddToList}
        activeOpacity={0.7}
      >
        <Text style={styles.addToListText}>Zur Liste</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Category Grid Item (collapsed)
 */
function CategoryGridItem({
  item,
  onPress,
}: {
  item: CategoryGroup;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.categoryGridItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryEmoji}>{item.config.emoji}</Text>
      <Text style={styles.categoryLabel}>{item.config.label}</Text>
      <Text style={styles.offerCount}>{item.offers.length} Angebote</Text>
      {item.offers.length > 0 && (
        <View style={styles.bestDiscountBadge}>
          <Text style={styles.bestDiscountText}>
            Bis {Math.round(Math.max(...item.offers.map(o => o.discount_percent)))}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Main Angebote (Offers) Screen
 */
export default function AngeboteScreen() {
  const profile = useAppStore((s) => s.profile);
  const [searchText, setSearchText] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    profile?.markets || []
  );
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load offers from Supabase
   */
  useEffect(() => {
    const loadOffers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!profile?.plz) {
          setError('Postleitzahl nicht gesetzt');
          setIsLoading(false);
          return;
        }

        const plzPrefix = profile.plz.substring(0, 2);
        const today = new Date().toISOString().slice(0, 10);

        const { data, error: dbError } = await supabase
          .from('offers')
          .select('*')
          .eq('plz_prefix', plzPrefix)
          .gte('valid_until', today)
          .order('offer_price', { ascending: true });

        if (dbError) {
          console.error('Supabase error:', dbError);
          setError('Fehler beim Laden der Angebote');
          setAllOffers([]);
        } else {
          setAllOffers(data || []);
        }
      } catch (err) {
        console.error('Error loading offers:', err);
        setError('Fehler beim Laden der Angebote');
      } finally {
        setIsLoading(false);
      }
    };

    loadOffers();
  }, [profile?.plz]);

  /**
   * Filter offers by search and selected markets
   */
  const filteredOffers = useMemo(() => {
    return allOffers.filter(offer => {
      const marketMatch =
        selectedMarkets.length === 0 ||
        selectedMarkets.includes(offer.store.toLowerCase());

      const searchMatch =
        !searchText ||
        offer.product_name.toLowerCase().includes(searchText.toLowerCase());

      return marketMatch && searchMatch;
    });
  }, [allOffers, selectedMarkets, searchText]);

  /**
   * Group offers by category
   */
  const categorizedOffers = useMemo(() => {
    const grouped: Record<string, Offer[]> = {};

    filteredOffers.forEach(offer => {
      const category = offer.category || 'Sonstiges Lebensmittel';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(offer);
    });

    return OFFER_CATEGORY_ORDER
      .filter(cat => grouped[cat])
      .map(cat => ({
        category: cat,
        config: OFFER_CATEGORY_CONFIG[cat] || OFFER_CATEGORY_CONFIG['Sonstiges Lebensmittel'],
        offers: grouped[cat],
        expanded: expandedCategory === cat,
      }));
  }, [filteredOffers, expandedCategory]);

  /**
   * Get unique markets from selected user markets
   */
  const availableMarkets = useMemo(() => {
    return selectedMarkets.length > 0
      ? selectedMarkets
      : ['rewe', 'lidl', 'aldi_sued', 'aldi_nord', 'edeka', 'penny', 'netto', 'kaufland'];
  }, [selectedMarkets]);

  /**
   * Handle adding offer to shopping list
   */
  const handleAddToList = (offer: Offer) => {
    Alert.alert('Zur Liste hinzugefügt', `${offer.product_name} wurde der Einkaufsliste hinzugefügt`);
  };

  /**
   * Toggle market filter
   */
  const toggleMarket = (market: string) => {
    setSelectedMarkets(prev =>
      prev.includes(market)
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  /**
   * Toggle category expansion
   */
  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Angebote werden geladen...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.topSection}>
        <Text style={styles.headerText}>Aktuelle Angebote</Text>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Produkt suchen..."
            placeholderTextColor={Colors.textLight}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Market Filter */}
      <View style={styles.marketFilterSection}>
        <Text style={styles.filterLabel}>Deine Märkte:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.marketFilterContent}
        >
          {availableMarkets.map(market => {
            const isSelected = selectedMarkets.includes(market) || selectedMarkets.length === 0;
            return (
              <TouchableOpacity
                key={market}
                style={[
                  styles.marketButton,
                  isSelected && styles.marketButtonActive,
                ]}
                onPress={() => toggleMarket(market)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.marketColorDot,
                    { backgroundColor: STORE_COLORS[market] || Colors.textSecondary },
                  ]}
                />
                <Text
                  style={[
                    styles.marketButtonText,
                    isSelected && styles.marketButtonTextActive,
                  ]}
                >
                  {market.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Grid or Expanded View */}
      {expandedCategory ? (
        // Expanded category view
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setExpandedCategory(null)}
            activeOpacity={0.6}
          >
            <Text style={styles.backButtonText}>← Zurück</Text>
          </TouchableOpacity>

          {categorizedOffers
            .find(c => c.category === expandedCategory)
            ?.offers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onAddToList={() => handleAddToList(offer)}
              />
            ))}
        </>
      ) : (
        // Grid view
        <>
          <View style={styles.categoryGrid}>
            {categorizedOffers.map(item => (
              <CategoryGridItem
                key={item.category}
                item={item}
                onPress={() => toggleCategory(item.category)}
              />
            ))}
          </View>

          {categorizedOffers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🛒</Text>
              <Text style={styles.emptyStateText}>Keine Angebote gefunden</Text>
              <Text style={styles.emptyStateSubtext}>
                Versuche, deine Märkte auszuwählen oder deine Suche anzupassen.
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.dealBadge,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: Colors.dealBadge,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Market Filter
  marketFilterSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  marketFilterContent: {
    gap: 8,
    paddingRight: 16,
  },
  marketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.backgroundGrey,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  marketButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  marketColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  marketButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  marketButtonTextActive: {
    color: '#FFFFFF',
  },
  // Back Button
  backButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundGrey,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  categoryGridItem: {
    width: '48%',
    backgroundColor: Colors.backgroundGrey,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  offerCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  bestDiscountBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.dealBackground,
    borderRadius: 6,
  },
  bestDiscountText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dealBadge,
  },
  // Offer Card
  offerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeColorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  storeName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  offerPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  quantity: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  validUntil: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 10,
  },
  addToListButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addToListText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
});
