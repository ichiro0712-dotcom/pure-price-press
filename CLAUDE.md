# Pure Price Press - Claude Code 指示書

## 最重要ルール: データ保護

### データベース変更時の必須手順

**スキーマ変更（カラム追加・削除・変更）を行う前に、必ず以下を実行すること:**

1. **バックアップを作成**
   ```bash
   # SQLiteの場合
   cp backend/pure_price_press.db backend/pure_price_press.db.backup_$(date +%Y%m%d_%H%M%S)

   # データのみエクスポート（JSON形式）
   sqlite3 backend/pure_price_press.db ".mode json" ".output backup_data.json" "SELECT * FROM monitor_targets;" "SELECT * FROM alert_history;"
   ```

2. **ユーザーに確認**
   - 変更内容を説明
   - バックアップが完了したことを報告
   - 作業を進めてよいか確認を取る

3. **マイグレーション方法**
   - 既存データを保持するため、`ALTER TABLE`でカラムを追加する
   - テーブルを再作成する場合は、既存データを一時保存してから復元する
   - **絶対にDBファイルを削除したり、空のテーブルで上書きしない**

### バックアップからの復元手順

```bash
# DBファイル全体を復元
cp backend/pure_price_press.db.backup_YYYYMMDD_HHMMSS backend/pure_price_press.db

# または、データのみ復元（スキーマは新しいまま）
# backup_data.jsonから必要なデータをINSERTで復元
```

### 禁止事項

- バックアップなしでのスキーマ変更
- ユーザー確認なしでの破壊的操作
- `Base.metadata.drop_all()`の使用
- DBファイルの削除や空ファイルでの上書き

---

## プロジェクト構成

- **frontend/**: Next.js 14 + TypeScript + Tailwind CSS
- **backend/**: FastAPI + SQLAlchemy + SQLite

## 開発サーバー

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## 注意事項

- 日本語でコミュニケーション
- モバイル対応を常に考慮
- 既存のデザインテーマ（黒・グレーベース、黄色アクセント）を維持

---

## データ取得・キャッシュ・通知アーキテクチャ

### 設計思想

- **初回アクセス時にデータ取得** → 以降はキャッシュから表示
- **ページ遷移時はAPI呼び出ししない** → キャッシュされたデータを使用
- **アラートのみバックグラウンドでチェック** → 5分ごと
- **ブラウザを閉じても通知受信可能** → Web Push通知

### 技術スタック

| 機能 | 技術 | 役割 |
|------|------|------|
| データキャッシュ | TanStack Query (React Query) | API結果をキャッシュ、ページ間で共有 |
| バックグラウンド処理 | Service Worker | ブラウザ閉じてもアラートチェック |
| プッシュ通知 | Web Push API + VAPID | ブラウザ閉じても通知受信 |
| PWA化 | next-pwa | Service Worker統合を簡素化 |

### データフロー

```
【通常のデータ取得】
User → Page → useQuery('targets')
                  ↓
         キャッシュあり? → Yes → 即表示（API呼び出しなし）
                  ↓ No
         API取得 → スケルトン表示 → データ表示 → キャッシュ保存

【CRUD操作】
User → 操作 → API呼び出し → キャッシュ無効化 → 自動再取得

【アラート通知フロー】
Service Worker (5分ごと)
    ↓
GET /api/alerts/check-new
    ↓
新規アラートあり?
    ↓ Yes
Web Push通知送信 → ブラウザ/OS通知表示
    ↓
ユーザーがクリック → アプリにフォーカス → 詳細表示
```

### キャッシュ戦略

| データ種別 | staleTime | gcTime | 再取得タイミング |
|-----------|-----------|--------|-----------------|
| targets | 5分 | 30分 | CRUD操作後、手動更新時 |
| alerts | 1分 | 10分 | 新規アラート検知時 |
| stats | 5分 | 30分 | targets更新時 |
| priceData | 1分 | 5分 | 手動更新時のみ |
| categories | 30分 | 60分 | target追加時 |

### Service Worker仕様

- **アラートチェック間隔**: 5分
- **チェック対象API**: `GET /api/alerts/check-new?since={lastCheckedAt}`
- **通知トリガー**: 新規アラートが1件以上ある場合
- **通知内容**: アラートのシンボル、変動率、価格

### Web Push通知仕様

- **通知許可**: 設定ページで有効化
- **購読情報**: バックエンドに保存（push_subscriptions テーブル）
- **VAPID認証**: 公開鍵・秘密鍵ペアで署名
- **通知アクション**: クリックでアラート詳細ページへ遷移

### UI/UX仕様

- **スケルトンUI**: 全ページで統一したローディング体験
- **キャッシュヒット時**: スケルトン表示なし（即座に表示）
- **キャッシュミス時**: スケルトン表示 → データ表示
- **エラー時**: エラーメッセージ + リトライボタン

### バックエンドAPI追加

```
GET  /api/alerts/check-new?since={ISO8601}  # 新規アラートチェック
POST /api/push/subscribe                     # Push通知購読
DELETE /api/push/unsubscribe                 # Push通知解除
POST /api/push/send                          # Push通知送信（内部用）
```

### データベース追加テーブル

```sql
-- Push通知購読情報
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
