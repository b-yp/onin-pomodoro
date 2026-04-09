/**
 * SDK 封装：settings 注册、通知、历史记录存取
 */
import { settings, notification, storage, scheduler } from "onin-sdk";
import type { SettingField } from "onin-sdk";
export { scheduler };

export interface PomodoroSettings {
  focusDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  autoStart: boolean;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStart: false,
};

export const SETTINGS_SCHEMA: SettingField[] = [
  {
    key: "focusDuration",
    label: "专注时长（分钟）",
    type: "number",
    description: "每个番茄的专注时长，默认 25 分钟",
    defaultValue: 25,
  },
  {
    key: "shortBreak",
    label: "短休息时长（分钟）",
    type: "number",
    description: "完成一个番茄后的短休息，默认 5 分钟",
    defaultValue: 5,
  },
  {
    key: "longBreak",
    label: "长休息时长（分钟）",
    type: "number",
    description: "每隔几个番茄后的长休息，默认 15 分钟",
    defaultValue: 15,
  },
  {
    key: "longBreakInterval",
    label: "长休息间隔（个番茄数）",
    type: "number",
    description: "每完成几个番茄进行一次长休息，默认 4 个",
    defaultValue: 4,
  },
  {
    key: "autoStart",
    label: "自动开始下一阶段",
    type: "switch",
    description: "阶段结束后自动开始下一阶段，默认关闭",
    defaultValue: false,
  },
];

let schemaRegistered = false;

/** 读取插件设置，缺失时用默认值填充 */
export async function loadSettings(): Promise<PomodoroSettings> {
  if (!schemaRegistered) {
    await settings.useSettingsSchema(SETTINGS_SCHEMA);
    schemaRegistered = true;
  }
  const vals = await settings.getAll<Partial<PomodoroSettings>>();
  return {
    focusDuration: Number(
      vals?.focusDuration ?? DEFAULT_SETTINGS.focusDuration,
    ) || DEFAULT_SETTINGS.focusDuration,
    shortBreak: Number(
      vals?.shortBreak ?? DEFAULT_SETTINGS.shortBreak,
    ) || DEFAULT_SETTINGS.shortBreak,
    longBreak: Number(
      vals?.longBreak ?? DEFAULT_SETTINGS.longBreak,
    ) || DEFAULT_SETTINGS.longBreak,
    longBreakInterval: Number(
      vals?.longBreakInterval ?? DEFAULT_SETTINGS.longBreakInterval,
    ) || DEFAULT_SETTINGS.longBreakInterval,
    autoStart: Boolean(vals?.autoStart ?? DEFAULT_SETTINGS.autoStart),
  };
}

/** 发送系统通知 */
export async function sendNotification(title: string, body: string) {
  await notification.show({ title, body });
}

// ---------- 状态持久化 ----------

export interface TimerState {
  isRunning: boolean;
  phase: string;
  remainingSeconds: number;
  expectedEndTime: number | null;
  completedCount: number;
}

const TIMER_STATE_KEY = "pomodoro_timer_state";

export async function loadTimerState(): Promise<TimerState | null> {
  return await storage.getItem<TimerState>(TIMER_STATE_KEY);
}

export async function saveTimerState(state: TimerState): Promise<void> {
  await storage.setItem(TIMER_STATE_KEY, state);
}

// ---------- 历史记录 ----------

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

const HISTORY_KEY = "pomodoro_history";

/** 读取全部历史记录 */
export async function loadHistory(): Promise<DailyRecord[]> {
  const data = await storage.getItem<DailyRecord[]>(HISTORY_KEY);
  return data ?? [];
}

/** 增加今日番茄数 +1，并持久化 */
export async function incrementToday(): Promise<DailyRecord[]> {
  const today = getTodayKey();
  const history = await loadHistory();
  const idx = history.findIndex((r) => r.date === today);
  if (idx >= 0) {
    history[idx].count += 1;
  } else {
    history.push({ date: today, count: 1 });
  }
  // 只保留最近 60 天
  const trimmed = history.slice(-60);
  await storage.setItem(HISTORY_KEY, trimmed);
  return trimmed;
}

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
