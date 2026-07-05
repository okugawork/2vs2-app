# ピックル試合

## 目的

2vs2スポーツ向けのペア組み合わせ作成アプリを、GitHub Pages上で公開するための個人開発プロジェクトです。

## 初期構成

- HTML
- CSS
- JavaScript（Vanilla JS）
- Git / GitHub
- GitHub Pages

## 現在の機能

- 人数選択
- ペア作成ボタン
- ランダムな2vs2組み合わせ生成
- 休憩者表示
- 休憩回数表表示

## ペア生成ロジック（現状）

現在のペア作成は、完全に無作為ではなく、次の優先度で組み合わせを作成しています。

1. 休憩をできるだけ均等にする
   - まず、休憩回数が少ない人を優先して休憩者にします。
   - これにより、同じ人が何度も休むことを抑えます。

2. 前回と同じ人同士の組み合わせを避ける
   - 直前の試合で組んだペアと同じ組み合わせが出ないようにします。
   - ただし、完全に固定するのではなく、自然なランダム性も残しています。

3. 2vs2の試合として組む
   - 参加者の中から実際に試合に出る人を選び、2人ずつペアに分けます。
   - 余った人数は休憩者として表示します。

> 注意：このロジックは現時点の実装です。今後、さらに自然な組み合わせや、コートごとのバランスを考慮したルールへ修正する可能性があります。

## 仕様

- 4人以上の人数を選択すると、2vs2の試合を作成できます。
- 12人なら3試合の6ペアを作成します。
- 14人なら3試合の6ペアで2人余ります。
- 余りは「余り: 5, 12」のように表示します。

## ファイル構成

- index.html
- styles.css
- script.js

## 実行方法

1. このフォルダをGitHub Pagesの公開ルートに配置します。
2. index.html をブラウザで開きます。

## コミット〜反映手順メモ

1. 作業ディレクトリへ移動する
   - `cd c:\workspace\ピックル試合`

2. 変更内容を確認する
   - `git status`

3. 変更ファイルをステージングする
   - `git add .`

4. コミットする
   - `git commit -m "Initial pair generation app"`

5. GitHub リモートを確認する
   - `git remote -v`

6. 変更を GitHub に push する
   - `git push -u origin main`

7. GitHub Pages 用のブランチを作成する
   - `git checkout -b gh-pages`

8. gh-pages ブランチを GitHub に push する
   - `git push -u origin gh-pages`

9. GitHub のリポジトリ設定で Pages を有効化する
   - `Settings > Pages`
   - `Source` を `Deploy from a branch` に設定
   - `Branch` を `gh-pages` / `root` に設定

10. 公開URLを確認する
    - 例: `https://okugawork.github.io/2vs2-app/`

### 各手順の簡単な説明

- `git status`
  - 今どのファイルが変更されているか確認します。

- `git add .`
  - 変更した内容をコミット対象にまとめます。

- `git commit`
  - 変更内容を履歴として保存します。

- `git push`
  - ローカルのコミットを GitHub に送信して、共有できるようにします。

- `git checkout -b gh-pages`
  - GitHub Pages で公開するための専用ブランチを作ります。

- `git push -u origin gh-pages`
  - そのブランチを GitHub に送ります。

- GitHub Pages 設定
  - GitHub がサイトを公開するための設定を行います。
