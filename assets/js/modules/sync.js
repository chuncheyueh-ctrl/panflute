/* sync.js | v8.1
   同步模組預留檔。
   目前 Firebase 同步、裝置鎖仍由 app-main.js 載入，避免改動同步核心造成資料風險。 */
window.BattleModules = window.BattleModules || {};
window.BattleModules.sync = { status: "loaded" };
