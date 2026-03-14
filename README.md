# Notion Quick Post (Chrome Extension)

NotionのDatabaseを選択し、タイトル・本文・追加プロパティを入力してページを作成するChrome拡張です。

## できること

- 設定画面でNotion Integration Tokenを保存
- 参照可能なDatabase一覧を取得して選択
- 一度取得したトークン/DB一覧/選択中DBをローカル保存して再利用
- タイトル＋本文に加え、各Databaseの主要プロパティを入力して新規ページを作成

## セットアップ（初回）

1. NotionでIntegrationを作成し、`Internal Integration Token` を控える。
2. 追加したいDatabaseを開き、Integrationを `Share` してアクセスを付与する。
3. Chromeで `chrome://extensions` を開き、「デベロッパーモード」をON。
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択。
5. 拡張の「設定」を開いてトークンを保存する。
6. ポップアップで「DB一覧を更新」を押してDatabase一覧を取得する。

## 対応している追加プロパティ型

- `rich_text`
- `number`
- `select`
- `multi_select`（カンマ区切り入力）
- `checkbox`
- `date`
- `url`
- `email`
- `phone_number`

## 注意点

- トークン/DB一覧/プロパティ情報は `chrome.storage.local` に保存されます。
- 個人用途の最小構成です。運用時は権限やエラーハンドリングを必要に応じて強化してください。
