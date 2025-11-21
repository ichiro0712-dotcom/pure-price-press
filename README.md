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

## ライセンス

MIT License
