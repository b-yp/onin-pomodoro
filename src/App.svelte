<script lang="ts">
  import { onMount } from "svelte";
  import { timer, getPhaseColor } from "./lib/timer.svelte";
  import type { Phase } from "./lib/timer.svelte";

  // Tab
  let activeTab = $state<"timer" | "history">("timer");

  // SVG 进度圆环参数
  const RADIUS = 90;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  let strokeDashoffset = $derived(CIRCUMFERENCE * (1 - timer.progress));

  // 最近 14 天的历史
  let recentHistory = $derived(
    (() => {
      const days: { date: string; label: string; count: number }[] = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = fmtDate(d);
        const rec = timer.history.find((r) => r.date === key);
        days.push({
          date: key,
          label:
            i === 0
              ? "今天"
              : i === 1
                ? "昨天"
                : `${d.getMonth() + 1}/${d.getDate()}`,
          count: rec?.count ?? 0,
        });
      }
      return days;
    })(),
  );

  let maxCount = $derived(Math.max(...recentHistory.map((d) => d.count), 1));

  onMount(async () => {
    await timer.init();
  });

  function fmtDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function handlePlay() {
    if (timer.isRunning) timer.pause();
    else timer.start();
  }

  function switchPhase(p: Phase) {
    timer.setPhase(p);
  }
</script>

<div class="app" style="--phase-color: {timer.phaseColor}">
  <!-- ===== 顶部标签页 ===== -->
  <nav class="tabs">
    <button
      class="tab-btn"
      class:active={activeTab === "timer"}
      onclick={() => (activeTab = "timer")}
    >
      🍅 计时器
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === "history"}
      onclick={() => (activeTab = "history")}
    >
      📊 历史记录
    </button>
  </nav>

  <!-- ===== 计时器视图 ===== -->
  {#if activeTab === "timer"}
    <div class="timer-view">
      <!-- 阶段切换 -->
      <div class="phase-switcher">
        <button
          class="phase-btn"
          class:active={timer.phase === "focus"}
          onclick={() => switchPhase("focus")}>专注</button
        >
        <button
          class="phase-btn"
          class:active={timer.phase === "short-break"}
          onclick={() => switchPhase("short-break")}>短休息</button
        >
        <button
          class="phase-btn"
          class:active={timer.phase === "long-break"}
          onclick={() => switchPhase("long-break")}>长休息</button
        >
      </div>

      <!-- 圆形进度环 -->
      <div class="ring-wrapper">
        <svg
          class="ring"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            class="ring-track"
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            stroke-width="10"
          />
          <circle
            class="ring-progress"
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={timer.phaseColor}
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray={CIRCUMFERENCE}
            stroke-dashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
          />
        </svg>

        <div class="ring-center">
          <div class="phase-label">{timer.phaseLabel}</div>
          <div class="time-display">{timer.timeDisplay}</div>
          <div class="session-info">第 {timer.completedCount + 1} 个番茄</div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="controls">
        <button
          class="ctrl-btn secondary"
          onclick={() => timer.reset()}
          title="重置"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 .492-3.354" />
          </svg>
        </button>

        <button class="ctrl-btn primary" onclick={handlePlay}>
          {#if timer.isRunning}
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          {/if}
        </button>

        <button
          class="ctrl-btn secondary"
          onclick={() => timer.skip()}
          title="跳过"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <polygon points="5,4 15,12 5,20" />
            <line
              x1="19"
              y1="4"
              x2="19"
              y2="20"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </button>
      </div>

      <!-- 今日番茄统计 -->
      <div class="today-stats glass">
        <div class="stats-label">今日完成</div>
        <div class="tomatoes">
          {#each { length: Math.min(timer.todayCount, 20) } as _, i}
            <span class="tomato" style="animation-delay: {i * 40}ms">🍅</span>
          {/each}
          {#if timer.todayCount === 0}
            <span class="no-tomato">还没有番茄～开始专注吧！</span>
          {/if}
          {#if timer.todayCount > 20}
            <span class="extra-count">+{timer.todayCount - 20}</span>
          {/if}
        </div>
        <div class="stats-count">{timer.todayCount} 个</div>
      </div>
    </div>
  {/if}

  <!-- ===== 历史记录视图 ===== -->
  {#if activeTab === "history"}
    <div class="history-view">
      <div class="history-header">
        <h2>历史记录</h2>
        <p class="subtitle">最近 14 天的专注数据</p>
      </div>

      <!-- 柱状图 -->
      <div class="bar-chart">
        {#each recentHistory as day}
          <div class="bar-col">
            <div class="bar-wrap">
              <div
                class="bar"
                style="--h: {(day.count / maxCount) * 100}%"
                title="{day.date}: {day.count} 个番茄"
              >
                {#if day.count > 0}
                  <span class="bar-val">{day.count}</span>
                {/if}
              </div>
            </div>
            <div class="bar-label">{day.label}</div>
          </div>
        {/each}
      </div>

      <!-- 历史列表 -->
      <div class="history-list glass">
        {#each [...timer.history].reverse().slice(0, 30) as record}
          <div class="history-row">
            <span class="history-date">{record.date}</span>
            <div class="history-bar-mini">
              <div
                class="history-bar-fill"
                style="width: {Math.min((record.count / maxCount) * 100, 100)}%"
              ></div>
            </div>
            <span class="history-count">{record.count} 🍅</span>
          </div>
        {:else}
          <div class="empty-state">
            <div class="empty-icon">🌱</div>
            <p>还没有记录，开始你的第一个番茄吧！</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 16px;
    gap: 12px;
    background: radial-gradient(
        ellipse at 50% 0%,
        color-mix(in srgb, var(--phase-color) 12%, transparent),
        transparent 70%
      ),
      #0f0f13;
    transition: background 0.6s ease;
    overflow: hidden;
  }

  /* ===== Tabs ===== */
  .tabs {
    display: flex;
    gap: 4px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 4px;
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: #6c757d;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    font-family: inherit;
  }

  .tab-btn:hover {
    color: #adb5bd;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    background: var(--phase-color);
    color: #fff;
    box-shadow: 0 2px 12px
      color-mix(in srgb, var(--phase-color) 40%, transparent);
  }

  /* ===== 计时器视图 ===== */
  .timer-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 8px;
  }

  /* 阶段切换 */
  .phase-switcher {
    display: flex;
    gap: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 4px;
  }

  .phase-btn {
    padding: 6px 14px;
    border: none;
    background: transparent;
    color: #6c757d;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
    font-family: inherit;
    white-space: nowrap;
  }

  .phase-btn:hover {
    color: #adb5bd;
  }

  .phase-btn.active {
    background: var(--phase-color);
    color: #fff;
  }

  /* 进度圆环 */
  .ring-wrapper {
    position: relative;
    width: 220px;
    height: 220px;
    flex-shrink: 0;
  }

  .ring {
    width: 100%;
    height: 100%;
    filter: drop-shadow(
      0 0 16px color-mix(in srgb, var(--phase-color) 30%, transparent)
    );
  }

  .ring-progress {
    transition:
      stroke-dashoffset 1s linear,
      stroke 0.6s ease;
  }

  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .phase-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--phase-color);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .time-display {
    font-size: 48px;
    font-weight: 700;
    color: #f8f9fa;
    letter-spacing: -2px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .session-info {
    font-size: 11px;
    color: #6c757d;
  }

  /* 控制按钮 */
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .ctrl-btn {
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
    font-family: inherit;
  }

  .ctrl-btn.primary {
    width: 64px;
    height: 64px;
    background: var(--phase-color);
    color: #fff;
    box-shadow: 0 4px 20px
      color-mix(in srgb, var(--phase-color) 50%, transparent);
  }

  .ctrl-btn.primary:hover {
    transform: scale(1.06);
    box-shadow: 0 6px 28px
      color-mix(in srgb, var(--phase-color) 60%, transparent);
  }

  .ctrl-btn.primary:active {
    transform: scale(0.96);
  }

  .ctrl-btn.secondary {
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #adb5bd;
  }

  .ctrl-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #f8f9fa;
    transform: scale(1.04);
  }

  /* 今日统计 */
  .glass {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    backdrop-filter: blur(10px);
  }

  .today-stats {
    width: 100%;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stats-label {
    font-size: 11px;
    font-weight: 600;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .tomatoes {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    min-height: 24px;
    align-items: center;
  }

  .tomato {
    font-size: 16px;
    animation: popIn 0.3s ease both;
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .no-tomato {
    font-size: 12px;
    color: #6c757d;
    font-style: italic;
  }

  .extra-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--phase-color);
    margin-left: 4px;
  }

  .stats-count {
    font-size: 13px;
    font-weight: 600;
    color: var(--phase-color);
  }

  /* ===== 历史视图 ===== */
  .history-view {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 8px;
  }

  .history-header h2 {
    font-size: 16px;
    font-weight: 700;
    color: #f8f9fa;
  }

  .subtitle {
    font-size: 12px;
    color: #6c757d;
    margin-top: 2px;
  }

  /* 柱状图 */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 100px;
    padding: 8px 4px 0;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 100%;
  }

  .bar-wrap {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
  }

  .bar {
    width: 100%;
    height: var(--h, 0%);
    background: linear-gradient(
      180deg,
      var(--phase-color),
      color-mix(in srgb, var(--phase-color) 60%, transparent)
    );
    border-radius: 4px 4px 2px 2px;
    transition: height 0.4s ease;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-height: 2px;
  }

  .bar-val {
    font-size: 9px;
    color: #fff;
    font-weight: 700;
    margin-top: 2px;
    opacity: 0.9;
  }

  .bar-label {
    font-size: 10px;
    color: #6c757d;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    text-align: center;
  }

  /* 历史列表 */
  .history-list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .history-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.15s;
  }

  .history-row:last-child {
    border-bottom: none;
  }

  .history-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .history-date {
    font-size: 12px;
    color: #adb5bd;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    width: 80px;
  }

  .history-bar-mini {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }

  .history-bar-fill {
    height: 100%;
    background: var(--phase-color);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .history-count {
    font-size: 12px;
    font-weight: 600;
    color: #f8f9fa;
    flex-shrink: 0;
    width: 48px;
    text-align: right;
  }

  /* 空状态 */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 20px;
    color: #6c757d;
    font-size: 13px;
  }

  .empty-icon {
    font-size: 36px;
  }
</style>
