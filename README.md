# Notion Quick Post (Chrome Extension)

NotionのDatabaseを選択し、タイトル・本文・追加プロパティを入力してページを作成するChrome拡張です。

## できること

- 設定画面でNotion Integration Tokenを保存
- DB一覧を取得してローカルに保存（次回起動時も再利用）
- Databaseごとのプロパティ情報を保存し、入力欄を自動表示
- タイトル＋本文＋追加プロパティで新規ページ作成

## セットアップ

1. NotionでIntegrationを作成し、`Internal Integration Token` を控える。
2. 追加したいDatabaseを開き、Integrationを `Share` してアクセスを付与する。
3. Chromeで `chrome://extensions` を開き、「デベロッパーモード」をON。
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択。
5. 拡張の `設定` を開いてトークン保存 → `DB一覧を更新` を実行する。

## 対応プロパティ

- rich_text
- number
- checkbox
- select
- multi_select
- url
- email
- phone_number
- date

## 注意点

- トークン/DB一覧/スキーマは `chrome.storage.local` に保存されます。
- 個人用途の最小構成です。運用時は権限や入力バリデーションを必要に応じて強化してください。
