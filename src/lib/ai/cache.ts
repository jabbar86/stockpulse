import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Simple FNV-1a-like hash for cache keys */
function hashPrompt(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export interface CacheEntry {
  result: string;
  model: string;
  created_at: string;
}

/**
 * Lookup cached AI response by prompt hash + symbol.
 * Returns null on miss or expired entry.
 */
export async function getCachedAnalysis(
  symbol: string,
  promptText: string,
  maxAgeHours = 24
): Promise<CacheEntry | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const promptHash = hashPrompt(promptText);

    const { data } = await supabase
      .from('analysis_cache')
      .select('result, model, created_at')
      .eq('symbol', symbol.toUpperCase())
      .eq('prompt_hash', promptHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > maxAgeHours * 60 * 60 * 1000) return null;

    return data as CacheEntry;
  } catch {
    return null;
  }
}

/**
 * Write AI response to cache.
 */
export async function setCachedAnalysis(
  symbol: string,
  promptText: string,
  result: string,
  model: string
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const promptHash = hashPrompt(promptText);

    await supabase.from('analysis_cache').upsert(
      {
        symbol: symbol.toUpperCase(),
        prompt_hash: promptHash,
        result,
        model,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,prompt_hash' }
    );
  } catch {
    // Cache write failures are non-fatal
  }
}
