/**
 * 计时器核心状态管理（Svelte 5 Runes）
 * 使用单一 reactive class 避免 export state 重赋值问题
 */
import {
  loadSettings,
  sendNotification,
  incrementToday,
  loadHistory,
  saveTimerState,
  loadTimerState,
  scheduler
} from "./sdk";
import type { PomodoroSettings, DailyRecord } from "./sdk";
import { pluginWindow } from "onin-sdk";

export type Phase = "focus" | "short-break" | "long-break";

const PHASE_LABELS: Record<Phase, string> = {
  focus: "专注中",
  "short-break": "短休息",
  "long-break": "长休息",
};

export function getPhaseColor(p: Phase): string {
  switch (p) {
    case "focus":
      return "#FF6B6B";
    case "short-break":
      return "#51CF66";
    case "long-break":
      return "#339AF0";
  }
}

// ---------- 状态类（Svelte 5 runes class） ----------

class TimerStore {
  phase = $state<Phase>("focus");
  totalSeconds = $state(25 * 60);
  remainingSeconds = $state(25 * 60);
  expectedEndTime = $state<number | null>(null);
  isRunning = $state(false);
  completedCount = $state(0);
  todayCount = $state(0);
  history = $state<DailyRecord[]>([]);
  cfg = $state<PomodoroSettings | null>(null);

  progress = $derived(
    this.totalSeconds > 0 ? 1 - this.remainingSeconds / this.totalSeconds : 0,
  );

  timeDisplay = $derived(
    `${String(Math.floor(this.remainingSeconds / 60)).padStart(2, "0")}:${String(this.remainingSeconds % 60).padStart(2, "0")}`,
  );

  phaseLabel = $derived(PHASE_LABELS[this.phase]);
  phaseColor = $derived(getPhaseColor(this.phase));

  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _isRestoring = false;
  private _isCompleting = false;

  // ---------- 初始化 ----------

  async init() {
    this._isRestoring = true;
    const s = await loadSettings();
    this.cfg = s;

    try {
      const hist = await loadHistory();
      this.history = hist;

      const today = getTodayStr();
      const todayRecord = hist.find((r) => r.date === today);
      this.todayCount = todayRecord?.count ?? 0;
    } catch (e) {
      console.error("[Timer] Failed to load history:", e);
    }

    try {
      const savedState = await loadTimerState();
      if (savedState) {
        this.phase = savedState.phase as Phase;
        const dur = this._phaseDuration(this.phase);
        this.totalSeconds = dur * 60;
        this.completedCount = savedState.completedCount ?? 0;

        if (savedState.isRunning && savedState.expectedEndTime) {
          const now = Date.now();
          if (now >= savedState.expectedEndTime) {
            this.remainingSeconds = 0;
            this.expectedEndTime = null;
            await this._onPhaseComplete(true);
          } else {
            this.remainingSeconds = Math.ceil((savedState.expectedEndTime - now) / 1000);
            this.expectedEndTime = savedState.expectedEndTime;
            this.isRunning = true;
            this._startInterval();
            this._registerScheduler();
          }
        } else {
          // 如果计时器未运行，直接应用当前阶段配置的时长。
          // 这样可以确保修改设置后，初始进入界面能立即看到新时长，而不是旧的剩余时间。
          this.remainingSeconds = this.totalSeconds;
          this.isRunning = false;
          this.expectedEndTime = null;
        }
      } else {
        this.setPhase("focus");
      }
    } catch (e) {
      console.error("[Timer] Failed to load timer state:", e);
      this.setPhase("focus");
    }
    this._isRestoring = false;

    // 监听窗口焦点，重新加载设置
    pluginWindow.onFocus(async () => {
      await this._reloadSettings();
    });
  }

  /** 重新加载设置，更新当前阶段时间 */
  private async _reloadSettings() {
    const s = await loadSettings();
    this.cfg = s;
    // 如果计时器未运行，更新当前阶段的时间
    if (!this.isRunning) {
      const dur = this._phaseDuration(this.phase);
      this.totalSeconds = dur * 60;
      this.remainingSeconds = dur * 60;
      this._saveState();
    }
  }

  // ---------- 控制 ----------

  private _startInterval() {
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      if (this.expectedEndTime) {
        const now = Date.now();
        const left = Math.ceil((this.expectedEndTime - now) / 1000);
        if (left <= 0) {
          this.remainingSeconds = 0;
          this._onPhaseComplete();
        } else if (this.remainingSeconds !== left) {
          // 每秒更新一次，确保倒计时顺滑
          this.remainingSeconds = left;
        }
      }
    }, 1000);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.expectedEndTime = Date.now() + this.remainingSeconds * 1000;
    this._startInterval();
    this._registerScheduler();
    this._saveState();
  }

  pause() {
    this.isRunning = false;
    this.expectedEndTime = null;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    scheduler.cancel('pomodoro-end').catch(() => { });
    this._saveState();
  }

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this._saveState();
  }

  skip() {
    this.pause();
    this._onPhaseComplete();
  }

  setPhase(p: Phase) {
    this.pause();
    this.phase = p;
    const dur = this._phaseDuration(p);
    this.totalSeconds = dur * 60;
    this.remainingSeconds = dur * 60;
    this._saveState();
  }

  private async _saveState() {
    if (this._isRestoring) return;
    await saveTimerState({
      isRunning: this.isRunning,
      phase: this.phase,
      remainingSeconds: this.remainingSeconds,
      expectedEndTime: this.expectedEndTime,
      completedCount: this.completedCount,
    });
  }

  private async _registerScheduler() {
    if (!this.expectedEndTime) return;
    try {
      const d = new Date(this.expectedEndTime);
      const cron = `${d.getMinutes()} ${d.getHours()} ${d.getDate()} ${d.getMonth() + 1} *`;
      await scheduler.schedule('pomodoro-end', cron, async () => {
        if (this.isRunning) {
          scheduler.cancel('pomodoro-end').catch(() => { });
          await this._onPhaseComplete();
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  // ---------- 私有 ----------

  private _phaseDuration(p: Phase): number {
    if (!this.cfg) return 25;
    switch (p) {
      case "focus":
        return this.cfg.focusDuration;
      case "short-break":
        return this.cfg.shortBreak;
      case "long-break":
        return this.cfg.longBreak;
    }
  }

  private async _onPhaseComplete(isRestored = false) {
    if (this._isCompleting) return;
    this._isCompleting = true;

    try {
      console.log(`[Timer] Phase complete triggered: ${this.phase}${isRestored ? ' (Restored)' : ''}`);
      
      const finishedPhase = this.phase;
      this.pause();
      this.remainingSeconds = 0;

      // 1. 立即决定并切换到下一个阶段，保证 UI 响应
      let nextPhase: Phase = "focus";
      if (finishedPhase === "focus") {
        this.completedCount += 1;
        const interval = this.cfg?.longBreakInterval ?? 4;
        nextPhase = this.completedCount % interval === 0 ? "long-break" : "short-break";
      }
      
      // 注意：setPhase 内部也会调用 pause() 和 _saveState()
      this.setPhase(nextPhase);
      console.log(`[Timer] Switched to next phase: ${nextPhase}`);

      // 2. 异步执行耗时/可能阻塞的操作（历史记录和通知）
      const runAsyncTasks = async () => {
        try {
          if (finishedPhase === "focus") {
            const hist = await incrementToday();
            this.history = hist;
            const today = getTodayStr();
            this.todayCount = hist.find((r) => r.date === today)?.count ?? 0;

            if (!isRestored) {
              // 不再 await 通知，防止因权限/手势/系统弹窗导致的阻塞
              sendNotification(
                "🍅 专注完成！",
                `已完成第 ${this.todayCount} 个番茄，该休息了`,
              ).catch(err => console.error("[Timer] Notification error:", err));
            }
          } else {
            if (!isRestored) {
              sendNotification("⏰ 休息结束！", "准备好了吗？开始下一个专注阶段")
                .catch(err => console.error("[Timer] Notification error:", err));
            }
          }

          // 如果开启了自动开始，也在这里处理
          if (this.cfg?.autoStart && !isRestored) {
            setTimeout(() => {
              if (!this.isRunning) {
                console.log("[Timer] Auto-starting next phase...");
                this.start();
              }
            }, 1000);
          }
        } catch (e) {
          console.error("[Timer] Error in background tasks:", e);
        }
      };

      runAsyncTasks();
    } catch (e) {
      console.error("[Timer] Critical error in _onPhaseComplete:", e);
    } finally {
      this._isCompleting = false;
    }
  }
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 导出单例
export const timer = new TimerStore();
