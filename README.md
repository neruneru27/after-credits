# マーベル・アフタークレジット(静的サイト)

マーベルの映像とコミックを結ぶ日本語ファンサイト。11ty(Eleventy)によるデータ駆動の静的マルチページサイト。

## コマンド

```bash
npm install        # 初回のみ
npm run validate   # データ検証のみ実行
npm run serve      # ローカルプレビュー(http://localhost:8080)
npm run build      # 検証 → _site/ にビルド
```

## 構成

- `src/_data/*.json` — **コンテンツの正**(mcu 68作品 / comics 416冊 / glossary 149語 / characters 17体 / カード56枚 / timeline / site設定)
- `src/*.njk` — 各ページ。ビルド時にJSONから静的HTML生成
- `src/articles/*.md` — 記事(front matter付きMarkdown)
- `src/assets/js/*.js` — 検索・絞り込み等のクライアントJS(表示切替のみ。コンテンツはHTMLに焼き込み済み)
- `scripts/validate-data.js` — **ビルド前データ検証。失敗するとビルド停止**(削除・緩和禁止)

## 運用ルール(HANDOFF.md より)

- データ・記事の中身の追加執筆はチャット側Claudeの担当。JSON/MDを差し替えたら `npm run validate` で検証
- サイト名は `src/_data/site.json` の `name` で一元管理
- AmazonアソシエイトIDは `src/_data/site.json` の `amazonTag`(現在ダミー `your-id-22`)。実IDへの差し替えは運営者が実施
- 公式画像・スクショの使用禁止。ネタバレ2段防御UI(あらすじ→クリックでネタバレ)を維持
- 電子版全停止(2026/9/30)後は「絶版アーカイブ」モード切替を予定

## デプロイ

`main` へのpushで GitHub Actions が検証→ビルド→GitHub Pages 公開を自動実行。

---
非公式ファンサイト。Marvel Entertainment, LLC / The Walt Disney Company とは関係ありません。
