# Pure Price Press デプロイガイド

## 構成

- **Frontend**: Vercel (Next.js)
- **Backend**: Vercel Serverless (FastAPI)
- **Database**: Supabase (PostgreSQL)
- **Batch Processing**: GitHub Actions

## 1. Supabase セットアップ

### 1.1 プロジェクト作成

1. [Supabase](https://supabase.com) にログイン
2. 「New Project」をクリック
3. プロジェクト名とパスワードを設定
4. リージョンは「Northeast Asia (Tokyo)」を選択

### 1.2 データベーススキーマ作成

1. Supabase ダッシュボードで「SQL Editor」を開く
2. `docs/supabase-schema.sql` の内容をコピー&ペースト
3. 「Run」をクリックしてテーブルを作成

### 1.3 接続情報の取得

1. 「Settings」→「Database」を開く
2. 「Connection string」→「URI」をコピー
   - 形式: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

## 2. Backend デプロイ (Vercel)

### 2.1 Vercel プロジェクト作成

1. [Vercel](https://vercel.com) にログイン
2. 「New Project」→「Import Git Repository」
3. リポジトリを選択
4. **Root Directory**: `backend` を指定
5. **Framework Preset**: Other を選択

### 2.2 環境変数設定

Vercel の「Settings」→「Environment Variables」で以下を設定:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase 接続文字列 |
| `GEMINI_API_KEY` | Google Gemini API キー |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL (オプション) |
| `VAPID_PUBLIC_KEY` | Web Push 公開鍵 (オプション) |
| `VAPID_PRIVATE_KEY` | Web Push 秘密鍵 (オプション) |

### 2.3 デプロイ

1. 「Deploy」をクリック
2. デプロイ完了後、URL をメモ (例: `https://your-backend.vercel.app`)

## 3. Frontend デプロイ (Vercel)

### 3.1 Vercel プロジェクト作成

1. 「New Project」→「Import Git Repository」
2. 同じリポジトリを選択
3. **Root Directory**: `frontend` を指定
4. **Framework Preset**: Next.js を選択

### 3.2 環境変数設定

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend の URL (例: `https://your-backend.vercel.app`) |

### 3.3 デプロイ

1. 「Deploy」をクリック
2. デプロイ完了後、アプリにアクセス可能

## 4. GitHub Actions 設定

### 4.1 Secrets 設定

GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」で以下を設定:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Supabase 接続文字列 |
| `GEMINI_API_KEY` | Google Gemini API キー |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage API キー (ニュース収集用) |
| `FINNHUB_API_KEY` | Finnhub API キー (ニュース収集用) |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL (オプション) |
| `VAPID_PUBLIC_KEY` | Web Push 公開鍵 (オプション) |
| `VAPID_PRIVATE_KEY` | Web Push 秘密鍵 (オプション) |

### 4.2 ワークフロー

以下のワークフローが自動実行されます:

- **news-batch.yml**: 毎日 6:00 AM JST にニュースバッチ処理
- **price-monitor.yml**: 米国市場時間中、5分ごとに価格監視

### 4.3 手動実行

GitHub の「Actions」タブから手動でワークフローを実行可能:

1. 「Actions」→ワークフローを選択
2. 「Run workflow」をクリック
3. (news-batch の場合) `hours_back` パラメータを指定可能

## 5. API キーの取得方法

### Gemini API Key

1. [Google AI Studio](https://aistudio.google.com/apikey) にアクセス
2. 「Get API key」→「Create API key」
3. キーをコピー

### Alpha Vantage API Key

1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key) にアクセス
2. フォームに情報を入力
3. キーがメールで届く

### Finnhub API Key

1. [Finnhub](https://finnhub.io/register) にアクセス
2. アカウント作成
3. ダッシュボードでキーを確認

### Discord Webhook URL

1. Discord サーバーの設定を開く
2. 「連携サービス」→「ウェブフック」
3. 「新しいウェブフック」→ URL をコピー

### VAPID Keys (Web Push 用)

```bash
# Node.js がインストールされている場合
npx web-push generate-vapid-keys
```

## 6. トラブルシューティング

### Backend がタイムアウトする

Vercel Serverless のタイムアウトは Pro プランで最大 60 秒です。
ニュースバッチ処理のような長時間処理は GitHub Actions で実行します。

### CORS エラー

Backend の `vercel.json` に CORS ヘッダーが設定されています。
フロントエンドの URL が正しく設定されているか確認してください。

### データベース接続エラー

1. `DATABASE_URL` が正しいか確認
2. Supabase の「Settings」→「Database」→「Connection string」を再確認
3. `postgres://` を `postgresql://` に変更する必要があります（コードで自動変換）

### GitHub Actions が失敗する

1. Secrets が正しく設定されているか確認
2. Actions タブでログを確認
3. 手動実行して問題を特定

## 7. 本番運用のヒント

### コスト最適化

- Supabase: 無料枠で 500MB まで
- Vercel: 無料枠で月 100GB 帯域
- GitHub Actions: 無料枠で月 2,000 分

### モニタリング

- Vercel Analytics でパフォーマンス監視
- Supabase でデータベース使用量を確認
- GitHub Actions でバッチ処理のログを確認

### バックアップ

Supabase の「Database」→「Backups」でバックアップを設定可能（Pro プラン）
