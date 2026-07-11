import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// In-memory cache store
const cache = {};

// Helper to check cache
const getCache = (key) => {
  const entry = cache[key];
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  return null;
};

// Helper to set cache
const setCache = (key, data, ttlMs) => {
  cache[key] = {
    data,
    expiry: Date.now() + ttlMs,
  };
};

// NSE stock base prices in INR for mock data fallbacks
const BASE_PRICES = {
  RELIANCE: 2450.00,
  TCS: 3850.00,
  INFY: 1550.00,
  HDFCBANK: 1650.00,
  ICICIBANK: 1100.00,
  SBIN: 780.00,
  KOTAKBANK: 1750.00,
  AXISBANK: 1050.00,
  BAJFINANCE: 7100.00,
  HCLTECH: 1450.00,
  WIPRO: 480.00,
  TECHM: 1250.00,
  ONGC: 270.00,
  NTPC: 360.00,
  POWERGRID: 280.00,
  COALINDIA: 440.00,
  TATAMOTORS: 950.00,
  MARUTI: 10200.00,
  "M&M": 2000.00,
  LT: 3500.00,
  ITC: 430.00,
  HINDUNILVR: 2400.00,
  NESTLEIND: 2500.00,
  ASIANPAINT: 2800.00,
  SUNPHARMA: 1500.00,
  CIPLA: 1450.00,
  DRREDDY: 6100.00,
  TATASTEEL: 160.00,
  JSWSTEEL: 850.00,
  BHARTIARTL: 1200.00,
  ADANIENT: 3100.00,
};

// Helper to resolve stable base price for mock fallback
const getBasePrice = (symbol) => {
  const upperSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/i, '');
  if (BASE_PRICES[upperSymbol]) {
    return BASE_PRICES[upperSymbol];
  }
  // Generate stable mock price using symbol characters (scaled for realistic INR ranges)
  let hash = 0;
  for (let i = 0; i < upperSymbol.length; i++) {
    hash = upperSymbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const base = Math.abs(hash % 2000) + 150.00; // default between 150.00 and 2150.00
  return parseFloat(base.toFixed(2));
};

// Format symbol to always resolve to NSE (.NS) by default if not set
const formatSymbol = (symbol) => {
  const clean = symbol.trim().toUpperCase();
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    return clean;
  }
  return `${clean}.NS`;
};

// Generate mock quote in INR
const generateMockQuoteData = (symbol) => {
  const basePrice = getBasePrice(symbol);
  const changePercent = (Math.random() - 0.48) * 0.025; // slight positive drift
  const current = parseFloat((basePrice * (1 + changePercent)).toFixed(2));
  const prevClose = basePrice;
  const change = parseFloat((current - prevClose).toFixed(2));
  const percentChange = parseFloat(((change / prevClose) * 100).toFixed(2));
  
  const high = parseFloat((Math.max(current, prevClose) * (1 + Math.random() * 0.008)).toFixed(2));
  const low = parseFloat((Math.min(current, prevClose) * (1 - Math.random() * 0.008)).toFixed(2));
  const open = parseFloat((prevClose * (0.997 + Math.random() * 0.006)).toFixed(2));
  const volume = Math.floor(500000 + Math.random() * 8000000);

  return {
    symbol: symbol.toUpperCase(),
    price: current,
    change,
    percentChange,
    high,
    low,
    open,
    prevClose,
    volume,
    timestamp: Math.floor(Date.now() / 1000),
  };
};

// Generate mock history in INR
const generateMockHistoryData = (symbol, range) => {
  const basePrice = getBasePrice(symbol);
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  
  let points = 30;
  let intervalSec = 86400;
  let priceFluctuation = 0.02;

  if (range === '1D') {
    points = 78;
    intervalSec = 300;
    priceFluctuation = 0.004;
  } else if (range === '1W') {
    points = 35;
    intervalSec = 17280;
    priceFluctuation = 0.01;
  } else if (range === '1M') {
    points = 30;
    intervalSec = 86400;
    priceFluctuation = 0.018;
  } else if (range === '1Y') {
    points = 250;
    intervalSec = 126000;
    priceFluctuation = 0.03;
  }

  let currentPrice = basePrice * (0.9 + Math.random() * 0.2);
  
  for (let i = points; i >= 0; i--) {
    const time = now - i * intervalSec;
    const changePercent = (Math.random() - 0.49) * 2 * priceFluctuation;
    const prevClose = currentPrice;
    currentPrice = currentPrice * (1 + changePercent);
    
    const open = prevClose;
    const close = currentPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.floor(500000 + Math.random() * 5000000);
    
    const dateObj = new Date(time * 1000);
    const timeLabel = range === '1D'
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    data.push({
      time,
      timeLabel,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
  }

  return data;
};

/**
 * Fetch quote for a symbol (Append .NS default for Indian NSE)
 */
export const getStockQuote = async (symbol) => {
  const formattedSymbol = formatSymbol(symbol);
  const cacheKey = `quote_${formattedSymbol}`;
  
  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    if (process.env.SIMULATE_FAILURE === 'true') {
      throw new Error('Simulated Yahoo Finance quote API failure');
    }
    const quote = await yahooFinance.quote(formattedSymbol);
    if (quote) {
      const data = {
        symbol: symbol.toUpperCase(), // Client receives clean prefix symbol
        price: quote.regularMarketPrice,
        change: parseFloat((quote.regularMarketChange || 0).toFixed(2)),
        percentChange: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
        high: quote.regularMarketDayHigh || quote.regularMarketPrice,
        low: quote.regularMarketDayLow || quote.regularMarketPrice,
        open: quote.regularMarketOpen || quote.regularMarketPrice,
        prevClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
        volume: quote.regularMarketVolume || 0,
        timestamp: Math.floor((quote.regularMarketTime || Date.now()) / 1000),
      };
      
      setCache(cacheKey, data, 30 * 1000); // Cache for 30s
      return data;
    }
  } catch (err) {
    console.warn(`Yahoo Finance quote fetch failed for ${formattedSymbol}: ${err.message}. Using mock.`);
  }

  // Fallback
  const mockQuote = generateMockQuoteData(symbol);
  setCache(cacheKey, mockQuote, 20 * 1000);
  return mockQuote;
};

/**
 * Fetch stock historical chart candles
 */
export const getStockHistory = async (symbol, range) => {
  const formattedSymbol = formatSymbol(symbol);
  const cacheKey = `history_${formattedSymbol}_${range}`;

  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    let period1;
    let interval = '1d';

    if (range === '1D') {
      period1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      interval = '15m';
    } else if (range === '1W') {
      period1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      interval = '1h';
    } else if (range === '1M') {
      period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      interval = '1d';
    } else if (range === '1Y') {
      period1 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 365 days ago
      interval = '1wk';
    }

    const result = await yahooFinance.chart(formattedSymbol, {
      period1,
      interval,
    });

    if (result && result.quotes && result.quotes.length > 0) {
      const formattedHistory = result.quotes
        .filter(q => q.close !== undefined && q.close !== null)
        .map((q) => {
          const timestamp = Math.floor(new Date(q.date).getTime() / 1000);
          const dateObj = new Date(q.date);
          const closeVal = q.close;
          const openVal = q.open ?? closeVal;
          const highVal = q.high ?? closeVal;
          const lowVal = q.low ?? closeVal;
          return {
            time: timestamp,
            timeLabel: range === '1D'
              ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            open: parseFloat(openVal.toFixed(2)),
            high: parseFloat(highVal.toFixed(2)),
            low: parseFloat(lowVal.toFixed(2)),
            close: parseFloat(closeVal.toFixed(2)),
            volume: q.volume || 0,
          };
        });

      setCache(cacheKey, formattedHistory, 5 * 60 * 1000); // Cache for 5 mins
      return formattedHistory;
    }
  } catch (err) {
    console.warn(`Yahoo Finance chart fetch failed for ${formattedSymbol}: ${err.message}. Using mock.`);
  }

  // Fallback
  const mockHistory = generateMockHistoryData(symbol, range);
  setCache(cacheKey, mockHistory, 2 * 60 * 1000);
  return mockHistory;
};

/**
 * Search stocks by symbol or name (Filter to NSE/BSE stocks where possible)
 */
export const searchStocks = async (query) => {
  if (!query || query.trim() === '') return [];

  const cleanQuery = query.trim();
  const cacheKey = `search_${cleanQuery}`;

  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    if (process.env.SIMULATE_FAILURE === 'true') {
      throw new Error('Simulated Yahoo Finance search API failure');
    }
    const response = await yahooFinance.search(cleanQuery);
    const results = response.quotes || [];

    // Filter to Indian NSE/BSE results and ensure they are equities (stocks)
    const formattedResults = results
      .filter((item) => {
        const symbolUpper = (item.symbol || '').toUpperCase();
        const exchangeUpper = (item.exchange || '').toUpperCase();
        return (
          (exchangeUpper === 'NSI' ||
            exchangeUpper === 'NSE' ||
            exchangeUpper === 'BSE' ||
            symbolUpper.endsWith('.NS') ||
            symbolUpper.endsWith('.BO')) &&
          item.quoteType === 'EQUITY'
        );
      })
      .slice(0, 10)
      .map((item) => {
        return {
          symbol: item.symbol.toUpperCase(),
          description: item.shortname || item.longname || item.symbol,
          type: item.quoteType || 'EQUITY',
        };
      });

    setCache(cacheKey, formattedResults, 10 * 60 * 1000);
    return formattedResults;
  } catch (err) {
    console.warn(`Yahoo Finance search failed for ${cleanQuery}: ${err.message}. Using mock.`);
  }

  // Expanded mock search fallback using 31 major Nifty 50 symbols
  const allMocks = [
    { symbol: 'RELIANCE.NS', description: 'Reliance Industries Limited', type: 'EQUITY' },
    { symbol: 'TCS.NS', description: 'Tata Consultancy Services Limited', type: 'EQUITY' },
    { symbol: 'INFY.NS', description: 'Infosys Limited', type: 'EQUITY' },
    { symbol: 'HDFCBANK.NS', description: 'HDFC Bank Limited', type: 'EQUITY' },
    { symbol: 'ICICIBANK.NS', description: 'ICICI Bank Limited', type: 'EQUITY' },
    { symbol: 'SBIN.NS', description: 'State Bank of India', type: 'EQUITY' },
    { symbol: 'KOTAKBANK.NS', description: 'Kotak Mahindra Bank Limited', type: 'EQUITY' },
    { symbol: 'AXISBANK.NS', description: 'Axis Bank Limited', type: 'EQUITY' },
    { symbol: 'BAJFINANCE.NS', description: 'Bajaj Finance Limited', type: 'EQUITY' },
    { symbol: 'HCLTECH.NS', description: 'HCL Technologies Limited', type: 'EQUITY' },
    { symbol: 'WIPRO.NS', description: 'Wipro Limited', type: 'EQUITY' },
    { symbol: 'TECHM.NS', description: 'Tech Mahindra Limited', type: 'EQUITY' },
    { symbol: 'ONGC.NS', description: 'Oil & Natural Gas Corporation Limited', type: 'EQUITY' },
    { symbol: 'NTPC.NS', description: 'NTPC Limited', type: 'EQUITY' },
    { symbol: 'POWERGRID.NS', description: 'Power Grid Corporation of India Limited', type: 'EQUITY' },
    { symbol: 'COALINDIA.NS', description: 'Coal India Limited', type: 'EQUITY' },
    { symbol: 'TATAMOTORS.NS', description: 'Tata Motors Limited', type: 'EQUITY' },
    { symbol: 'MARUTI.NS', description: 'Maruti Suzuki India Limited', type: 'EQUITY' },
    { symbol: 'M&M.NS', description: 'Mahindra & Mahindra Limited', type: 'EQUITY' },
    { symbol: 'LT.NS', description: 'Larsen & Toubro Limited', type: 'EQUITY' },
    { symbol: 'ITC.NS', description: 'ITC Limited', type: 'EQUITY' },
    { symbol: 'HINDUNILVR.NS', description: 'Hindustan Unilever Limited', type: 'EQUITY' },
    { symbol: 'NESTLEIND.NS', description: 'Nestle India Limited', type: 'EQUITY' },
    { symbol: 'ASIANPAINT.NS', description: 'Asian Paints Limited', type: 'EQUITY' },
    { symbol: 'SUNPHARMA.NS', description: 'Sun Pharmaceutical Industries Limited', type: 'EQUITY' },
    { symbol: 'CIPLA.NS', description: 'Cipla Limited', type: 'EQUITY' },
    { symbol: 'DRREDDY.NS', description: 'Dr. Reddys Laboratories Limited', type: 'EQUITY' },
    { symbol: 'TATASTEEL.NS', description: 'Tata Steel Limited', type: 'EQUITY' },
    { symbol: 'JSWSTEEL.NS', description: 'JSW Steel Limited', type: 'EQUITY' },
    { symbol: 'BHARTIARTL.NS', description: 'Bharti Airtel Limited', type: 'EQUITY' },
    { symbol: 'ADANIENT.NS', description: 'Adani Enterprises Limited', type: 'EQUITY' },
  ];

  const cleanUpperQuery = cleanQuery.toUpperCase().replace(/\.(NS|BO)$/i, '');
  const filteredMocks = allMocks.filter(
    item =>
      item.symbol.includes(cleanUpperQuery) ||
      item.description.toUpperCase().includes(cleanUpperQuery)
  );

  setCache(cacheKey, filteredMocks, 10 * 60 * 1000);
  return filteredMocks;
};

/**
 * Fetch bulk quotes in a single request (or fallbacks)
 */
export const getBulkStockQuotes = async (symbols) => {
  if (!symbols || symbols.length === 0) return [];

  const uniqueSymbols = Array.from(new Set(symbols.map(s => formatSymbol(s))));
  
  const results = {};
  const uncachedSymbols = [];

  for (const sym of uniqueSymbols) {
    const cleanSym = sym.replace(/\.(NS|BO)$/i, '');
    const cacheKey = `quote_${sym}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      results[cleanSym] = cachedData;
    } else {
      uncachedSymbols.push(sym);
    }
  }

  if (uncachedSymbols.length > 0) {
    try {
      if (process.env.SIMULATE_FAILURE === 'true') {
        throw new Error('Simulated Yahoo Finance bulk quote API failure');
      }
      const response = await yahooFinance.quote(uncachedSymbols);
      const quotes = Array.isArray(response) ? response : [response];
      
      for (const quote of quotes) {
        if (quote && quote.symbol) {
          const cleanSym = quote.symbol.replace(/\.(NS|BO)$/i, '');
          const data = {
            symbol: cleanSym,
            price: quote.regularMarketPrice,
            change: parseFloat((quote.regularMarketChange || 0).toFixed(2)),
            percentChange: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice,
            open: quote.regularMarketOpen || quote.regularMarketPrice,
            prevClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
            volume: quote.regularMarketVolume || 0,
            timestamp: Math.floor((quote.regularMarketTime || Date.now()) / 1000),
          };
          setCache(`quote_${quote.symbol}`, data, 30 * 1000);
          results[cleanSym] = data;
        }
      }
    } catch (err) {
      console.warn(`Bulk Yahoo Finance quote fetch failed: ${err.message}. Using mock fallbacks.`);
    }
  }

  return symbols.map(sym => {
    const cleanSym = sym.toUpperCase().replace(/\.(NS|BO)$/i, '');
    if (results[cleanSym]) {
      return results[cleanSym];
    }
    const mockQuote = generateMockQuoteData(cleanSym);
    setCache(`quote_${formatSymbol(cleanSym)}`, mockQuote, 20 * 1000);
    return mockQuote;
  });
};

/**
 * Get Indian NSE trending list (31 sector-representative stocks)
 */
export const getTrendingStocks = async () => {
  const trendingSymbols = [
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
    'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'HCLTECH.NS',
    'WIPRO.NS', 'TECHM.NS', 'ONGC.NS', 'NTPC.NS', 'POWERGRID.NS',
    'COALINDIA.NS', 'TATAMOTORS.NS', 'MARUTI.NS', 'M&M.NS', 'LT.NS',
    'ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'ASIANPAINT.NS', 'SUNPHARMA.NS',
    'CIPLA.NS', 'DRREDDY.NS', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'BHARTIARTL.NS',
    'ADANIENT.NS'
  ];
  
  return await getBulkStockQuotes(trendingSymbols);
};

/**
 * Generate mock fundamental stats
 */
const generateMockFundamentals = (symbol) => {
  const basePrice = getBasePrice(symbol);
  
  const marketCap = Math.floor((10000000 + Math.random() * 500000000) * basePrice);
  const trailingPE = parseFloat((15 + Math.random() * 25).toFixed(2));
  const priceToBook = parseFloat((1.5 + Math.random() * 8).toFixed(2));
  const dividendYield = parseFloat((Math.random() * 0.035).toFixed(4));
  const trailingEps = parseFloat((basePrice / trailingPE).toFixed(2));
  const faceValue = 10;
  const fiftyTwoWeekHigh = parseFloat((basePrice * (1.1 + Math.random() * 0.35)).toFixed(2));
  const fiftyTwoWeekLow = parseFloat((basePrice * (0.65 + Math.random() * 0.25)).toFixed(2));
  const beta = parseFloat((0.5 + Math.random() * 1.1).toFixed(2));

  return {
    marketCap,
    trailingPE,
    priceToBook,
    dividendYield,
    trailingEps,
    faceValue,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    beta
  };
};

/**
 * Fetch fundamental metrics for a symbol (modules: summaryDetail, defaultKeyStatistics, price)
 */
export const getStockFundamentals = async (symbol) => {
  const formattedSymbol = formatSymbol(symbol);
  const cacheKey = `fundamentals_${formattedSymbol}`;

  const cachedData = getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const summary = await yahooFinance.quoteSummary(formattedSymbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'price']
    });

    if (summary) {
      const summaryDetail = summary.summaryDetail || {};
      const defaultKeyStatistics = summary.defaultKeyStatistics || {};
      const priceModule = summary.price || {};

      const data = {
        marketCap: summaryDetail.marketCap?.raw || priceModule.marketCap?.raw || summaryDetail.marketCap || priceModule.marketCap || null,
        trailingPE: summaryDetail.trailingPE?.raw || summaryDetail.trailingPE || null,
        priceToBook: defaultKeyStatistics.priceToBook?.raw || defaultKeyStatistics.priceToBook || null,
        dividendYield: summaryDetail.dividendYield?.raw || summaryDetail.dividendYield || null,
        trailingEps: defaultKeyStatistics.trailingEps?.raw || defaultKeyStatistics.trailingEps || null,
        faceValue: defaultKeyStatistics.faceValue?.raw || defaultKeyStatistics.faceValue || null,
        fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh?.raw || summaryDetail.fiftyTwoWeekHigh || null,
        fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow?.raw || summaryDetail.fiftyTwoWeekLow || null,
        beta: summaryDetail.beta?.raw || defaultKeyStatistics.beta?.raw || summaryDetail.beta || defaultKeyStatistics.beta || null
      };

      setCache(cacheKey, data, 60 * 60 * 1000); // Cache for 1 hour
      return data;
    }
  } catch (err) {
    console.warn(`Yahoo Finance quoteSummary fetch failed for ${formattedSymbol}: ${err.message}. Using mock.`);
  }

  // Fallback
  const mockFundamentals = generateMockFundamentals(symbol);
  setCache(cacheKey, mockFundamentals, 10 * 60 * 1000);
  return mockFundamentals;
};
