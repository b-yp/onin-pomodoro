/**
 * lifecycle.ts - 独立编译为 lifecycle.js，由 Onin 在插件加载时执行
 * 负责注册 settings schema 和 command handler
 */
import { lifecycle, settings, type SettingField } from "onin-sdk";

lifecycle.onLoad(() => {
  const settingsSchema: SettingField[] = [
    {
      key: "focusDuration",
      label: "专注时长（分钟）",
      type: "number",
      description: "每个番茄的专注时长，默认 25 分钟",
    },
    {
      key: "shortBreak",
      label: "短休息时长（分钟）",
      type: "number",
      description: "完成一个番茄后的短休息，默认 5 分钟",
    },
    {
      key: "longBreak",
      label: "长休息时长（分钟）",
      type: "number",
      description: "每隔几个番茄后的长休息，默认 15 分钟",
    },
    {
      key: "longBreakInterval",
      label: "长休息间隔（个番茄数）",
      type: "number",
      description: "每完成几个番茄进行一次长休息，默认 4 个",
    },
    {
      key: "autoStart",
      label: "自动开始下一阶段",
      type: "switch",
      description: "阶段结束后自动开始下一阶段，默认关闭",
    },
  ];
  settings.useSettingsSchema(settingsSchema);
});
