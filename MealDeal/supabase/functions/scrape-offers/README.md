# Scrape Offers - Supabase Edge Function

This Deno-based Supabase Edge Function scrapes food offers on-demand from Marktguru when a user provides their PLZ (postal code).

## Features

- **On-demand scraping** via POST request with PLZ
- **Rate limiting** (1 scrape per PLZ per 6 hours)
- **Food filtering** using a whitelist of ~50 food categories
- **Automatic upsert** to Supabase `offers` table
- **Cache tracking** via `plz_cache` table
- **CORS support** for Expo mobile app
- **Input validation** and error handling

## Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Set API Keys as Secrets

```bash
supabase secrets set MARKTGURU_API_KEY=your_api_key_here
supabase secrets set MARKTGURU_CLIENT_KEY=your_client_key_here
```

### 3. Deploy the Function

```bash
cd /path/to/MealDeal
supabase functions deploy scrape-offers
```

## Usage

### From Expo/React Native App

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Call the function
const { data, error } = await supabase.functions.invoke('scrape-offers', {
  body: { plz: '56281' },
});

if (error) {
  console.error('Error:', error.message);
} else {
  console.log(`Scraped ${data.count} offers for PLZ ${data.plz}`);
}
```

### From cURL (Testing)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/scrape-offers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"plz": "56281"}'
```

## Response Format

### Success (200)

```json
{
  "success": true,
  "count": 42,
  "plz": "56281",
  "timestamp": "2026-04-07T10:30:00.000Z"
}
```

### Rate Limited (429)

```json
{
  "error": "Rate limit exceeded. Maximum 1 scrape per PLZ per 6 hours.",
  "nextAvailable": "2026-04-07T16:30:00.000Z"
}
```

### Invalid PLZ (400)

```json
{
  "error": "Invalid PLZ. Must be a 5-digit German postal code."
}
```

### Server Error (500)

```json
{
  "error": "An unexpected error occurred",
  "details": "Error message details..."
}
```

## Database Tables Required

### `offers` Table

```sql
CREATE TABLE offers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  supermarkt TEXT NOT NULL,
  preis DECIMAL(10, 2),
  gueltig_von TIMESTAMP WITH TIME ZONE,
  gueltig_bis TIMESTAMP WITH TIME ZONE,
  plz_gebiet TEXT NOT NULL,
  original_produktname TEXT NOT NULL,
  original_beschreibung TEXT,
  prospekt_bild_url TEXT,
  datenquelle TEXT NOT NULL,
  externe_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `plz_cache` Table

```sql
CREATE TABLE plz_cache (
  plz TEXT PRIMARY KEY,
  last_scraped TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

The function requires these environment variables to be set via Supabase:

- `SUPABASE_URL` - Automatically available in Edge Functions environment
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically available in Edge Functions environment
- `MARKTGURU_API_KEY` - Your Marktguru API key (set via `supabase secrets set`)
- `MARKTGURU_CLIENT_KEY` - Your Marktguru client key (set via `supabase secrets set`)

## Food Categories Supported

The whitelist includes ~50 food patterns such as:

käse, joghurt, milch, fleisch, wurst, fisch, obst, gemüse, brot, getränke, tiefkühl, snack, schokolade, chips, nudel, reis, mehl, zucker, öl, sauce, gewürz, eier, butter, margarine, creme, konserven, dosenware, and more.

## Troubleshooting

### "Server configuration error"
- Verify Marktguru API keys are set: `supabase secrets list`
- Verify environment variables are visible to the function

### "Failed to fetch offers from Marktguru"
- Check that Marktguru API keys are correct
- Verify network connectivity to `api.marktguru.de`
- Check Marktguru API status

### "Failed to save offers to database"
- Verify `offers` table exists with correct schema
- Check Supabase connection and permissions

### Rate limit issues
- Each PLZ can only be scraped once every 6 hours
- Cache entries are stored in `plz_cache` table
- To reset for testing: `DELETE FROM plz_cache WHERE plz = '56281';`

## Logs

View function logs in Supabase dashboard:

```
Supabase Dashboard → Edge Functions → scrape-offers → Logs
```

Or via CLI:

```bash
supabase functions fetch-logs scrape-offers
```
