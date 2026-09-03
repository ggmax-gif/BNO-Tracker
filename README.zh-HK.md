# BNO 身份狀態追蹤器

🌐 [English](README.md) · **繁體中文**

一個畀 **BNO（英國國民海外）簽證** 一家人用嘅離港日數追蹤器，幫你同屋企人
跟得上 ILR（無限期居留）申請所要求嘅 **任何 12 個月內離開英國不超過 180 日**
規則。

**試用版：** <https://ggmax-gif.github.io/BNO-Tracker/>

> ⚠️ 呢個工具 只係用嚟自己記錄同參考，**並非法律意見**。任何重要決定 請以
> [UKVI 官方指引](https://www.gov.uk/british-national-overseas-bno-visa)
> 為準，必要時諮詢註冊嘅移民律師。

---

## 點解要整呢個工具

我見過好多 BNO 家庭都係用 Excel 自己計離港日數，但係內政部嗰啲規則 有幾個位
好容易計錯：

1. **午夜規則（Midnight Rule）。** 一日只計為「離港日」，係指你喺英國時間
   午夜時身處英國境外。**出發日 計入離港**（午夜時人喺外面），**返港日
   不計**（午夜前已返到英國）。多數人手記嘅 spreadsheet 都係多計咗一日，
   累積落去就會差好多。
2. **皇家屬地同愛爾蘭嘅陷阱。** 去 **澤西、根西、馬恩島**（皇家屬地）或者
   **愛爾蘭共和國**，雖然同英國有共同旅行區（CTA），但內政部 仍然會當你
   離開咗英國 計算。好多 BNO 持有人以為去呢啲地方唔使計，呢個係常見錯誤。
3. **滾動窗口。** 規則係 **任何 12 個月內** 不超過 180 日，唔係「每年」
   180 日。即係話 11 月去 100 日加 1 月再去 90 日，雖然兩個曆年都冇超
   180 日，但係喺同一個 12 個月窗口入面已經爆咗。

呢個追蹤器將以上規則 全部寫入計算邏輯，喺介面上面清楚顯示出嚟。

---

## 功能

- **儀表板** — 一眼睇晒每位家人嘅狀態：目前 12 個月窗口期內離港咗幾多日、
  仲有幾多日可以離港、由 BNO 批准日起總共離港咗幾多日，同 ILR 資格倒數。
- **家庭成員** — 想加幾多個 BNO 持有人 / 配偶 / 子女 / 受養人都得，
  每位有獨立嘅批准日期同出行記錄。
- **出行記錄** — 記錄每次離開英國嘅行程。仲未返港嘅行程（冇填返港日）
  都會自動計算到今日為止。
- **假設情況規劃器** — 揀好未來嘅出發同返港日期，即時睇到 **行程結束時**
  你嘅滾動窗口會係幾多（唔係淨係睇今日嘅情況 — 呢個分別好重要，
  亦係多數其他追蹤器計錯嘅地方）。
- **匯出 / 匯入** — JSON 用嚟完整備份，CSV 用嚟用 Excel 自己再分析。
- **雙語介面** — 中英文隨時切換，記住你嘅選擇。

---

## 已實現嘅 BNO / ILR 規則

| 規則 | 邊度處理 | 備註 |
|------|---------|------|
| 任何 12 個月內離港不超過 180 日 | `calcRollingWindow()` | 可以以任何日期作為參考點，唔限於今日 |
| 午夜規則 | `tripAbsenceRange()` / `tripAbsenceDays()` | 出發日計入，返港日不計 |
| 5 年 ILR 申請期 | `ilrEarliest` 計算 | `BNO 批准日 + 5 年` |
| 由批准日起最差嘅 12 個月窗口 | `worstWindow` 掃描 | 逐日掃晒每個滾動窗口，唔係固定分段 — 分段會漏咗跨段嘅超標 |
| 皇家屬地同愛爾蘭計入離港 | 出行記錄頁嘅警示 | 計算上冇分別，純粹提醒用戶呢個陷阱 |

---

## 技術同設計上嘅選擇

- **單一 HTML 檔，冇 build step，零依賴。** 大概 1100 行 vanilla JS，冇第二
  樣嘢。以前用 Chart.js（CDN），但係佢有 201 KB — 成個 app 嘅四倍 — 淨係
  為咗畫返個同成員進度條差唔多嘅圖，所以拆咗佢。而家整個頁面 一個網絡請求
  都冇，下面講嘅私隱承諾先至係字面上真確，唔係「差唔多真」。
- **冇後端、冇分析、冇追蹤。** 喺瀏覽器版，資料存喺 `localStorage`；喺桌面
  版，係你部電腦上面一個真實檔案。兩邊都一樣：GitHub repo 同部署嘅網站
  永遠睇唔到你嘅出行記錄。
- **一個檔，兩個殼。** 同一份 `index.html` 同時做網頁版同桌面版，運行時
  自己偵測有冇 Tauri 嚟決定用邊個儲存方式。網頁版 依然完全冇 build step；
  桌面版就得一步：`cp` 份 `index.html` 入個 bundle。
- **GitHub Pages 直接 serve `main` branch。** Push 上 main 就係全部部署
  流程。
- **i18n 用一個 translation dictionary + `t(key)` helper。** 需要插值嘅
  字串以 function 形式儲存（`ilrApprox: (n) => …`）。語言選擇 persist 到
  `localStorage`。
- **日期運算明確用 local time。** `parseDate` / `toDateStr` helper 避免咗
  `new Date("YYYY-MM-DD")` 解析做 UTC 午夜嘅陷阱，呢個 bug 喺美洲時區會
  令所有日期 silently 早咗一日。

---

## 本地運行

只有一個 HTML 檔，唔需要 build — 直接打開就得。

```sh
git clone https://github.com/ggmax-gif/BNO-Tracker.git
cd BNO-Tracker
python3 -m http.server 8000
# 喺瀏覽器打開 http://localhost:8000
```

（直接 double-click `index.html` 都可以，不過 `localStorage` 喺 `http://`
協議下面會運作得穩定啲，唔好用 `file://`。）

---

## 桌面版（macOS）

網頁版啲資料存喺 `localStorage`，雖然係存喺你部機，但係唔耐用：Safari 大約
一個星期冇用過個網站就會清走啲資料，你自己「清除瀏覽資料」都一樣會清走。
一個成個月先開一次、用嚟決定幾時申請 ILR 嘅工具，咁樣好易一鋪清袋，五年
記錄冇晒。

桌面版就解決咗呢個問題。你嘅資料係一個 JSON 檔，放喺
`~/Library/Application Support/uk.bnotracker.app/`，每日自動留一個備份
（保留最近 30 個），而且 完全唔使上網都用得。

**點裝：** 睇 [docs/INSTALL.zh-HK.md](docs/INSTALL.zh-HK.md)。個 app 冇簽名，
所以第一次開嗰陣 macOS 會彈警告，份指南會一步步帶你過。

**自己 build：**

```sh
cd desktop
npm install
npm run build      # release .app 同 .dmg 喺 src-tauri/target/release/bundle/
npm run dev        # 開發模式，用 :8765 個 python server
```

需要裝 [Rust toolchain](https://rustup.rs)。Windows 版遲啲先做 — Tauri
喺 macOS 上面 cross-compile 唔到 Windows，要用 CI 或者一部 Windows 機。

---

## 鳴謝

呢個 project 同 [Claude](https://claude.com)（Anthropic）合作開發。產品方向、
BNO 規則研究同 bug 嘅發現 由我負責；實作部分同 Claude 一齊 pair
programming。每個 commit 都有相應嘅 credit。

## 授權條款

[MIT](LICENSE)
