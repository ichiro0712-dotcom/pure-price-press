"""
アラート登録スクリプト
Yahoo Finance APIで利用可能なティッカーシンボルでアラートを一括登録
"""
import sys
from database import SessionLocal
import crud
import schemas

# アラート設定リスト
# Yahoo Financeで使える正しいティッカーシンボル形式
alerts = [
    {
        "symbol": "^VIX",
        "name": "VIX (恐怖指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 10.0, "direction": "increase"},  # 24h, +10%
            {"interval_minutes": 10080, "threshold_percent": 20.0, "direction": "increase", "operator": "OR"},  # 7day, +20%
        ]
    },
    {
        "symbol": "^MOVE",
        "name": "MOVE (米国債の恐怖指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 5.0, "direction": "increase"},  # 24h, +5%
            {"interval_minutes": 43200, "threshold_percent": 15.0, "direction": "increase", "operator": "OR"},  # 1mon, +15%
        ]
    },
    {
        "symbol": "^TNX",
        "name": "US10Y (米国10年債利回り)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "^IRX",
        "name": "US02Y (米国2年債利回り)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "DX-Y.NYB",
        "name": "DXY (米ドル指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 0.8, "direction": "both"},  # 24h, ±0.8%
            {"interval_minutes": 10080, "threshold_percent": 2.0, "direction": "both", "operator": "OR"},  # 7day, ±2%
        ]
    },
    {
        "symbol": "EURUSD=X",
        "name": "EURUSD (ユーロ/米ドル)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 0.8, "direction": "both"},  # 24h, ±0.8%
            {"interval_minutes": 10080, "threshold_percent": 2.0, "direction": "both", "operator": "OR"},  # 7day, ±2%
        ]
    },
    {
        "symbol": "CNH=X",
        "name": "USDCNH (米ドル/人民元)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 0.5, "direction": "both"},  # 24h, ±0.5%
            {"interval_minutes": 43200, "threshold_percent": 2.0, "direction": "both", "operator": "OR"},  # 1mon, ±2%
        ]
    },
    {
        "symbol": "GC=F",
        "name": "XAUUSD (金/ゴールド)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 2.0, "direction": "both"},  # 24h, ±2%
            {"interval_minutes": 43200, "threshold_percent": 6.0, "direction": "both", "operator": "OR"},  # 1mon, ±6%
        ]
    },
    {
        "symbol": "CL=F",
        "name": "USOIL (WTI原油)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 4.0, "direction": "both"},  # 24h, ±4%
            {"interval_minutes": 43200, "threshold_percent": 12.0, "direction": "both", "operator": "OR"},  # 1mon, ±12%
        ]
    },
    {
        "symbol": "NG=F",
        "name": "NG1! (天然ガス先物)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 6.0, "direction": "both"},  # 24h, ±6%
            {"interval_minutes": 43200, "threshold_percent": 20.0, "direction": "both", "operator": "OR"},  # 1mon, ±20%
        ]
    },
    {
        "symbol": "HG=F",
        "name": "HG1! (銅先物)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 8.0, "direction": "both", "operator": "OR"},  # 1mon, ±8%
        ]
    },
    {
        "symbol": "ZW=F",
        "name": "ZW1! (小麦先物)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "^GSPC",
        "name": "SPX (S&P 500)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 2.0, "direction": "both"},  # 24h, ±2%
            {"interval_minutes": 10080, "threshold_percent": 5.0, "direction": "both", "operator": "OR"},  # 7day, ±5%
        ]
    },
    {
        "symbol": "^NDX",
        "name": "NDX (ナスダック100)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 2.5, "direction": "both"},  # 24h, ±2.5%
            {"interval_minutes": 10080, "threshold_percent": 6.0, "direction": "both", "operator": "OR"},  # 7day, ±6%
        ]
    },
    {
        "symbol": "^HSI",
        "name": "HSI (香港ハンセン指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "BTC-USD",
        "name": "BTCUSD (ビットコイン)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 6.0, "direction": "both"},  # 24h, ±6%
            {"interval_minutes": 10080, "threshold_percent": 15.0, "direction": "both", "operator": "OR"},  # 7day, ±15%
        ]
    },
    {
        "symbol": "TSM",
        "name": "TSM (TSMC/台湾セミコン)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 4.0, "direction": "both"},  # 24h, ±4%
            {"interval_minutes": 43200, "threshold_percent": 12.0, "direction": "both", "operator": "OR"},  # 1mon, ±12%
        ]
    },
    {
        "symbol": "LMT",
        "name": "LMT (ロッキード・マーチン)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "increase"},  # 24h, +3%
            {"interval_minutes": 43200, "threshold_percent": 8.0, "direction": "increase", "operator": "OR"},  # 1mon, +8%
        ]
    },
    {
        "symbol": "^SOX",
        "name": "SOX (半導体指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "HYG",
        "name": "HYG (ハイイールド債)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 1.5, "direction": "decrease"},  # 24h, -1.5%
            {"interval_minutes": 43200, "threshold_percent": 4.0, "direction": "decrease", "operator": "OR"},  # 1mon, -4%
        ]
    },
    {
        "symbol": "^N225",
        "name": "NI225 (日経平均株価)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 2.5, "direction": "both"},  # 24h, ±2.5%
            {"interval_minutes": 10080, "threshold_percent": 6.0, "direction": "both", "operator": "OR"},  # 7day, ±6%
        ]
    },
    {
        "symbol": "^TPX.T",
        "name": "TOPIX (東証株価指数)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 2.0, "direction": "both"},  # 24h, ±2%
            {"interval_minutes": 10080, "threshold_percent": 5.0, "direction": "both", "operator": "OR"},  # 7day, ±5%
        ]
    },
    {
        "symbol": "JPY=X",
        "name": "USDJPY (米ドル/円)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 1.2, "direction": "both"},  # 24h, ±1.2%
            {"interval_minutes": 43200, "threshold_percent": 4.0, "direction": "both", "operator": "OR"},  # 1mon, ±4%
        ]
    },
    {
        "symbol": "^TNX.T",
        "name": "JP10Y (日本10年国債利回り)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 5.0, "direction": "both"},  # 24h, ±5%
            {"interval_minutes": 43200, "threshold_percent": 20.0, "direction": "both", "operator": "OR"},  # 1mon, ±20%
        ]
    },
    {
        "symbol": "8306.T",
        "name": "8306 (三菱UFJ)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "7203.T",
        "name": "7203 (トヨタ自動車)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 8.0, "direction": "both", "operator": "OR"},  # 1mon, ±8%
        ]
    },
    {
        "symbol": "8035.T",
        "name": "8035 (東京エレクトロン)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 4.0, "direction": "both"},  # 24h, ±4%
            {"interval_minutes": 43200, "threshold_percent": 12.0, "direction": "both", "operator": "OR"},  # 1mon, ±12%
        ]
    },
    {
        "symbol": "7011.T",
        "name": "7011 (三菱重工)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 4.0, "direction": "increase"},  # 24h, +4%
            {"interval_minutes": 43200, "threshold_percent": 12.0, "direction": "increase", "operator": "OR"},  # 1mon, +12%
        ]
    },
    {
        "symbol": "8058.T",
        "name": "8058 (三菱商事)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 3.0, "direction": "both"},  # 24h, ±3%
            {"interval_minutes": 43200, "threshold_percent": 10.0, "direction": "both", "operator": "OR"},  # 1mon, ±10%
        ]
    },
    {
        "symbol": "9101.T",
        "name": "9101 (日本郵船)",
        "conditions": [
            {"interval_minutes": 1440, "threshold_percent": 5.0, "direction": "both"},  # 24h, ±5%
            {"interval_minutes": 43200, "threshold_percent": 15.0, "direction": "both", "operator": "OR"},  # 1mon, ±15%
        ]
    },
]

def register_alerts():
    """アラートを一括登録"""
    db = SessionLocal()

    try:
        success_count = 0
        error_count = 0

        for alert_config in alerts:
            try:
                # 既存チェック
                existing = crud.get_monitor_target_by_symbol(db, alert_config["symbol"])
                if existing:
                    print(f"⚠️  {alert_config['symbol']} は既に登録されています。スキップします。")
                    continue

                # 現在のバックエンドは複数条件未対応のため、1つ目の条件のみ使用
                # TODO: 将来的に複数条件対応時に修正
                first_condition = alert_config["conditions"][0]

                target_data = schemas.MonitorTargetCreate(
                    symbol=alert_config["symbol"],
                    name=alert_config["name"],
                    interval_minutes=first_condition["interval_minutes"],
                    threshold_percent=first_condition["threshold_percent"],
                    direction=first_condition.get("direction", "both"),
                    is_active=True
                )

                created = crud.create_monitor_target(db, target_data)
                print(f"✅ {alert_config['symbol']} ({alert_config['name']}) を登録しました")
                print(f"   条件: {first_condition['interval_minutes']}分間で{first_condition['direction']}方向{first_condition['threshold_percent']}%変動")
                success_count += 1

            except Exception as e:
                print(f"❌ {alert_config['symbol']} の登録に失敗: {e}")
                error_count += 1
                continue

        print(f"\n{'='*60}")
        print(f"登録完了: 成功 {success_count}件 / 失敗 {error_count}件")
        print(f"{'='*60}")

    except Exception as e:
        print(f"エラー: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("アラート一括登録を開始します...")
    print(f"{'='*60}\n")
    register_alerts()
