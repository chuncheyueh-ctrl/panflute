# v10.1.2 雙入口版：成長洞察

## 結構

- `/teacher/index.html`：老師端完整系統
- `/student/index.html`：獨立學生端，只讀 Firebase
- `/index.html`：入口選擇頁

## 使用方式

上傳整個資料夾到 GitHub Pages。

網址會是：

- 老師端：`你的網址/teacher/`
- 學生端：`你的網址/student/`

## 重要

學生端目前為只讀，不提供修改資料功能。  
學生登入使用：

- 學校
- 姓名
- 登入代碼

如果老師尚未幫學生設定 `studentCode` / `loginCode` / `password`，可先用姓名登入測試。


## v10.1.2

修正學生端 Firebase 讀取路徑，改為讀取 `battleSystem/main`，與老師端同步資料一致。


## v10.1.2

修正學生端 `firebaseDb is not defined`：改為 robust Firebase Database alias 初始化。


## v10.1.2 成長洞察

- 成長類型可設定顏色與預設 XP。
- 成長日誌快捷按鈕依類型顯示顏色。
- 學生卡片顯示彩色 XP 分布條。
- 自動分析學生強項類型。


## v10.1.2 完整覆蓋版

請整包覆蓋上傳，不要只換單一檔案。此版強制套用成長洞察彩色比例條與類型顏色設定。
