# ニュース分析機能 詳細仕様書

## 1. 概要

### 1.1 目的
「今日見るべきニュースは何か？」を投資家に提案するキュレーション機能。
株価変動を追うのではなく、世界の主要ニュースから投資判断に重要なものを選定・分析する。

### 1.2 基本思想
```
従来型: 株価が動いた → なぜか探す（受動的）
本機能: 主要ニュースを分析 → 見るべきものを提案（能動的）
```

### 1.3 処理タイミング
- **実行頻度**: 1日1回
- **実行時刻**: 日本時間 6:00（米国市場クローズ後、アジア市場オープン前）
- **処理時間目安**: 5-10分

---

## 2. システムアーキテクチャ

### 2.1 全体フロー
```
┌─────────────────────────────────────────────────────────────────┐
│                    日次バッチ処理（毎朝6:00）                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Step 1      │    │ Step 2      │    │ Step 3      │         │
│  │ ニュース収集 │ → │ 重複排除    │ → │ 株価データ  │         │
│  │ (100件)     │    │ (60-70件)   │    │ 取得        │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         ↓                                     ↓                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Step 4: LLM多段階分析                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  │Stage 1   │→ │Stage 2   │→ │Stage 3   │→ │Stage 4   │ │   │
│  │  │スクリーニング│  │深掘り分析 │  │相関検証   │  │最終判定  │ │   │
│  │  │60→30件   │  │予測生成   │  │実データ確認│  │ランキング│ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                       │
│  ┌─────────────┐                                               │
│  │ Step 5      │                                               │
│  │ DB保存      │ → フロントエンド表示                          │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Step 1: ニュース収集

### 3.1 地域分散ソース設計

#### 地域別ソース一覧
| 地域 | ソース名 | 取得方法 | 優先度 | 最低取得件数 |
|------|---------|---------|--------|------------|
| **北米** | Reuters US | API/RSS | 高 | 25件 |
| | Bloomberg | API | 高 | 15件 |
| | CNBC | RSS | 中 | 10件 |
| **欧州** | Financial Times | RSS | 高 | 15件 |
| | Reuters UK | API/RSS | 中 | 10件 |
| **アジア** | Nikkei Asia | RSS | 高 | 15件 |
| | South China Morning Post | RSS | 中 | 10件 |
| | Caixin Global | RSS | 中 | 5件 |
| **中東** | Al Jazeera Business | RSS | 中 | 5件 |
| **国際機関** | IMF News | RSS | 中 | 3件 |
| | Fed Announcements | API | 高 | 2件 |

#### 地域バランス目標
```python
REGIONAL_BALANCE = {
    "north_america": 0.32,  # 32%
    "europe": 0.20,         # 20%
    "asia": 0.20,           # 20%
    "japan": 0.20,          # 20%（日本専用）
    "middle_east": 0.04,    # 4%
    "institutions": 0.04,   # 4%
}
```

#### 日本向けニュースソース
| ソース名 | 取得方法 | 優先度 |
|---------|---------|--------|
| 日経新聞 | RSS | 高 |
| Bloomberg Japan | RSS | 高 |
| Reuters Japan | RSS | 中 |

### 3.2 収集対象カテゴリ
- 金融・経済政策（金利、インフレ、GDP）
- 企業ニュース（決算、M&A、人事）
- 規制・法律（独禁法、環境規制、税制）
- 地政学（貿易摩擦、制裁、紛争）
- テクノロジー（AI、半導体、EV）
- コモディティ（原油、金、農産物）

### 3.3 収集データ構造
```typescript
interface RawNews {
  id: string;                    // UUID
  title: string;                 // 記事タイトル
  url: string;                   // 元記事URL
  source: string;                // ソース名（Reuters, Bloomberg等）
  region: string;                // 地域（north_america, asia等）
  category: string | null;       // カテゴリ（推定）
  published_at: string;          // 公開日時（ISO8601）
  summary: string | null;        // 要約（取得できれば）
  fetched_at: string;            // 取得日時
}
```

### 3.4 取得API/RSS
```python
NEWS_SOURCES_CONFIG = {
    "reuters": {
        "type": "api",
        "provider": "alpha_vantage",  # Alpha Vantage News API
        "params": {"topics": "finance,economy"},
    },
    "finnhub": {
        "type": "api",
        "provider": "finnhub",
        "params": {"category": "general"},
    },
    "google_news": {
        "type": "rss",
        "feeds": [
            "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtcGhHZ0pLVUNnQVAB",  # Business
            "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtcGhHZ0pLVUNnQVAB",  # Technology
        ],
    },
    "nikkei_asia": {
        "type": "rss",
        "feeds": ["https://asia.nikkei.com/rss/feed/nar"],
    },
}
```

---

## 4. Step 2: 重複排除（マージ）

### 4.1 目的
同じニュースが複数ソースで報道されている場合に統合し、分析の重複を防ぐ。
複数ソースで報道 = 重要度が高いというシグナルとして活用。

### 4.2 アルゴリズム
```
1. 全ニュースのタイトルをベクトル化（Sentence Transformer）
2. コサイン類似度 > 0.85 のペアをクラスタリング
3. 各クラスタから代表記事を選択（ソース優先度順）
4. 関連ソース情報を付与
```

### 4.3 ソース優先度
```python
SOURCE_PRIORITY = {
    "Reuters": 10,
    "Bloomberg": 10,
    "Financial Times": 9,
    "Wall Street Journal": 9,
    "Nikkei Asia": 8,
    "CNBC": 7,
    "MarketWatch": 7,
    "South China Morning Post": 7,
    "Al Jazeera": 6,
    "Google News": 5,  # アグリゲーター
}
```

### 4.4 マージ後データ構造
```typescript
interface MergedNews extends RawNews {
  related_sources: string[];     // 同内容を報道した他ソース
  source_count: number;          // 報道ソース数
  importance_boost: number;      // 複数ソース報道による重要度ブースト
}
```

### 4.5 重要度ブースト計算
```python
def calculate_importance_boost(source_count: int) -> float:
    """複数ソースで報道されているほど重要度UP"""
    if source_count == 1:
        return 1.0
    elif source_count == 2:
        return 1.2
    elif source_count == 3:
        return 1.4
    elif source_count >= 4:
        return 1.6
    return 1.0
```

---

## 5. Step 3: 株価データ取得

### 5.1 取得対象
- 登録銘柄全て
- 主要インデックス（S&P500, NASDAQ, 日経225, DAX等）
- セクターETF（XLK, XLF, XLE等）

### 5.2 取得データ
```typescript
interface StockSnapshot {
  symbol: string;
  name: string;
  current_price: number;
  day_change: number;        // 日次変動率（%）
  week_change: number;       // 週次変動率（%）
  month_change: number;      // 月次変動率（%）
  volume_change: number;     // 出来高変化率（%）
  sector: string;
  fetched_at: string;
}
```

### 5.3 関連銘柄マッピング（事前定義）
```python
STOCK_RELATIONSHIPS = {
    "AAPL": {
        "supply_chain": ["TSM", "HON", "QCOM", "AVGO"],
        "competitors": ["MSFT", "GOOGL", "SMSN.F"],
        "sector_etf": "XLK",
        "index": ["SPY", "QQQ"],
    },
    "TSLA": {
        "supply_chain": ["PANASONIC", "ALB", "SQM"],
        "competitors": ["F", "GM", "RIVN", "NIO"],
        "sector_etf": "XLY",
        "index": ["SPY", "QQQ"],
    },
    # ... 主要100銘柄分を定義
}
```

---

## 6. Step 4: LLM多段階分析

### 6.1 Stage 1: 初期スクリーニング

#### 目的
60-70件 → 30件に絞り込み。明らかに関係ないニュースを除外。

#### 入力
- マージ済みニュース一覧（タイトル + ソース + 公開時刻）
- 登録銘柄リスト

#### 出力
- 関連性ありと判定されたニュースIDリスト（30件以内）

#### プロンプト
```
あなたは金融アナリストです。
以下のニュース一覧から、投資判断に影響する可能性があるものを選んでください。

【監視銘柄】
AAPL (Apple), TSLA (Tesla), NVDA (NVIDIA), ...

【ニュース一覧】
1. [Reuters] Fed議長、利下げに慎重姿勢を示す (2025-01-09 05:30)
2. [Bloomberg] Apple、中国でのiPhone販売が15%減少 (2025-01-09 04:15)
...

【選定基準】
- 監視銘柄に直接影響するニュース
- 業界全体・セクターに影響するニュース
- マクロ経済（金利、為替、GDP）に関するニュース
- 地政学リスク（貿易、規制、紛争）に関するニュース

関連性ありと判定したニュースのID（数字）をJSON配列で返してください。
30件以内に絞ってください。理由は不要です。

出力例: [1, 2, 5, 8, 12, ...]
```

#### コスト見積もり
- 入力: ~5,000トークン
- 出力: ~100トークン
- コスト: ~$0.02

---

### 6.2 Stage 2: 深掘り分析 + 予測生成

#### 目的
各ニュースの詳細分析、影響銘柄の特定、検証可能な予測の生成。

#### 入力
- Stage 1で選定されたニュース30件（タイトル + 要約）
- 登録銘柄と直近の株価動向
- 銘柄間の関係性マッピング

#### 出力
```typescript
interface Stage2Output {
  news_id: string;
  title: string;
  analysis: {
    summary: string;              // 1-2文の要約
    market_impact: "high" | "medium" | "low";
    affected_symbols: {
      symbol: string;
      direction: "up" | "down" | "neutral";
      confidence: number;         // 0-100
      reason: string;
    }[];
    indirect_impacts: {
      symbol: string;             // 登録外銘柄も含む
      direction: "up" | "down" | "neutral";
      relationship: string;       // "サプライチェーン", "競合", "セクター"
    }[];
    verification_predictions: {
      hypothesis: string;         // "このニュースが重要なら..."
      prediction: string;         // "TSMも下落するはず"
      target_symbol: string;
      expected_direction: "up" | "down";
    }[];
  };
}
```

#### プロンプト
```
あなたは経験豊富な金融アナリストです。
各ニュースを詳細に分析し、投資判断に必要な情報を抽出してください。

【登録銘柄と直近の動き】
| 銘柄 | 日次 | 週次 | 月次 |
|------|------|------|------|
| AAPL | +1.2% | -3.5% | +8.2% |
| TSLA | -2.8% | -5.1% | -12.3% |
...

【銘柄間の関係】
- AAPL ← サプライチェーン: TSM, QCOM, HON
- AAPL ← 競合: MSFT, GOOGL
- TSLA ← サプライチェーン: ALB, SQM
...

【分析対象ニュース】
1. [Reuters] Apple、中国でのiPhone販売が15%減少
   要約: Appleの中国市場でのiPhone出荷台数が前年比15%減少...

2. [Bloomberg] NVIDIA、新AIチップの量産開始を発表
   要約: NVIDIAは次世代AIチップBlackwell B200の量産を...
...

【各ニュースについて以下を分析】
1. 要約（1-2文）
2. 市場インパクト（high/medium/low）
3. 直接影響する銘柄と予測される動き
4. 間接影響する銘柄（登録外も含む）
5. 検証可能な予測
   - 「このニュースが本当に重要なら、○○も△△するはず」
   - 具体的な銘柄と方向を指定

JSON形式で出力してください。
```

#### コスト見積もり
- 入力: ~10,000トークン
- 出力: ~3,000トークン
- コスト: ~$0.06

---

### 6.3 Stage 3: 相関検証（実データ確認）

#### 目的
Stage 2で生成した予測を実際の株価データで検証。
LLMは使用せず、プログラムで自動検証。

#### 処理フロー
```python
async def verify_predictions(stage2_results: list) -> list:
    for news in stage2_results:
        for pred in news["analysis"]["verification_predictions"]:
            target = pred["target_symbol"]
            expected = pred["expected_direction"]

            # 登録外銘柄でも株価を取得
            actual_change = await fetch_stock_change(target)

            # 検証
            pred["actual_change"] = actual_change
            pred["verified"] = check_direction_match(expected, actual_change)
            pred["verification_detail"] = generate_detail(expected, actual_change)

    return stage2_results

def check_direction_match(expected: str, actual: float) -> bool:
    THRESHOLD = 0.3  # 0.3%以上の変動で判定
    if expected == "down" and actual < -THRESHOLD:
        return True
    if expected == "up" and actual > THRESHOLD:
        return True
    return False
```

#### 出力（追加フィールド）
```typescript
interface VerificationResult {
  actual_change: number;          // 実際の変動率
  verified: boolean;              // 予測と一致したか
  verification_detail: string;    // "予測: 下落 → 実際: -1.5% ✓"
}
```

#### コスト
- LLM不使用
- 株価API呼び出しのみ: $0

---

### 6.4 Stage 4: 最終判定

#### 目的
Stage 2-3の結果を統合し、最終的な重要度ランキングを生成。
検証結果を踏まえて信頼度を調整。

#### 入力
- Stage 2の分析結果
- Stage 3の検証結果

#### 判定ロジック
```python
def calculate_final_score(news_analysis: dict) -> dict:
    base_score = news_analysis["market_impact_score"]  # 0-100

    # 複数ソース報道ブースト
    source_boost = news_analysis["importance_boost"]

    # 検証結果による調整
    predictions = news_analysis["verification_predictions"]
    verified_count = sum(1 for p in predictions if p["verified"])
    total_predictions = len(predictions)

    if total_predictions > 0:
        verification_rate = verified_count / total_predictions
        if verification_rate >= 0.7:
            confidence = "high"
            score_multiplier = 1.2
        elif verification_rate >= 0.4:
            confidence = "medium"
            score_multiplier = 1.0
        else:
            confidence = "low"
            score_multiplier = 0.7
    else:
        confidence = "unknown"
        score_multiplier = 0.9

    final_score = base_score * source_boost * score_multiplier

    return {
        "final_score": min(100, final_score),
        "confidence": confidence,
        "verification_summary": f"{verified_count}/{total_predictions}件の予測が一致",
    }
```

#### プロンプト
```
分析結果と検証結果を踏まえ、最終的な「今日見るべきニュース」ランキングを作成してください。

【分析・検証結果】
{stage2_and_stage3_results_json}

【判定基準】
- 検証予測が当たっている（verified=true）→ 信頼度UP
- 検証予測が外れている（verified=false）→ 信頼度DOWN
- 複数の検証が一致している → 高信頼度
- 市場インパクトが高い → 上位に

【出力形式】
各ニュースについて最終コメントを作成し、重要度順にランキングしてください。

{
  "curated_news": [
    {
      "rank": 1,
      "news_id": "xxx",
      "title": "...",
      "final_score": 95,
      "confidence": "high",
      "affected_symbols": ["AAPL", "TSM"],
      "verification_summary": "3つの予測中2つが一致",
      "final_comment": "中国市場でのiPhone販売減少は...",
      "action_suggestion": "AAPL保有者は注視が必要"
    },
    ...
  ]
}
```

#### コスト見積もり
- 入力: ~6,000トークン
- 出力: ~2,000トークン
- コスト: ~$0.04

---

## 7. データベース設計

### 7.1 テーブル一覧

#### raw_news（元ニュース）
```sql
CREATE TABLE raw_news (
    id TEXT PRIMARY KEY,              -- UUID
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    region TEXT NOT NULL,
    category TEXT,
    published_at DATETIME NOT NULL,
    summary TEXT,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_published_at (published_at),
    INDEX idx_source (source)
);
```

#### merged_news（マージ済みニュース）
```sql
CREATE TABLE merged_news (
    id TEXT PRIMARY KEY,
    raw_news_id TEXT REFERENCES raw_news(id),
    related_sources TEXT,             -- JSON array
    source_count INTEGER DEFAULT 1,
    importance_boost REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### daily_digest（日次ダイジェスト）
```sql
CREATE TABLE daily_digest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    digest_date DATE NOT NULL UNIQUE,
    total_news_collected INTEGER,
    total_news_after_merge INTEGER,
    total_news_analyzed INTEGER,
    llm_model TEXT,
    processing_time_seconds REAL,
    total_cost_usd REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### curated_news（キュレート済みニュース）
```sql
CREATE TABLE curated_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    digest_id INTEGER REFERENCES daily_digest(id),
    merged_news_id TEXT REFERENCES merged_news(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    region TEXT NOT NULL,
    category TEXT,
    published_at DATETIME,            -- 元記事の公開日時
    source_count INTEGER DEFAULT 1,   -- 報道ソース数
    related_sources TEXT,             -- JSON array: 関連ソース一覧
    importance_score REAL NOT NULL,   -- 1-10の重要度スコア
    relevance_reason TEXT,            -- なぜ市場に影響を与えるか
    ai_summary TEXT,                  -- AI生成の記事要約
    affected_symbols TEXT,            -- JSON array: 影響銘柄一覧
    symbol_impacts TEXT,              -- JSON object: 銘柄ごとの影響分析 {"AAPL": {"direction": "positive", "analysis": "..."}}
    predicted_impact TEXT,            -- 予測されるインパクト
    impact_direction TEXT,            -- positive, negative, mixed, uncertain
    supply_chain_impact TEXT,         -- サプライチェーン影響分析
    competitor_impact TEXT,           -- 競合影響分析
    verification_passed BOOLEAN,      -- 検証パスしたか
    verification_details TEXT,        -- JSON: 検証詳細
    analysis_stage_1 TEXT,            -- JSON: Stage 1分析結果
    analysis_stage_2 TEXT,            -- JSON: Stage 2分析結果
    analysis_stage_3 TEXT,            -- JSON: Stage 3分析結果
    analysis_stage_4 TEXT,            -- JSON: Stage 4分析結果
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_digest_score (digest_id, importance_score DESC)
);
```

#### verification_log（検証ログ）
```sql
CREATE TABLE verification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    curated_news_id INTEGER REFERENCES curated_news(id),
    target_symbol TEXT NOT NULL,
    expected_direction TEXT,
    actual_change REAL,
    verified BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. API設計

### 8.1 エンドポイント一覧

#### GET /api/news/today
今日のキュレート済みニュースを取得

**レスポンス**
```json
{
  "digest_date": "2025-01-09",
  "generated_at": "2025-01-09T06:15:00Z",
  "news": [
    {
      "rank": 1,
      "title": "Apple、中国でのiPhone販売が15%減少",
      "url": "https://...",
      "source": "Reuters",
      "related_sources": ["Bloomberg", "CNBC"],
      "published_at": "2025-01-09T04:15:00Z",
      "final_score": 95,
      "confidence": "high",
      "affected_symbols": ["AAPL", "TSM", "QCOM"],
      "market_impact": "high",
      "final_comment": "中国市場でのiPhone販売減少は...",
      "action_suggestion": "AAPL保有者は注視が必要",
      "verification_summary": "3/4件の予測が一致"
    },
    ...
  ],
  "meta": {
    "total_news_analyzed": 30,
    "processing_time_seconds": 45.2,
    "llm_model": "claude-sonnet-4-20250514"
  }
}
```

#### GET /api/news/history
過去のダイジェスト一覧

**クエリパラメータ**
- `days`: 取得日数（デフォルト: 7）

#### POST /api/news/refresh
手動でニュース分析を実行（管理者用）

#### GET /api/news/{id}
特定ニュースの詳細（分析根拠、検証ログ含む）

---

## 9. フロントエンド表示

### 9.1 ダッシュボードNEWSセクション

```
┌─────────────────────────────────────────────────────────────┐
│ NEWS                                    更新: 01/09 06:15  │
│ 重要度の高いニュースから順に表示                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🔴 95点 | 信頼度: 高                                    ││
│ │ Apple、中国でのiPhone販売が15%減少                      ││
│ │ Reuters + 3社                          01/09 04:15      ││
│ │                                                         ││
│ │ 影響: AAPL TSMC QCOM                                   ││
│ │ 中国市場での販売減少はサプライチェーン全体に波及...     ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 🟡 78点 | 信頼度: 中                                    ││
│ │ Fed議長、利下げに慎重姿勢を示す                         ││
│ │ Bloomberg + 2社                        01/09 05:30      ││
│ │                                                         ││
│ │ 影響: SPY QQQ XLF                                      ││
│ │ 金利据え置き期間の長期化は...                          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│                      さらに表示 →                           │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 詳細モーダル

```
┌─────────────────────────────────────────────────────────────┐
│ × Apple、中国でのiPhone販売が15%減少                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📰 ソース: Reuters, Bloomberg, CNBC, WSJ                   │
│ 📅 公開: 2025年1月9日 04:15                                │
│ 🔗 元記事を読む →                                          │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 📊 分析                                                    │
│ 中国市場でのiPhone出荷台数が前年比15%減少。                │
│ Huaweiとの競争激化と景気減速が主因。                       │
│                                                             │
│ 💹 影響銘柄                                                │
│ ┌─────────┬────────┬─────────────────────────────────────┐│
│ │ AAPL    │ 📉 下落 │ 中国売上は全体の20%を占める         ││
│ │ TSM     │ 📉 下落 │ iPhone向けチップの主要サプライヤー  ││
│ │ QCOM    │ 📉 下落 │ モデム供給への影響                  ││
│ └─────────┴────────┴─────────────────────────────────────┘│
│                                                             │
│ ✅ 検証結果                                                │
│ 「AAPLが下落するならTSMも下落」→ TSM -1.5% ✓              │
│ 「iPhone需要減ならQCOMも下落」→ QCOM -0.8% ✓              │
│ 「中国需要減なら競合Huaweiは上昇」→ 未検証                 │
│                                                             │
│ 🎯 アクション提案                                          │
│ AAPL保有者は今後の中国関連発表に注視が必要。               │
│ TSM, QCOMも連動して下落する可能性あり。                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. コスト試算

### 10.1 日次コスト内訳
| 項目 | コスト |
|------|--------|
| ニュースAPI（Alpha Vantage等） | $0 |
| 株価API（Yahoo Finance等） | $0 |
| Stage 1 LLM | $0.02 |
| Stage 2 LLM | $0.06 |
| Stage 3（API呼び出しのみ） | $0 |
| Stage 4 LLM | $0.04 |
| **日次合計** | **$0.12** |

### 10.2 月次コスト
| 項目 | コスト |
|------|--------|
| 日次処理 × 30日 | $3.60 |
| 埋め込みモデル（ローカル実行） | $0 |
| **月次合計** | **~$4/月** |

---

## 11. 実装フェーズ

### Phase 1: 基盤構築（1週目）
- [ ] DBスキーマ作成
- [ ] ニュース収集バッチ実装（Alpha Vantage + Finnhub）
- [ ] raw_newsテーブルへの保存

### Phase 2: 前処理（2週目）
- [ ] 重複排除ロジック実装
- [ ] 株価データ取得実装
- [ ] 関連銘柄マッピング定義

### Phase 3: LLM分析（3週目）
- [ ] Stage 1-4 実装
- [ ] プロンプトチューニング
- [ ] curated_newsテーブルへの保存

### Phase 4: フロントエンド（4週目）
- [ ] NEWSセクションUI実装
- [ ] 詳細モーダル実装
- [ ] APIエンドポイント実装

### Phase 5: 運用・改善（継続）
- [ ] バッチスケジューラ設定
- [ ] モニタリング・アラート
- [ ] 精度改善のためのフィードバックループ

---

## 12. 今後の拡張案

### 12.1 短期
- ユーザーごとのカスタマイズ（関心セクター設定）
- Push通知（重要度90以上のニュース）
- 週次サマリーレポート

### 12.2 中期
- 過去の予測精度トラッキング
- 機械学習による重要度予測の補助
- 他言語ニュースソースの追加

### 12.3 長期
- リアルタイム速報対応（1日1回 → 随時）
- 独自の因果関係DB構築（学習データ蓄積）
- ユーザー間での分析共有機能
