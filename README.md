# Pure Price Press (ピュアプライス・プレス)

**"バイアスのかかっていない真実のニュースをお金の動きから分析する"**

世の中のニュースにはバイアスが含まれますが、チャート（価格）は事実です。
本サービスは、株価の急変動を事実として検知し、そこから逆算して「今、市場で何が起きているか」の真実を報道するシステムです。

## 技術スタック

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy (SQLite)
- yfinance
- APScheduler
- OpenAI API / Gemini API

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Lightweight Charts

### Infrastructure
- Docker & Docker Compose
- Discord Webhook

## プロジェクト構成

```
Pure Price Press/
├── docker-compose.yml
├── backend/           # FastAPI バックエンド
├── frontend/          # Next.js フロントエンド
└── data/             # SQLite データベース
```

## セットアップ

### 前提条件
- Docker & Docker Compose がインストールされていること
- OpenAI API キー または Gemini API キー
- Discord Webhook URL（オプション）

### 環境変数の設定

1. バックエンドの環境変数を設定:
```bash
cp backend/.env.example backend/.env
# backend/.env を編集して、必要な値を設定
```

2. フロントエンドの環境変数を設定:
```bash
cp frontend/.env.local.example frontend/.env.local
# frontend/.env.local を編集して、必要な値を設定
```

### 起動

```bash
docker-compose up --build
```

- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## 機能

### 株価監視システム
- リアルタイムで登録銘柄の価格を監視
- 設定した閾値を超える変動を検知
- Discord への自動通知

### AI 分析
- 価格変動の真因を AI が分析
- 「Pure Price Press」の視点で辛口解説
- 市場への波及リスクを評価

### ダッシュボード
- 監視銘柄の一覧表示
- アラート履歴のタイムライン表示
- 詳細なチャート分析

## 開発

### バックエンド開発
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### フロントエンド開発
```bash
cd frontend
npm install
npm run dev
```

## 設計メモ

### ニュース表示機能（未実装）

**要件:**
- アラートが出た銘柄を一覧表示（最大50件、古いものから削除可能）
- ニュースを重要度順に20件表示

**提案設計:**

1. **Newsテーブルの追加**
   - alert_id: 関連するアラートID
   - title: ニュース記事タイトル
   - url: 記事URL
   - source: ニュースソース
   - published_at: 公開日時
   - importance_score: 重要度スコア（0-100）
   - summary: AI生成の要約
   - created_at: 取得日時

2. **ニュース取得ロジック**
   - アラート発生時にニュースAPI（Google News API / NewsAPI等）で検索
   - 銘柄名・ティッカーで関連ニュースを取得
   - AIで重要度をスコアリング（市場への影響度、信頼性、時事性）
   - 重要度順にソートして上位記事を保存

3. **APIエンドポイント**
   - GET /api/news?limit=20&sort=importance: 重要度順にニュース取得
   - GET /api/alerts/recent?limit=50: 最近のアラート銘柄一覧
   - DELETE /api/alerts/{id}: アラート削除

4. **フロントエンド表示**
   - 左カラム: アラート銘柄一覧（銘柄名、アラート日時、削除ボタン）
   - 右カラム: NEWS一覧（タイトル、重要度、日時、ソース）

## ライセンス

MIT License
