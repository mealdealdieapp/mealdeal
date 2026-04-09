-- ============================================
-- MealDeal Datenbankschema v1.0
-- Für Supabase (PostgreSQL)
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Für Fuzzy-Text-Suche

-- ============================================
-- 1. NUTZER
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Profildaten (aus Onboarding)
    plz VARCHAR(10),
    ernaehrungsform VARCHAR(50) DEFAULT 'omnivor', -- omnivor, vegetarisch, vegan, pescetarisch
    allergien TEXT[] DEFAULT '{}',                   -- Array: gluten, laktose, nuss, ei, soja, etc.
    vorlieben TEXT[] DEFAULT '{}',                   -- Array: scharf, süß, asiatisch, etc.
    supermaerkte TEXT[] DEFAULT '{}',                -- Array: rewe, lidl, aldi, edeka, etc.
    haushalt_groesse INTEGER DEFAULT 1,
    budget_pro_woche DECIMAL(6,2),                  -- Optional

    -- Kalorienziele
    alter_jahre INTEGER,
    geschlecht VARCHAR(10),                          -- m, w, d
    gewicht_kg DECIMAL(5,1),
    groesse_cm INTEGER,
    aktivitaetslevel VARCHAR(20) DEFAULT 'moderat',  -- sedentaer, leicht, moderat, aktiv, sehr_aktiv
    kcal_ziel INTEGER,                               -- Berechnetes oder manuelles Tagesziel
    ziel VARCHAR(20) DEFAULT 'halten',               -- abnehmen, zunehmen, halten

    -- Premium
    ist_premium BOOLEAN DEFAULT FALSE,
    premium_bis TIMESTAMPTZ,

    -- DSGVO
    datenschutz_akzeptiert BOOLEAN DEFAULT FALSE,
    marketing_einwilligung BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 2. REZEPTE
-- ============================================
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    beschreibung TEXT,

    -- Kategorisierung
    kategorie VARCHAR(50) NOT NULL,       -- fruehstueck, mittag, abendessen, snack, dessert
    unterkategorie VARCHAR(50),           -- z.B. suppe, salat, pasta, auflauf
    tags TEXT[] DEFAULT '{}',             -- Array: schnell, budget, mealprep, tiktok, etc.

    -- Zubereitung
    zubereitungszeit_min INTEGER,         -- in Minuten
    schwierigkeit VARCHAR(20) DEFAULT 'mittel', -- einfach, mittel, schwer
    portionen INTEGER DEFAULT 4,

    -- Nährwerte pro Portion
    kcal INTEGER,
    protein_g DECIMAL(6,1),
    kohlenhydrate_g DECIMAL(6,1),
    fett_g DECIMAL(6,1),
    ballaststoffe_g DECIMAL(6,1),

    -- Bild
    bild_url TEXT,
    bild_quelle VARCHAR(50),              -- dall-e, unsplash, eigen, etc.

    -- Meta
    ernaehrungsformen TEXT[] DEFAULT '{}', -- omnivor, vegetarisch, vegan, etc.
    allergene TEXT[] DEFAULT '{}',         -- gluten, laktose, nuss, etc.
    saison TEXT[] DEFAULT '{}',            -- fruehling, sommer, herbst, winter, ganzjaehrig

    -- Zubereitung (Schritte)
    zubereitung_schritte JSONB,           -- [{schritt: 1, text: "..."}, ...]

    -- Quelle
    quelle VARCHAR(200),                  -- Woher das Rezept stammt
    ist_community BOOLEAN DEFAULT FALSE,
    erstellt_von UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_kategorie ON recipes(kategorie);
CREATE INDEX idx_recipes_ernaehrungsformen ON recipes USING GIN(ernaehrungsformen);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_title_trgm ON recipes USING GIN(title gin_trgm_ops);

-- ============================================
-- 3. REZEPT-ZUTATEN
-- ============================================
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

    zutat_name VARCHAR(200) NOT NULL,          -- Original-Name im Rezept
    zutat_kategorie VARCHAR(100) NOT NULL,     -- Normalisierter Standard-Begriff
    menge DECIMAL(8,2),
    einheit VARCHAR(30),                        -- g, kg, ml, l, stk, el, tl, prise, bund, etc.
    ist_optional BOOLEAN DEFAULT FALSE,
    notiz TEXT,                                 -- z.B. "fein gehackt", "zimmerwarm"

    sortierung INTEGER DEFAULT 0               -- Reihenfolge im Rezept
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_kategorie ON recipe_ingredients(zutat_kategorie);

-- ============================================
-- 4. PRODUKTE (aus Angeboten aufgebaut)
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL,
    marke VARCHAR(100),
    produktkategorie VARCHAR(100) NOT NULL,    -- Normalisierte Kategorie (= matching key)

    -- Identifikation
    barcode VARCHAR(50),
    openfoodfacts_id VARCHAR(100),

    -- Preise
    uvp_preis DECIMAL(8,2),                    -- Unverbindliche Preisempfehlung
    uvp_zuletzt_aktualisiert TIMESTAMPTZ,

    -- Nährwerte (von OpenFoodFacts)
    kcal_pro_100g INTEGER,
    protein_pro_100g DECIMAL(6,1),
    kohlenhydrate_pro_100g DECIMAL(6,1),
    fett_pro_100g DECIMAL(6,1),

    -- Produktinfo
    menge_wert DECIMAL(8,2),                   -- z.B. 500
    menge_einheit VARCHAR(20),                 -- z.B. g, ml, stk
    bild_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_kategorie ON products(produktkategorie);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- ============================================
-- 5. ANGEBOTE
-- ============================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),

    -- Angebotsdetails
    supermarkt VARCHAR(50) NOT NULL,           -- rewe, lidl, aldi_sued, aldi_nord, edeka, penny, netto, kaufland
    preis DECIMAL(8,2) NOT NULL,
    uvp_preis DECIMAL(8,2),                    -- Falls im Prospekt angegeben
    rabatt_prozent DECIMAL(5,2),
    preis_pro_einheit VARCHAR(50),             -- z.B. "1kg = 3,98€"

    -- Gültigkeit
    gueltig_von DATE NOT NULL,
    gueltig_bis DATE NOT NULL,

    -- PLZ-Zuordnung
    plz_gebiet VARCHAR(10),                    -- Die ersten 1-3 Stellen der PLZ
    ist_national BOOLEAN DEFAULT FALSE,        -- Gilt überall (z.B. ALDI)

    -- Original-Daten
    original_produktname VARCHAR(300),          -- Originaltext aus dem Prospekt
    original_beschreibung TEXT,
    prospekt_bild_url TEXT,

    -- Quelle
    datenquelle VARCHAR(50) DEFAULT 'pepesto', -- pepesto, scraper, manuell
    externe_id VARCHAR(200),                   -- ID beim Datenanbieter

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_supermarkt ON offers(supermarkt);
CREATE INDEX idx_offers_plz ON offers(plz_gebiet);
CREATE INDEX idx_offers_gueltigkeit ON offers(gueltig_von, gueltig_bis);
CREATE INDEX idx_offers_product ON offers(product_id);

-- ============================================
-- 6. SYNONYM-DATENBANK
-- ============================================
CREATE TABLE synonyms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standardbegriff VARCHAR(100) NOT NULL,     -- Der normalisierte Hauptbegriff
    synonym VARCHAR(100) NOT NULL,             -- Variante
    region VARCHAR(5) DEFAULT 'de',            -- de, at, ch
    typ VARCHAR(20) DEFAULT 'synonym',         -- synonym, dialekt, marke, abkuerzung

    UNIQUE(standardbegriff, synonym)
);

CREATE INDEX idx_synonyms_standard ON synonyms(standardbegriff);
CREATE INDEX idx_synonyms_synonym ON synonyms(synonym);

-- ============================================
-- 7. MATCHING-REGELN
-- ============================================
CREATE TABLE matching_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zutat_kategorie VARCHAR(100) NOT NULL,
    produktkategorie VARCHAR(100) NOT NULL,
    konfidenz_score DECIMAL(3,2) DEFAULT 1.0,  -- 0.0 bis 1.0
    ist_ausschluss BOOLEAN DEFAULT FALSE,       -- TRUE = darf NICHT matchen
    manuell_geprueft BOOLEAN DEFAULT FALSE,

    UNIQUE(zutat_kategorie, produktkategorie)
);

-- ============================================
-- 8. WOCHENPLAN
-- ============================================
CREATE TABLE weekly_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kalenderwoche INTEGER NOT NULL,             -- z.B. 15 (KW15)
    jahr INTEGER NOT NULL,
    ist_ki_generiert BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, kalenderwoche, jahr)
);

CREATE TABLE weekly_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
    wochentag INTEGER NOT NULL,                 -- 1=Mo, 2=Di, ..., 7=So
    mahlzeit VARCHAR(20) NOT NULL,              -- fruehstueck, mittag, abendessen, snack
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    portionen INTEGER DEFAULT 1,

    UNIQUE(plan_id, wochentag, mahlzeit)
);

-- ============================================
-- 9. EINKAUFSLISTE
-- ============================================
CREATE TABLE shopping_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    zutat_name VARCHAR(200) NOT NULL,
    menge DECIMAL(8,2),
    einheit VARCHAR(30),

    -- Bestes Angebot
    supermarkt VARCHAR(50),
    preis DECIMAL(8,2),
    offer_id UUID REFERENCES offers(id),

    -- Quelle
    recipe_id UUID REFERENCES recipes(id),     -- NULL wenn manuell hinzugefügt
    plan_id UUID REFERENCES weekly_plans(id),   -- NULL wenn einzeln

    abgehakt BOOLEAN DEFAULT FALSE,
    manuell_hinzugefuegt BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_user ON shopping_list(user_id);

-- ============================================
-- 10. WATCHLIST & FAVORITEN
-- ============================================
CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    produktkategorie VARCHAR(100) NOT NULL,
    benachrichtigung_aktiv BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, produktkategorie)
);

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, recipe_id)
);

-- ============================================
-- 11. PLZ-CACHE (Angebote nur 1x pro PLZ laden)
-- ============================================
CREATE TABLE plz_cache (
    plz_gebiet VARCHAR(10) PRIMARY KEY,
    zuletzt_aktualisiert TIMESTAMPTZ NOT NULL,
    supermaerkte_geladen TEXT[] DEFAULT '{}',
    anzahl_angebote INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'aktuell'       -- aktuell, veraltet, fehler
);

-- ============================================
-- 12. ROW LEVEL SECURITY (DSGVO)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Nutzer sehen nur eigene Daten
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY plans_own_data ON weekly_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY plan_items_own_data ON weekly_plan_items FOR ALL
    USING (plan_id IN (SELECT id FROM weekly_plans WHERE user_id = auth.uid()));
CREATE POLICY shopping_own_data ON shopping_list FOR ALL USING (auth.uid() = user_id);
CREATE POLICY watchlist_own_data ON watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY favorites_own_data ON favorites FOR ALL USING (auth.uid() = user_id);

-- Rezepte und Angebote sind für alle lesbar
CREATE POLICY recipes_public_read ON recipes FOR SELECT USING (true);
CREATE POLICY offers_public_read ON offers FOR SELECT USING (true);
CREATE POLICY products_public_read ON products FOR SELECT USING (true);
CREATE POLICY synonyms_public_read ON synonyms FOR SELECT USING (true);

-- ============================================
-- 13. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER weekly_plans_updated_at BEFORE UPDATE ON weekly_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
