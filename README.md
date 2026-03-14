# Notion Quick Post (Chrome Extension)

NotionのDatabaseを選択し、タイトルと本文を入力してページを作成するChrome拡張です。

## できること

- Notion Integration Tokenを保存
- 参照可能なDatabase一覧を取得して選択
- タイトル＋本文で新規ページを作成

## セットアップ

1. NotionでIntegrationを作成し、`Internal Integration Token` を控える。
2. 追加したいDatabaseを開き、Integrationを `Share` してアクセスを付与する。
3. Chromeで `chrome://extensions` を開き、「デベロッパーモード」をON。
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択。
5. 拡張ポップアップでトークンを保存し、DB一覧を取得する。

## 注意点

- トークンは `chrome.storage.local` に保存されます。
- 個人用途の最小構成です。運用時は権限やエラーハンドリングを必要に応じて強化してください。
