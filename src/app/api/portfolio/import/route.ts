import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface ParsedHolding {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  avg_price: number;
}

function parseCSV(csvText: string): ParsedHolding[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  // Flexible header matching for different broker formats
  const symbolIdx = headers.findIndex((h) =>
    ['symbol', 'scrip', 'stock', 'instrument', 'trading symbol', 'tradingsymbol', 'scrip name'].includes(h)
  );
  const nameIdx = headers.findIndex((h) =>
    ['name', 'company', 'company name', 'stock name', 'instrument name'].includes(h)
  );
  const qtyIdx = headers.findIndex((h) =>
    ['quantity', 'qty', 'shares', 'holding qty', 'net qty', 'total quantity', 'total qty'].includes(h)
  );
  const priceIdx = headers.findIndex((h) =>
    ['avg price', 'average price', 'avg_price', 'avg. price', 'buy avg', 'buy average', 'avg cost', 'average cost', 'buy price'].includes(h)
  );
  const exchangeIdx = headers.findIndex((h) =>
    ['exchange', 'exch', 'market'].includes(h)
  );

  if (symbolIdx === -1) {
    throw new Error(
      'Could not find a "Symbol" column. Expected one of: Symbol, Scrip, Stock, Instrument, Trading Symbol'
    );
  }
  if (qtyIdx === -1) {
    throw new Error(
      'Could not find a "Quantity" column. Expected one of: Quantity, Qty, Shares, Holding Qty, Net Qty'
    );
  }
  if (priceIdx === -1) {
    throw new Error(
      'Could not find an "Avg Price" column. Expected one of: Avg Price, Average Price, Buy Avg, Buy Price, Avg Cost'
    );
  }

  const holdings: ParsedHolding[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line respecting quoted fields
    const fields = parseCSVLine(line);

    const rawSymbol = fields[symbolIdx]?.trim().replace(/^"|"$/g, '') || '';
    const rawName = nameIdx !== -1 ? fields[nameIdx]?.trim().replace(/^"|"$/g, '') || '' : '';
    const rawQty = fields[qtyIdx]?.trim().replace(/^"|"$/g, '').replace(/,/g, '') || '0';
    const rawPrice = fields[priceIdx]?.trim().replace(/^"|"$/g, '').replace(/,/g, '') || '0';
    const rawExchange = exchangeIdx !== -1 ? fields[exchangeIdx]?.trim().replace(/^"|"$/g, '').toUpperCase() || '' : '';

    // Clean symbol: remove -EQ, .NS, .BO suffixes
    const symbol = rawSymbol
      .toUpperCase()
      .replace(/-(EQ|BE|BL|BZ|SM|ST|GS)$/, '')
      .replace(/\.(NS|BO)$/, '')
      .trim();

    if (!symbol) continue;

    const quantity = Math.abs(parseFloat(rawQty));
    const avgPrice = parseFloat(rawPrice);

    if (isNaN(quantity) || quantity <= 0 || isNaN(avgPrice) || avgPrice <= 0) continue;

    const exchange: 'NSE' | 'BSE' =
      rawExchange === 'BSE' || rawExchange === 'BO' ? 'BSE' : 'NSE';

    holdings.push({
      symbol,
      name: rawName || symbol,
      exchange,
      quantity,
      avg_price: avgPrice,
    });
  }

  return holdings;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// POST /api/portfolio/import - import holdings from CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const replaceExisting = formData.get('replace') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    const csvText = await file.text();
    let holdings: ParsedHolding[];

    try {
      holdings = parseCSV(csvText);
    } catch (parseError) {
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : 'Failed to parse CSV' },
        { status: 400 }
      );
    }

    if (holdings.length === 0) {
      return NextResponse.json(
        { error: 'No valid holdings found in the CSV file' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Optionally remove old CSV-imported holdings
    if (replaceExisting) {
      await serviceClient
        .from('holdings')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'csv');
    }

    // Insert new holdings
    const holdingsToInsert = holdings.map((h) => ({
      user_id: userId,
      symbol: h.symbol,
      name: h.name,
      exchange: h.exchange,
      quantity: h.quantity,
      avg_price: h.avg_price,
      source: 'csv' as const,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await serviceClient
      .from('holdings')
      .insert(holdingsToInsert);

    if (insertError) {
      console.error('CSV import insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save imported holdings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: holdings.length,
      holdings: holdings.map((h) => ({ symbol: h.symbol, name: h.name, quantity: h.quantity, avg_price: h.avg_price })),
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
