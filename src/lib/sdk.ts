/**
 * SDK 封装：settings 注册、通知、历史记录存取
 */
import { settings, notification, storage, scheduler } from "onin-sdk";
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

/** 读取插件设置，缺失时用默认值填充 */
export async function loadSettings(): Promise<PomodoroSettings> {
  const vals = await settings.getAll<Partial<PomodoroSettings>>();
  return {
    focusDuration: Number(
      vals?.focusDuration ?? DEFAULT_SETTINGS.focusDuration,
    ),
    shortBreak: Number(vals?.shortBreak ?? DEFAULT_SETTINGS.shortBreak),
    longBreak: Number(vals?.longBreak ?? DEFAULT_SETTINGS.longBreak),
    longBreakInterval: Number(
      vals?.longBreakInterval ?? DEFAULT_SETTINGS.longBreakInterval,
    ),
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
