# MealDeal - Security Checklist

## Supabase RLS Policies (im Supabase Dashboard prüfen/einrichten)

### Tabellen mit User-Daten (NUR eigene Daten sichtbar)
Jede dieser Tabellen muss RLS aktiviert haben + Policy `auth.uid() = user_id`:

- [ ] `user_profiles` — FOR ALL USING (auth.uid() = id)
- [ ] `weekly_plans` — FOR ALL USING (auth.uid() = user_id)
- [ ] `shopping_items` — FOR ALL USING (auth.uid() = user_id)
- [ ] `saved_recipes` — FOR ALL USING (auth.uid() = user_id)
- [ ] `purchase_log` — FOR ALL USING (auth.uid() = user_id)
- [ ] `watchlist` — FOR ALL USING (auth.uid() = user_id)
- [ ] `custom_recipes` — FOR ALL USING (auth.uid() = user_id)
- [ ] `feedback` — INSERT mit auth.uid() = user_id, kein SELECT für anon

### Öffentliche Tabellen (nur lesen)
- [ ] `recipes` — SELECT für alle, kein INSERT/UPDATE/DELETE für anon
- [ ] `recipe_ingredients` — SELECT für alle
- [ ] `ingredients` — SELECT für alle
- [ ] `synonyms` — SELECT für alle
- [ ] `plz_regions` — SELECT für alle

### Angebote-Tabelle (Sonderfall)
- [ ] `offers` — SELECT für alle, INSERT/UPDATE nur für authenticated users
  - Empfehlung: Scraping auf Server-Side (Edge Function) verlagern

## .env Sicherheit
- [x] .env in .gitignore
- [x] Keine API-Keys im Code
- [x] Nur VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (öffentliche Keys)

## Client-Side Rate Limits
- [x] Login: Max 5 Versuche / 5 Min
- [x] Signup: Max 3 / 10 Min
- [x] Password Reset: Max 3 / 15 Min
- [x] Feedback: Max 3 / 10 Min
- [x] Scrape: Max 2 / Stunde + 6h Cooldown pro PLZ
- [x] Recipe Upload: Max 5 / 10 Min

## Supabase Auth Einstellungen (im Dashboard)
- [ ] Email Confirmation aktiviert
- [ ] Rate Limiting für Auth-Endpoints aktiviert (Standard)
- [ ] Passwort-Mindestlänge: 8 Zeichen

## DSGVO
- [x] Datenschutzerklärung vorhanden (/datenschutz)
- [x] Einwilligung vor Onboarding (Checkbox)
- [x] Account-Löschung möglich (Profil → Konto löschen)
- [ ] Kontaktdaten in Datenschutzerklärung eintragen ([NAME], [ADRESSE], [EMAIL])
- [ ] Impressum-Seite mit vollständigen Angaben

## Nächste Schritte (Empfehlung)
1. Scraping auf Supabase Edge Function verlagern (kein Client-Side-Write auf offers)
2. Service Role Key NUR server-side verwenden
3. Supabase Dashboard: Auth → Rate Limits prüfen
4. Supabase Dashboard: Alle RLS Policies gemäß Liste oben prüfen
