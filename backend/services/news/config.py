"""
News collection configuration.
Regional balance and source priorities for news aggregation.
"""
from typing import Dict, List
from dataclasses import dataclass


# Regional balance targets (must sum to 1.0)
REGIONAL_BALANCE: Dict[str, float] = {
    "north_america": 0.32,  # 32%
    "europe": 0.20,         # 20%
    "asia": 0.20,           # 20%
    "japan": 0.20,          # 20% (日本)
    "middle_east": 0.04,    # 4%
    "institutions": 0.04,   # 4%
}

# Source priority for deduplication (higher = more authoritative)
SOURCE_PRIORITY: Dict[str, int] = {
    "Reuters": 10,
    "Bloomberg": 10,
    "Financial Times": 9,
    "Wall Street Journal": 9,
    "Nikkei Asia": 8,
    "CNBC": 7,
    "MarketWatch": 7,
    "South China Morning Post": 7,
    "Al Jazeera": 6,
    "Google News": 5,
    "Finnhub": 6,
    "Alpha Vantage": 6,
}


@dataclass
class NewsSourceConfig:
    """Configuration for a news source."""
    name: str
    source_type: str  # "api" or "rss"
    region: str
    priority: int
    min_articles: int
    api_provider: str = None
    rss_url: str = None
    params: Dict = None


# News sources configuration
NEWS_SOURCES: List[NewsSourceConfig] = [
    # Alpha Vantage News API (covers multiple regions)
    NewsSourceConfig(
        name="Alpha Vantage - Finance",
        source_type="api",
        region="north_america",
        priority=6,
        min_articles=30,
        api_provider="alpha_vantage",
        params={"topics": "finance,economy,earnings"}
    ),

    # Finnhub News API
    NewsSourceConfig(
        name="Finnhub",
        source_type="api",
        region="north_america",
        priority=6,
        min_articles=20,
        api_provider="finnhub",
        params={"category": "general"}
    ),

    # Google News RSS - Business
    NewsSourceConfig(
        name="Google News - Business",
        source_type="rss",
        region="north_america",
        priority=5,
        min_articles=15,
        rss_url="https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&oc=3"
    ),

    # Google News RSS - Technology
    NewsSourceConfig(
        name="Google News - Technology",
        source_type="rss",
        region="north_america",
        priority=5,
        min_articles=10,
        rss_url="https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&oc=3"
    ),

    # Nikkei Asia RSS
    NewsSourceConfig(
        name="Nikkei Asia",
        source_type="rss",
        region="asia",
        priority=8,
        min_articles=15,
        rss_url="https://asia.nikkei.com/rss/feed/nar"
    ),

    # SCMP RSS (may be limited)
    NewsSourceConfig(
        name="South China Morning Post",
        source_type="rss",
        region="asia",
        priority=7,
        min_articles=10,
        rss_url="https://www.scmp.com/rss/91/feed"
    ),

    # Financial Times RSS (limited free access)
    NewsSourceConfig(
        name="Financial Times",
        source_type="rss",
        region="europe",
        priority=9,
        min_articles=10,
        rss_url="https://www.ft.com/?format=rss"
    ),

    # MarketWatch RSS
    NewsSourceConfig(
        name="MarketWatch",
        source_type="rss",
        region="north_america",
        priority=7,
        min_articles=15,
        rss_url="https://feeds.marketwatch.com/marketwatch/topstories/"
    ),

    # === Japan Sources ===
    # 日経新聞 (Japanese)
    NewsSourceConfig(
        name="日経新聞",
        source_type="rss",
        region="japan",
        priority=9,
        min_articles=15,
        rss_url="https://www.nikkei.com/rss/economy.rdf"
    ),

    # Bloomberg Japan
    NewsSourceConfig(
        name="Bloomberg Japan",
        source_type="rss",
        region="japan",
        priority=8,
        min_articles=10,
        rss_url="https://www.bloomberg.co.jp/feeds/sitemap_news.xml"
    ),

    # Reuters Japan
    NewsSourceConfig(
        name="Reuters Japan",
        source_type="rss",
        region="japan",
        priority=8,
        min_articles=10,
        rss_url="https://jp.reuters.com/rssFeed/businessNews"
    ),
]


# News categories for classification
NEWS_CATEGORIES = [
    "monetary_policy",      # Central bank decisions, interest rates
    "fiscal_policy",        # Government spending, tax policy
    "earnings",             # Corporate earnings reports
    "mergers_acquisitions", # M&A news
    "regulation",           # Regulatory changes
    "geopolitics",          # Trade wars, sanctions, conflicts
    "technology",           # AI, semiconductors, EVs
    "commodities",          # Oil, gold, agriculture
    "macro_data",           # GDP, inflation, employment
]


# Minimum articles per region
MIN_ARTICLES_PER_REGION: Dict[str, int] = {
    "north_america": 25,
    "europe": 15,
    "asia": 15,
    "japan": 15,
    "middle_east": 4,
    "institutions": 3,
}


# Total target articles
TARGET_RAW_ARTICLES = 100
TARGET_MERGED_ARTICLES = 60


# Importance boost based on source count
def calculate_importance_boost(source_count: int) -> float:
    """Calculate importance boost based on number of sources reporting same news."""
    if source_count == 1:
        return 1.0
    elif source_count == 2:
        return 1.2
    elif source_count == 3:
        return 1.4
    elif source_count >= 4:
        return 1.6
    return 1.0


# Similarity threshold for deduplication
SIMILARITY_THRESHOLD = 0.85


# Stock relationships mapping for impact analysis
# Maps major stocks to their supply chain, competitors, sector ETFs, and indices
STOCK_RELATIONSHIPS: Dict[str, Dict[str, List[str]]] = {
    # Big Tech - FAANG+
    "AAPL": {
        "supply_chain": ["TSM", "HON", "QCOM", "AVGO", "SWKS", "STM"],
        "competitors": ["MSFT", "GOOGL", "SMSN.F"],
        "sector_etf": ["XLK", "VGT"],
        "index": ["SPY", "QQQ", "DIA"],
    },
    "MSFT": {
        "supply_chain": ["INTC", "AMD", "NVDA"],
        "competitors": ["AAPL", "GOOGL", "AMZN", "CRM", "ORCL"],
        "sector_etf": ["XLK", "VGT"],
        "index": ["SPY", "QQQ", "DIA"],
    },
    "GOOGL": {
        "supply_chain": ["TSM", "NVDA", "AMD"],
        "competitors": ["META", "MSFT", "AMZN", "AAPL"],
        "sector_etf": ["XLK", "VGT", "XLC"],
        "index": ["SPY", "QQQ"],
    },
    "AMZN": {
        "supply_chain": ["UPS", "FDX", "NVDA", "AMD"],
        "competitors": ["WMT", "TGT", "MSFT", "GOOGL"],
        "sector_etf": ["XLY", "XLK"],
        "index": ["SPY", "QQQ"],
    },
    "META": {
        "supply_chain": ["NVDA", "TSM", "AMD"],
        "competitors": ["GOOGL", "SNAP", "PINS", "TWTR"],
        "sector_etf": ["XLC", "VGT"],
        "index": ["SPY", "QQQ"],
    },
    "NFLX": {
        "supply_chain": ["AMZN", "MSFT", "GOOGL"],
        "competitors": ["DIS", "WBD", "PARA", "CMCSA"],
        "sector_etf": ["XLC"],
        "index": ["SPY", "QQQ"],
    },

    # Semiconductors
    "NVDA": {
        "supply_chain": ["TSM", "SK", "MU", "LRCX", "ASML"],
        "competitors": ["AMD", "INTC", "QCOM"],
        "sector_etf": ["SMH", "SOXX", "XLK"],
        "index": ["SPY", "QQQ"],
    },
    "AMD": {
        "supply_chain": ["TSM", "ASML", "LRCX"],
        "competitors": ["NVDA", "INTC", "QCOM"],
        "sector_etf": ["SMH", "SOXX", "XLK"],
        "index": ["SPY", "QQQ"],
    },
    "INTC": {
        "supply_chain": ["ASML", "LRCX", "AMAT", "KLAC"],
        "competitors": ["AMD", "NVDA", "TSM"],
        "sector_etf": ["SMH", "SOXX", "XLK"],
        "index": ["SPY", "DIA"],
    },
    "TSM": {
        "supply_chain": ["ASML", "LRCX", "AMAT", "KLAC"],
        "competitors": ["INTC", "SMSN.F", "GFS"],
        "sector_etf": ["SMH", "SOXX"],
        "index": ["EWT"],
    },
    "QCOM": {
        "supply_chain": ["TSM", "ASML"],
        "competitors": ["NVDA", "AMD", "AVGO", "MRVL"],
        "sector_etf": ["SMH", "SOXX", "XLK"],
        "index": ["SPY", "QQQ"],
    },
    "AVGO": {
        "supply_chain": ["TSM", "ASML"],
        "competitors": ["QCOM", "TXN", "MRVL"],
        "sector_etf": ["SMH", "SOXX", "XLK"],
        "index": ["SPY", "QQQ"],
    },
    "ASML": {
        "supply_chain": ["ZEISS", "TRUMPF"],
        "competitors": ["LRCX", "AMAT", "KLAC"],
        "sector_etf": ["SMH", "SOXX"],
        "index": ["EWN"],
    },

    # EV & Automotive
    "TSLA": {
        "supply_chain": ["PANASONIC", "ALB", "SQM", "LAC", "LTHM"],
        "competitors": ["F", "GM", "RIVN", "NIO", "LCID", "XPEV"],
        "sector_etf": ["XLY", "DRIV"],
        "index": ["SPY", "QQQ"],
    },
    "F": {
        "supply_chain": ["ALB", "SQM", "BWA", "APTV"],
        "competitors": ["GM", "TSLA", "TM", "HMC", "STLA"],
        "sector_etf": ["XLY", "CARZ"],
        "index": ["SPY", "DIA"],
    },
    "GM": {
        "supply_chain": ["ALB", "SQM", "BWA", "APTV"],
        "competitors": ["F", "TSLA", "TM", "HMC", "STLA"],
        "sector_etf": ["XLY", "CARZ"],
        "index": ["SPY"],
    },
    "RIVN": {
        "supply_chain": ["ALB", "SQM", "AMZN"],
        "competitors": ["TSLA", "F", "GM", "LCID"],
        "sector_etf": ["XLY", "DRIV"],
        "index": [],
    },
    "NIO": {
        "supply_chain": ["CATL", "ALB", "SQM"],
        "competitors": ["TSLA", "XPEV", "LI", "BYD"],
        "sector_etf": ["DRIV", "KWEB"],
        "index": ["KWEB"],
    },

    # Finance
    "JPM": {
        "supply_chain": [],
        "competitors": ["BAC", "WFC", "C", "GS", "MS"],
        "sector_etf": ["XLF", "KBE", "KRE"],
        "index": ["SPY", "DIA"],
    },
    "BAC": {
        "supply_chain": [],
        "competitors": ["JPM", "WFC", "C", "USB"],
        "sector_etf": ["XLF", "KBE", "KRE"],
        "index": ["SPY"],
    },
    "GS": {
        "supply_chain": [],
        "competitors": ["MS", "JPM", "C"],
        "sector_etf": ["XLF", "KBE"],
        "index": ["SPY", "DIA"],
    },
    "V": {
        "supply_chain": [],
        "competitors": ["MA", "AXP", "PYPL", "SQ"],
        "sector_etf": ["XLF", "VFH"],
        "index": ["SPY", "DIA"],
    },
    "MA": {
        "supply_chain": [],
        "competitors": ["V", "AXP", "PYPL", "SQ"],
        "sector_etf": ["XLF", "VFH"],
        "index": ["SPY"],
    },

    # Healthcare & Pharma
    "JNJ": {
        "supply_chain": [],
        "competitors": ["PFE", "MRK", "ABBV", "LLY"],
        "sector_etf": ["XLV", "VHT", "IBB"],
        "index": ["SPY", "DIA"],
    },
    "PFE": {
        "supply_chain": ["TMO", "DHR"],
        "competitors": ["JNJ", "MRK", "ABBV", "AZN", "MRNA"],
        "sector_etf": ["XLV", "VHT", "IBB"],
        "index": ["SPY"],
    },
    "UNH": {
        "supply_chain": [],
        "competitors": ["CVS", "CI", "HUM", "ELV"],
        "sector_etf": ["XLV", "VHT"],
        "index": ["SPY", "DIA"],
    },
    "LLY": {
        "supply_chain": ["TMO", "DHR"],
        "competitors": ["NVO", "MRK", "PFE", "ABBV"],
        "sector_etf": ["XLV", "VHT", "IBB"],
        "index": ["SPY"],
    },
    "MRNA": {
        "supply_chain": ["TMO", "DHR", "RGEN"],
        "competitors": ["PFE", "BNTX", "NVAX"],
        "sector_etf": ["XLV", "IBB", "XBI"],
        "index": ["SPY", "QQQ"],
    },

    # Energy
    "XOM": {
        "supply_chain": ["SLB", "HAL", "BKR"],
        "competitors": ["CVX", "COP", "EOG", "OXY"],
        "sector_etf": ["XLE", "VDE", "OIH"],
        "index": ["SPY", "DIA"],
    },
    "CVX": {
        "supply_chain": ["SLB", "HAL", "BKR"],
        "competitors": ["XOM", "COP", "EOG", "OXY"],
        "sector_etf": ["XLE", "VDE", "OIH"],
        "index": ["SPY", "DIA"],
    },
    "COP": {
        "supply_chain": ["SLB", "HAL", "BKR"],
        "competitors": ["XOM", "CVX", "EOG", "OXY"],
        "sector_etf": ["XLE", "VDE"],
        "index": ["SPY"],
    },

    # Retail & Consumer
    "WMT": {
        "supply_chain": ["UPS", "FDX"],
        "competitors": ["TGT", "COST", "AMZN", "KR"],
        "sector_etf": ["XLP", "XRT", "VDC"],
        "index": ["SPY", "DIA"],
    },
    "COST": {
        "supply_chain": ["UPS", "FDX"],
        "competitors": ["WMT", "TGT", "BJ", "AMZN"],
        "sector_etf": ["XLP", "VDC"],
        "index": ["SPY", "QQQ"],
    },
    "HD": {
        "supply_chain": [],
        "competitors": ["LOW", "WMT", "TGT"],
        "sector_etf": ["XHB", "XLY", "ITB"],
        "index": ["SPY", "DIA"],
    },
    "NKE": {
        "supply_chain": ["VFC", "DECK"],
        "competitors": ["ADDYY", "UAA", "LULU", "SKX"],
        "sector_etf": ["XLY", "XRT"],
        "index": ["SPY", "DIA"],
    },
    "SBUX": {
        "supply_chain": [],
        "competitors": ["DNKN", "MCD", "CMG"],
        "sector_etf": ["XLY", "PBJ"],
        "index": ["SPY", "QQQ"],
    },

    # Industrial & Aerospace
    "BA": {
        "supply_chain": ["SPR", "HWM", "TDG", "HEI"],
        "competitors": ["EADSY", "LMT", "RTX", "NOC"],
        "sector_etf": ["XLI", "ITA", "PPA"],
        "index": ["SPY", "DIA"],
    },
    "CAT": {
        "supply_chain": [],
        "competitors": ["DE", "KMTUY", "CNHI"],
        "sector_etf": ["XLI", "VIS"],
        "index": ["SPY", "DIA"],
    },
    "HON": {
        "supply_chain": [],
        "competitors": ["MMM", "EMR", "ROK", "ITW"],
        "sector_etf": ["XLI", "VIS"],
        "index": ["SPY", "DIA"],
    },
    "UPS": {
        "supply_chain": [],
        "competitors": ["FDX", "AMZN", "DHL"],
        "sector_etf": ["XLI", "IYT"],
        "index": ["SPY", "DIA"],
    },

    # Real Estate
    "AMT": {
        "supply_chain": [],
        "competitors": ["CCI", "SBAC", "UNIT"],
        "sector_etf": ["XLRE", "VNQ", "IYR"],
        "index": ["SPY"],
    },
    "PLD": {
        "supply_chain": [],
        "competitors": ["DRE", "STAG", "EGP"],
        "sector_etf": ["XLRE", "VNQ", "IYR"],
        "index": ["SPY"],
    },

    # Software & Cloud
    "CRM": {
        "supply_chain": ["AMZN", "MSFT", "GOOGL"],
        "competitors": ["MSFT", "ORCL", "SAP", "NOW", "WDAY"],
        "sector_etf": ["IGV", "WCLD"],
        "index": ["SPY"],
    },
    "ORCL": {
        "supply_chain": [],
        "competitors": ["MSFT", "CRM", "SAP", "IBM"],
        "sector_etf": ["IGV", "XLK"],
        "index": ["SPY"],
    },
    "NOW": {
        "supply_chain": ["AMZN", "MSFT"],
        "competitors": ["CRM", "WDAY", "SPLK"],
        "sector_etf": ["IGV", "WCLD"],
        "index": ["SPY"],
    },
    "ADBE": {
        "supply_chain": [],
        "competitors": ["CRM", "MSFT", "CANV"],
        "sector_etf": ["IGV", "XLK"],
        "index": ["SPY", "QQQ"],
    },

    # Lithium & Mining (EV supply chain)
    "ALB": {
        "supply_chain": [],
        "competitors": ["SQM", "LTHM", "LAC", "PLL"],
        "sector_etf": ["LIT", "REMX"],
        "index": [],
    },
    "SQM": {
        "supply_chain": [],
        "competitors": ["ALB", "LTHM", "LAC"],
        "sector_etf": ["LIT", "REMX"],
        "index": [],
    },

    # Major ETFs and Indices (for cross-reference)
    "SPY": {
        "supply_chain": [],
        "competitors": ["VOO", "IVV"],
        "sector_etf": [],
        "index": [],
    },
    "QQQ": {
        "supply_chain": [],
        "competitors": ["QQQM", "VGT"],
        "sector_etf": [],
        "index": [],
    },
}


def get_related_symbols(symbol: str) -> Dict[str, List[str]]:
    """Get all related symbols for a given stock."""
    return STOCK_RELATIONSHIPS.get(symbol, {
        "supply_chain": [],
        "competitors": [],
        "sector_etf": [],
        "index": [],
    })


def get_all_related_symbols(symbol: str) -> List[str]:
    """Get a flat list of all related symbols for a given stock."""
    relationships = get_related_symbols(symbol)
    all_related = []
    for category in relationships.values():
        all_related.extend(category)
    return list(set(all_related))  # Remove duplicates


def find_symbols_affected_by_news(symbols_in_news: List[str]) -> Dict[str, Dict[str, str]]:
    """
    Given a list of symbols mentioned in news, find all potentially affected symbols.
    Returns a dict mapping symbol -> {relationship_type, source_symbol}
    """
    affected = {}

    for news_symbol in symbols_in_news:
        if news_symbol in STOCK_RELATIONSHIPS:
            relationships = STOCK_RELATIONSHIPS[news_symbol]
            for rel_type, related_symbols in relationships.items():
                for related in related_symbols:
                    if related not in affected:
                        affected[related] = {
                            "relationship": rel_type,
                            "source_symbol": news_symbol,
                        }

    return affected
