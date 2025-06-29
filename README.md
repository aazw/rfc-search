# RFC Search

A web tool for easily searching and visualizing RFCs and their dependencies.


## 概要

* 各RFCのタイトルやメタデータ等をいい感じに一覧でき、かつ検索できるようにするやつ ※本文は見ない
* 追加要素として、各RFCの依存関係を、本文を解析して取得している
    * 各RFCがどの他RFCを参照しているか、どの他RFCから算出されているか

## 構成要素

* Python
    * RFCの取得と解析
    * DuckDB WASMのPersistent Databaseの作成 (≒データが保存された`xxx.duckdb`ファイル)

* Node
    * 解析結果のWebでの表示
    * フロントエンドのみ
    * React + TypeScript + Tailwind CSS
    * ビルドツールはVite
    * バックエンドを省略するため、DuckDB WASMを使用
    * Python側で作成したPersistent DatabaseをDuckDB WASMで読み込んで利用する

* GitHub Actions
    * Nodeの成果物をデプロイし、公開する


## Process to Build

```text
       https://www.rfc-editor.org/rfc-index.xml                      https://www.rfc-editor.org/in-notes/tar/RFC-all.zip
                        +---+                                                               +---+
                        |   |                                                               |   |
                        |   |                                                               |   |
                        |   | '--url https://...'                                           |   | '--url https://...'
                        v   |                                                               v   |
+---------------------------------------------------+        +-------------------------------------------------------------------+
| python: python/src/trasform_rfc_index_to_json.py |        | python: python/src/extract_rfc_referencing_urls_from_rfc_txts.py |
+---------------------------------------------------+        +-------------------------------------------------------------------+
                          |                                                                   |      
                          | '--file ./rfc-index.json'                                         | '--file ./rfc-referencing-urls.json'
                          v                                                                   v      
                   rfc-index.json                                                  rfc-referencing-urls.json
                          |                                                                   |
                          |                                                                   |
                          +---------------+                               +-------------------+
                                          |                               |
           '--rfc-index ./rfc-index.json' |                               | '--rfc-referencing-urls ./rfc-referencing-urls.json'
                                          v                               v
                               +----------------------------------------------------+
                               | python: python/src/create_duckdb_persistent_db.py |
                               +----------------------------------------------------+
                                                          |
                                                          | '--dbfile ./rfc.duckdb'
                                                          v
                                                      rfc.duckdb
                                                          |
                                                          |
                                                          v
                                     +---------------------------------------------+
                                     | cppy to rfc.duckdb to 'node/src/rfc.duckdb' |
                                     +---------------------------------------------+
                                                          |
                                                          |
                                                          v
                                               +---------------------+
                                               | vite: npm run build |
                                               +---------------------+
                                                          |
                                                          |
                                                          v
                                               generated to 'node/dict/'
                                                          |
                                                          |
                               +--------------------------+--------------------------+
                               |                                                     |
                               |                                                     |
                               v                                                     v
           +--------------------------------------+                           +--------------+
           |             GitHub Pages             |                           | Docker image |
           | (.github/workflows/deploy_pages.yml) |                           | (Dockerfile) |
           +--------------------------------------+                           +--------------+
```
