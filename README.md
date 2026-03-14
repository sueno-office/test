# Notion Quick Post (Chrome Extension)

NotionのDatabaseを選択し、タイトル・本文（＋必要に応じて追加プロパティ）を入力してページを作成するChrome拡張です。

## できること

- Notion Integration Tokenを保存（設定画面）
- 参照可能なDatabase一覧を取得して選択（ローカルキャッシュ対応）
- タイトル＋本文で新規ページを作成
- Databaseごとの追加プロパティ入力（対応型のみ）

## セットアップ

1. NotionでIntegrationを作成し、`Internal Integration Token` を控える。
2. 追加したいDatabaseを開き、Integrationを `Share` してアクセスを付与する。
3. Chromeで `chrome://extensions` を開き、「デベロッパーモード」をON。
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択。
5. 拡張の `設定` でトークンを保存し、`DB一覧を更新` を実行する。

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
- 個人用途の最小構成です。運用時は権限やエラーハンドリング・入力バリデーションを必要に応じて強化してください。
