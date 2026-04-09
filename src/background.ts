/**
 * background.ts - 独立编译为 background.js，由 Onin 在插件加载时执行
 * 负责注册 settings schema 和 command handler
 */
import { lifecycle, settings } from "onin-sdk";
import { SETTINGS_SCHEMA } from "./lib/sdk";

lifecycle.onLoad(() => {
  settings.useSettingsSchema(SETTINGS_SCHEMA);
});
