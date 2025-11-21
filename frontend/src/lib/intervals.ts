/**
 * チェック間隔の定義と変換関数
 */

export interface IntervalOption {
  label: string;
  value: number; // 分単位
}

// チェック間隔のオプション
export const INTERVAL_OPTIONS: IntervalOption[] = [
  { label: "5分", value: 5 },
  { label: "30分", value: 30 },
  { label: "1時間", value: 60 },
  { label: "5時間", value: 300 },
  { label: "24時間", value: 1440 },
  { label: "3日", value: 4320 },
  { label: "7日", value: 10080 },
  { label: "15日", value: 21600 },
  { label: "1ヶ月", value: 43200 },
  { label: "3ヶ月", value: 129600 },
  { label: "6ヶ月", value: 259200 },
  { label: "1年", value: 525600 },
  { label: "2年", value: 1051200 },
  { label: "3年", value: 1576800 },
  { label: "5年", value: 2628000 },
  { label: "10年", value: 5256000 },
];

/**
 * 分を人間が読める形式に変換
 */
export function formatInterval(minutes: number): string {
  const option = INTERVAL_OPTIONS.find((opt) => opt.value === minutes);
  if (option) {
    return option.label;
  }

  // カスタム値の場合
  if (minutes < 60) {
    return `${minutes}分`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours}時間`;
  } else if (minutes < 43200) {
    const days = Math.floor(minutes / 1440);
    return `${days}日`;
  } else if (minutes < 525600) {
    const months = Math.floor(minutes / 43200);
    return `${months}ヶ月`;
  } else {
    const years = Math.floor(minutes / 525600);
    return `${years}年`;
  }
}

/**
 * デフォルトの間隔値
 */
export const DEFAULT_INTERVAL = 5; // 5分
export const DEFAULT_THRESHOLD = 5.0; // 5%
