# budget-book

## 開発用（ローカル起動と ngrok による公開）

ローカルで開発サーバーを起動し、ngrok で公開してスマホから確認します。手順の一例:

```bash
# プロジェクトのフロントエンドに移動
cd kakeibo-pwa

# 依存をインストール（必要に応じて）
npm install

# 開発サーバーを起動（Vite のデフォルトポートは 5173）
npm run dev

# 別ターミナルで ngrok を使って公開（ポートは dev サーバーに合わせる）
ngrok http 5173
```

ngrok が表示する HTTPS の公開 URL をスマホで開くと、ローカルの開発中ページを確認できます。
