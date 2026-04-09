import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const MARKTGURU_API_KEY = Deno.env.get('MARKTGURU_API_KEY');
const MARKTGURU_CLIENT_KEY = Deno.env.get('MARKTGURU_CLIENT_KEY');

// Food category whitelist - ~50 key food patterns
const FOOD_WHITELIST = new Set([
  'käse',
  'joghurt',
  'milch',
  'fleisch',
  'wurst',
  'fisch',
  'obst',
  'gemüse',
  'brot',
  'getränke',
  'tiefkühl',
  'snack',
  'schokolade',
  'chips',
  'nudel',
  'reis',
  'mehl',
  'zucker',
  'öl',
  'sauce',
  'gewürz',
  'eier',
  'butter',
  'margarine',
  'creme',
  'joghurts',
  'käsesorten',
  'fleischprodukte',
  'wurstware',
  'fischprodukte',
  'obstprodukte',
  'gemüseprodukte',
  'brotprodukte',
  'getränk',
  'tiefkühltruhe',
  'snackprodukte',
  'schokoladenprodukte',
  'chipstüten',
  'nudelprodukte',
  'reisprodukte',
  'mehlprodukte',
  'zuckerprodukte',
  'ölprodukte',
  'saucen',
  'gewürze',
  'eierprodukte',
  'butterprodukte',
  'margarineprodukte',
  'cremeproduke',
  'konserven',
  'konserve',
  'dosenware',
  'dose',
]);

interface RequestBody {
  plz: string;
}

interface MarktguruOffer {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  supermarket?: string;
  validFrom?: string;
  validUntil?: string;
}

interface CacheEntry {
  plz: string;
  last_scraped: string;
}

// Helper: Validate German postal code (5 digits)
function validatePLZ(plz: string): boolean {
  return /^\d{5}$/.test(plz);
}

// Helper: Check if offer is food-related
function isFoodProduct(name: string, description: string): boolean {
  const combined = `${name || ''} ${description || ''}`.toLowerCase();
  for (const keyword of FOOD_WHITELIST) {
    if (combined.includes(keyword)) {
      return true;
    }
  }
  return false;
}

// Helper: Format date to ISO string if needed
function formatDate(dateString?: string): string {
  if (!dateString) return new Date().toISOString();
  try {
    return new Date(dateString).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Helper: Check rate limit (1 scrape per PLZ per 6 hours)
async (
  supabase: ReturnType<typeof createClient>,
  plz: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('plz_cache')
    .select('last_scraped')
    .eq('plz', plz)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  if (!data) return true; // No cache entry, allowed

  const lastScraped = new Date(data.last_scraped);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return lastScraped < sixHoursAgo;
};

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Only POST requests allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!MARKTGURU_API_KEY || !MARKTGURU_CLIENT_KEY) {
      console.error('Missing Marktguru API keys');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Validate PLZ
    const plz = String(body.plz || '').trim();
    if (!validatePLZ(plz)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid PLZ. Must be a 5-digit German postal code.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check rate limit
    const { data: cacheEntry } = await supabase
      .from('plz_cache')
      .select('last_scraped')
      .eq('plz', plz)
      .single();

    if (cacheEntry) {
      const lastScraped = new Date(cacheEntry.last_scraped);
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (lastScraped > sixHoursAgo) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded. Maximum 1 scrape per PLZ per 6 hours.',
            nextAvailable: new Date(
              lastScraped.getTime() + 6 * 60 * 60 * 1000
            ).toISOString(),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Fetch offers from Marktguru API
    const marktguruUrl = new URL('https://api.marktguru.de/api/v1/offers');
    marktguruUrl.searchParams.set('industryIds', '1009,1023');
    marktguruUrl.searchParams.set('plz', plz);
    marktguruUrl.searchParams.set('apiKey', MARKTGURU_API_KEY);
    marktguruUrl.searchParams.set('clientKey', MARKTGURU_CLIENT_KEY);

    const marktguruResponse = await fetch(marktguruUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!marktguruResponse.ok) {
      console.error(
        `Marktguru API error: ${marktguruResponse.status} ${marktguruResponse.statusText}`
      );
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch offers from Marktguru',
        }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const marktguruData = await marktguruResponse.json();
    const offers = Array.isArray(marktguruData.offers)
      ? marktguruData.offers
      : [];

    // Filter for food products
    const foodOffers = offers.filter((offer: MarktguruOffer) =>
      isFoodProduct(offer.name || '', offer.description || '')
    );

    // Transform offers to match schema
    const transformedOffers = foodOffers.map((offer: MarktguruOffer) => ({
      supermarkt: offer.supermarket || 'Unknown',
      preis: offer.price || 0,
      gueltig_von: formatDate(offer.validFrom),
      gueltig_bis: formatDate(offer.validUntil),
      plz_gebiet: plz,
      original_produktname: offer.name || '',
      original_beschreibung: offer.description || '',
      prospekt_bild_url: offer.image || null,
      datenquelle: 'marktguru',
      externe_id: `marktguru_${offer.id || Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    }));

    // Upsert offers into Supabase
    let insertedCount = 0;
    if (transformedOffers.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('offers')
        .upsert(transformedOffers, {
          onConflict: 'externe_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(`Supabase insert error: ${insertError.message}`);
        return new Response(
          JSON.stringify({
            error: 'Failed to save offers to database',
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      insertedCount = insertedData?.length || transformedOffers.length;
    }

    // Update plz_cache
    const { error: cacheError } = await supabase.from('plz_cache').upsert({
      plz,
      last_scraped: new Date().toISOString(),
    });

    if (cacheError) {
      console.error(`Cache update error: ${cacheError.message}`);
      // Don't fail the request, just log the error
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        count: insertedCount,
        plz: plz,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'authorization, x-client-info, apikey, content-type',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
