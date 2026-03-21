import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getNseSession, getOverviewCacheTtlMs } from '@/lib/market/nse-session';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', category: 'index' },
  { symbol: '^BSESN', name: 'SENSEX', category: 'index' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', category: 'index' },
  { symbol: 'NIFTY_FIN_SERVICE.NS', name: 'NIFTY FIN SERVICE', category: 'index' },
  { symbol: '^CNXIT', name: 'NIFTY IT', category: 'index' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA', category: 'index' },
];

// Broad universe of major NSE stocks (~250) — Yahoo provides live sector data
const NSE_UNIVERSE = [
  // ── Banking & Finance ──
  'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS',
  'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'INDUSINDBK.NS', 'BANKBARODA.NS', 'PNB.NS',
  'HDFCLIFE.NS', 'SBILIFE.NS', 'ICICIPRULI.NS', 'SHRIRAMFIN.NS', 'CHOLAFIN.NS',
  'MUTHOOTFIN.NS', 'IDFCFIRSTB.NS', 'FEDERALBNK.NS', 'CANFINHOME.NS', 'MFSL.NS',
  'LICI.NS', 'MANAPPURAM.NS', 'BANDHANBNK.NS', 'AUBANK.NS', 'CANBK.NS',
  'INDIANB.NS', 'IDBI.NS', 'SBICARD.NS', 'LICHSGFIN.NS', 'HUDCO.NS',

  // ── IT & Technology ──
  'TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS',
  'LTIM.NS', 'PERSISTENT.NS', 'COFORGE.NS', 'TATAELXSI.NS', 'MPHASIS.NS',
  'OFSS.NS', 'LTTS.NS', 'NAUKRI.NS', 'ZOMATO.NS', 'PAYTM.NS',
  'POLICYBZR.NS', 'DELHIVERY.NS', 'AFFLE.NS', 'DIXON.NS',
  'HAPPSTMNDS.NS', 'BIRLASOFT.NS', 'MASTEK.NS', 'CYIENT.NS', 'ZENSAR.NS',
  'NEWGEN.NS', 'INTELLECT.NS', 'TANLA.NS', 'LATENTVIEW.NS', 'TATACOMM.NS',

  // ── Energy & Power ──
  'RELIANCE.NS', 'ONGC.NS', 'BPCL.NS', 'IOC.NS', 'GAIL.NS',
  'PETRONET.NS', 'NTPC.NS', 'POWERGRID.NS', 'TATAPOWER.NS', 'ADANIGREEN.NS',
  'JSWENERGY.NS', 'SJVN.NS', 'NHPC.NS', 'IRFC.NS', 'RECLTD.NS',
  'PFC.NS', 'COALINDIA.NS', 'TORNTPOWER.NS', 'CESC.NS', 'IEX.NS',
  'HINDPETRO.NS', 'MGL.NS', 'IGL.NS', 'GUJGASLTD.NS',

  // ── Metals & Mining ──
  'TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'VEDL.NS', 'HINDZINC.NS',
  'NMDC.NS', 'SAIL.NS', 'NATIONALUM.NS', 'MOIL.NS',
  'APLAPOLLO.NS', 'JINDALSAW.NS', 'JINDALSTEL.NS',

  // ── Consumer (Cyclical) ──
  'TITAN.NS', 'TRENT.NS', 'BATAINDIA.NS', 'PAGEIND.NS', 'CROMPTON.NS',
  'WHIRLPOOL.NS', 'VOLTAS.NS', 'HAVELLS.NS', 'AMBER.NS',
  'RAYMOND.NS', 'RELAXO.NS', 'VGUARD.NS', 'BLUESTARCO.NS',
  'SHOPERSTOP.NS', 'DEVYANI.NS',

  // ── FMCG (Consumer Defensive) ──
  'HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TATACONSUM.NS',
  'DABUR.NS', 'GODREJCP.NS', 'COLPAL.NS', 'MARICO.NS', 'DMART.NS',
  'JUBLFOOD.NS', 'VBL.NS', 'UBL.NS', 'EMAMILTD.NS',
  'RADICO.NS', 'BIKAJI.NS',

  // ── Pharma & Healthcare ──
  'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS',
  'BIOCON.NS', 'LUPIN.NS', 'AUROPHARMA.NS', 'TORNTPHARM.NS', 'ALKEM.NS',
  'MAXHEALTH.NS', 'FORTIS.NS', 'LALPATHLAB.NS', 'METROPOLIS.NS', 'IPCALAB.NS',
  'LAURUSLABS.NS', 'GLENMARK.NS', 'NATCOPHARMA.NS', 'SYNGENE.NS',
  'ABBOTINDIA.NS', 'GRANULES.NS', 'AJANTPHARM.NS',

  // ── Infra & Industrial ──
  'LT.NS', 'SIEMENS.NS', 'ABB.NS', 'CUMMINSIND.NS', 'HAL.NS',
  'BEL.NS', 'BHEL.NS', 'CONCOR.NS', 'IRCTC.NS', 'POLYCAB.NS',
  'PIIND.NS', 'TIINDIA.NS', 'THERMAX.NS', 'KEC.NS',
  'RVNL.NS', 'NBCC.NS', 'NCC.NS',
  'JKCEMENT.NS', 'RAMCOCEM.NS', 'DALBHARAT.NS',

  // ── Auto & Auto Ancillary ──
  'MARUTI.NS', 'TATAMOTORS.NS', 'M&M.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS',
  'BAJAJ-AUTO.NS', 'TVSMOTOR.NS', 'ASHOKLEY.NS', 'BHARATFORG.NS', 'MOTHERSON.NS',
  'BOSCHLTD.NS', 'BALKRISIND.NS', 'EXIDEIND.NS', 'MRF.NS',
  'APOLLOTYRE.NS', 'CEATLTD.NS',

  // ── Telecom & Media ──
  'BHARTIARTL.NS', 'IDEA.NS', 'ZEEL.NS', 'INDIAMART.NS', 'JUSTDIAL.NS',
  'NAZARA.NS', 'SAREGAMA.NS', 'PVRINOX.NS',

  // ── Real Estate ──
  'DLF.NS', 'LODHA.NS', 'OBEROIRLTY.NS', 'PRESTIGE.NS', 'BRIGADE.NS',
  'PHOENIXLTD.NS', 'GODREJPROP.NS', 'SOBHA.NS', 'SUNTECK.NS',

  // ── Cement & Building Materials ──
  'ULTRACEMCO.NS', 'GRASIM.NS', 'ACC.NS', 'SHREECEM.NS', 'AMBUJACEM.NS',
  'PIDILITIND.NS', 'BERGEPAINT.NS', 'ASIANPAINT.NS', 'ASTRAL.NS', 'SUPREMEIND.NS',

  // ── Conglomerates & Utilities ──
  'ADANIENT.NS', 'ADANIPORTS.NS',

  // ── Capital Markets & Exchanges ──
  'CAMS.NS', 'CDSL.NS', 'BSE.NS', 'MCX.NS', 'ANGELONE.NS',
  'KFINTECH.NS',

  // ── Aviation & Logistics ──
  'INDIGO.NS', 'SPICEJET.NS', 'BLUEDART.NS', 'TCI.NS', 'ALLCARGO.NS',
];

// International spot symbols
const TROY_OZ_TO_GRAMS = 31.1035;
const INDIA_MARKUP = 1.1845;

interface MarketItem {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  volume?: number;
  currency?: string;
  unit?: string;
}

// Yahoo sector → our display sector mapping
const SECTOR_MAP: Record<string, string> = {
  'Financial Services': 'Banking & Finance',
  'Technology': 'IT & Technology',
  'Energy': 'Energy & Power',
  'Basic Materials': 'Metals & Mining',
  'Consumer Cyclical': 'Consumer',
  'Consumer Defensive': 'FMCG',
  'Healthcare': 'Pharma & Healthcare',
  'Industrials': 'Infra & Industrial',
  'Communication Services': 'Telecom & Media',
  'Real Estate': 'Real Estate',
  'Utilities': 'Utilities',
};

async function fetchUsdInrRate(): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote('USDINR=X');
    return result?.regularMarketPrice ?? 83.5;
  } catch {
    return 83.5;
  }
}

async function fetchQuote(item: { symbol: string; name: string; category: string }): Promise<MarketItem | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(item.symbol);
    if (!result) return null;
    return {
      symbol: item.symbol,
      name: item.name,
      category: item.category,
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      dayHigh: result.regularMarketDayHigh ?? 0,
      dayLow: result.regularMarketDayLow ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      volume: result.regularMarketVolume ?? undefined,
    };
  } catch (error) {
    console.error(`Failed to fetch ${item.symbol}:`, error);
    return null;
  }
}

async function fetchStockQuote(symbol: string): Promise<(MarketItem & { sector?: string }) | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(symbol);
    if (!result || !result.regularMarketPrice) return null;

    // Get Yahoo's sector classification
    const yahooSector = result.sector || result.quoteType === 'EQUITY' ? result.sector : undefined;

    return {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      name: result.shortName || result.longName || symbol,
      category: 'stock',
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      dayHigh: result.regularMarketDayHigh ?? 0,
      dayLow: result.regularMarketDayLow ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      volume: result.regularMarketVolume ?? undefined,
      sector: yahooSector,
    };
  } catch (error) {
    console.error(`Failed to fetch stock ${symbol}:`, error);
    return null;
  }
}

function ozToInrPer10g(usdPerOz: number, usdInr: number): number {
  return Math.round((usdPerOz / TROY_OZ_TO_GRAMS) * 10 * usdInr * INDIA_MARKUP);
}

function ozToInrPerKg(usdPerOz: number, usdInr: number): number {
  return Math.round((usdPerOz / TROY_OZ_TO_GRAMS) * 1000 * usdInr * INDIA_MARKUP);
}

// ── In-memory full payload cache (process-local) — TTL from shared NSE session policy ──
let cachedResponse: object | null = null;
let cachedAt = 0;
let cachedForIstDate = '';

function jsonWithCacheHeaders(body: object, session: ReturnType<typeof getNseSession>) {
  const res = NextResponse.json(body);
  if (!session.isOpen) {
    const ttlMs = getOverviewCacheTtlMs(session);
    const sec = Math.max(60, Math.floor(ttlMs / 1000));
    res.headers.set('Cache-Control', `public, s-maxage=${sec}, stale-while-revalidate=${sec * 2}`);
  }
  return res;
}

// GET /api/market/overview
export async function GET() {
  try {
    const session = getNseSession();
    const ttl = getOverviewCacheTtlMs(session);

    if (cachedForIstDate && cachedForIstDate !== session.istDateKey) {
      cachedResponse = null;
      cachedAt = 0;
      cachedForIstDate = '';
    }

    if (cachedResponse && Date.now() - cachedAt < ttl) {
      return jsonWithCacheHeaders(cachedResponse, session);
    }

    const spotSymbols = [
      { symbol: 'GC=F', name: 'Gold', category: 'gold_silver' },
      { symbol: 'SI=F', name: 'Silver', category: 'gold_silver' },
      { symbol: 'CL=F', name: 'Crude Oil', category: 'gold_silver' },
    ];

    // Fetch stocks in batches of 50 concurrently
    async function fetchStocksBatched() {
      const BATCH_SIZE = 50;
      const results: ((MarketItem & { sector?: string }) | null)[] = [];
      for (let i = 0; i < NSE_UNIVERSE.length; i += BATCH_SIZE) {
        const batch = NSE_UNIVERSE.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(fetchStockQuote));
        results.push(...batchResults);
      }
      return results;
    }

    // Fetch indices, commodities, and USD/INR in parallel with batched stocks
    const [indicesResults, spotResults, stocksResults, usdInrRate] = await Promise.all([
      Promise.all(INDICES.map(fetchQuote)),
      Promise.all(spotSymbols.map(fetchQuote)),
      fetchStocksBatched(),
      fetchUsdInrRate(),
    ]);

    const indices = indicesResults.filter(Boolean) as MarketItem[];
    const rawStocks = stocksResults.filter(Boolean) as (MarketItem & { sector?: string })[];

    // Filter for actively trading stocks only (has price and volume > 0)
    const tradingStocks = rawStocks.filter(s => s.price > 0 && (s.volume ?? 0) > 0);

    // Build dynamic sector groups from Yahoo's sector data
    const sectors: Record<string, MarketItem[]> = {};
    for (const stock of tradingStocks) {
      const yahooSector = stock.sector || 'Other';
      const displaySector = SECTOR_MAP[yahooSector] || yahooSector;
      stock.category = displaySector;

      if (!sectors[displaySector]) {
        sectors[displaySector] = [];
      }
      sectors[displaySector].push(stock);
    }

    // Sort each sector by market activity (absolute change %)
    for (const sectorStocks of Object.values(sectors)) {
      sectorStocks.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    }

    // Sort sectors by number of stocks (largest first)
    const sortedSectors: Record<string, MarketItem[]> = {};
    Object.entries(sectors)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([key, val]) => { sortedSectors[key] = val; });

    // Build gold & silver prices in Indian retail units
    const goldSilver: MarketItem[] = [];
    const spotMap = new Map<string, MarketItem>();
    for (const item of spotResults) {
      if (item) spotMap.set(item.symbol, item);
    }

    const goldSpot = spotMap.get('GC=F');
    const silverSpot = spotMap.get('SI=F');
    const crudeSpot = spotMap.get('CL=F');

    if (goldSpot) {
      goldSilver.push({
        symbol: 'GOLD-10G',
        name: 'Gold 24K',
        category: 'gold_silver',
        price: ozToInrPer10g(goldSpot.price, usdInrRate),
        change: ozToInrPer10g(goldSpot.change, usdInrRate),
        changePercent: goldSpot.changePercent,
        dayHigh: ozToInrPer10g(goldSpot.dayHigh, usdInrRate),
        dayLow: ozToInrPer10g(goldSpot.dayLow, usdInrRate),
        previousClose: ozToInrPer10g(goldSpot.previousClose, usdInrRate),
        currency: 'INR',
        unit: '/10g',
      });
      goldSilver.push({
        symbol: 'GOLD-22K-10G',
        name: 'Gold 22K',
        category: 'gold_silver',
        price: Math.round(ozToInrPer10g(goldSpot.price, usdInrRate) * 0.9167),
        change: Math.round(ozToInrPer10g(goldSpot.change, usdInrRate) * 0.9167),
        changePercent: goldSpot.changePercent,
        dayHigh: Math.round(ozToInrPer10g(goldSpot.dayHigh, usdInrRate) * 0.9167),
        dayLow: Math.round(ozToInrPer10g(goldSpot.dayLow, usdInrRate) * 0.9167),
        previousClose: Math.round(ozToInrPer10g(goldSpot.previousClose, usdInrRate) * 0.9167),
        currency: 'INR',
        unit: '/10g',
      });
    }

    if (silverSpot) {
      goldSilver.push({
        symbol: 'SILVER-KG',
        name: 'Silver',
        category: 'gold_silver',
        price: ozToInrPerKg(silverSpot.price, usdInrRate),
        change: ozToInrPerKg(silverSpot.change, usdInrRate),
        changePercent: silverSpot.changePercent,
        dayHigh: ozToInrPerKg(silverSpot.dayHigh, usdInrRate),
        dayLow: ozToInrPerKg(silverSpot.dayLow, usdInrRate),
        previousClose: ozToInrPerKg(silverSpot.previousClose, usdInrRate),
        currency: 'INR',
        unit: '/kg',
      });
    }

    if (crudeSpot) {
      goldSilver.push({
        symbol: 'CRUDE-BBL',
        name: 'Crude Oil',
        category: 'gold_silver',
        price: Math.round(crudeSpot.price * usdInrRate * 100) / 100,
        change: Math.round(crudeSpot.change * usdInrRate * 100) / 100,
        changePercent: crudeSpot.changePercent,
        dayHigh: Math.round(crudeSpot.dayHigh * usdInrRate * 100) / 100,
        dayLow: Math.round(crudeSpot.dayLow * usdInrRate * 100) / 100,
        previousClose: Math.round(crudeSpot.previousClose * usdInrRate * 100) / 100,
        currency: 'INR',
        unit: '/bbl',
      });
    }

    // Top gainers & losers from actively trading stocks
    const sortedByChange = [...tradingStocks].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sortedByChange.filter(s => s.changePercent > 0).slice(0, 10);
    const topLosers = sortedByChange.filter(s => s.changePercent < 0).reverse().slice(0, 10);

    const responseData = {
      indices,
      goldSilver,
      topGainers,
      topLosers,
      allStocks: tradingStocks,
      sectors: sortedSectors,
      usdInrRate,
      updatedAt: new Date().toISOString(),
    };

    cachedResponse = responseData;
    cachedAt = Date.now();
    cachedForIstDate = session.istDateKey;

    return jsonWithCacheHeaders(responseData, session);
  } catch (error) {
    console.error('Market overview error:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
