# Battle 教學管理系統 v8.1 模組化架構版

這版由 v8.0.2 穩定版整理而來，重點是先建立模組化資料夾架構，避免一次大拆造成同步、Safari 或既有功能壞掉。

## 目前結構

- `index.html`：主頁面
- `assets/css/app.css`：全部樣式
- `assets/js/app-main.js`：原 v8.0.2 穩定核心，目前功能仍在這裡
- `assets/js/modules/core.js`：核心模組預留
- `assets/js/modules/sync.js`：同步模組預留
- `assets/js/modules/rewards.js`：獎品模組預留
- `assets/js/modules/performance.js`：演出工作台模組預留
- `assets/js/modules/start-class.js`：開始上課模組預留

## 為什麼不是一次全部拆乾淨？

因為目前系統已經包含 Firebase 同步、裝置鎖、iPad/Safari 相容、獎品、演出、統計等功能。  
如果一次把函式全部切成 ES Modules，風險很高，可能會破壞現有資料與同步。

所以 v8.1 採用「安全模組化」：
先把資料夾、CSS、JS 外部化，建立模組邊界；後續再逐步把各功能搬進對應檔案。

## 上傳方式

請上傳整個資料夾，不能只上傳 `index.html`。  
GitHub Pages / Netlify 都可以使用這個 ZIP。
