# v10.0.2 雙入口版

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


## v10.0.2

修正學生端 Firebase 讀取路徑，改為讀取 `battleSystem/main`，與老師端同步資料一致。


## v10.0.2

修正學生端 `firebaseDb is not defined`：改為 robust Firebase Database alias 初始化。
