# Python scripts

## Main Scripts

これらのスクリプトは入出力に依存関係があるため、実行順があることに注意.  
詳しくは、[../README.md](../README.md) を参照されたし.

### 1. apps/trasform_rfc_index_to_json.py  

以下1つ目のURLのトップページの『Browse the RFC Index』 → 『XML』のリンクが、2つ目のURLである.
* https://www.rfc-editor.org/  
* https://www.rfc-editor.org/rfc-index.xml

このXML形式の一覧を解析し、結果をJSON形式として出力・保存する.

このスクリプトは、XMLのうち、RFCエントリに関する内容をすべて摘出し、出力する.

```bash
# Example:
$ python apps/trasform_rfc_index_to_json.py --help
Usage: trasform_rfc_index_to_json.py [OPTIONS]

Options:
  --url TEXT           XMLを取得するURLで、基本変更しない  [default: https://www.rfc-editor.org/rfc-index.xml]
  -f, --file TEXT      取得結果がファイルの場合の出力先
  -pp, --pretty-print  出力がstdoutかfileの場合、Pretty PrintなJSONで出力するかどうか
  --help               Show this message and exit.
```

```bash
# Example:
$ python apps/trasform_rfc_index_to_json.py --file rfc-index.json
```

### 2. apps/extract_rfc_referencing_urls_from_rfc_txts.py

以下1つ目のURLのトップページの『Get TAR or ZIP files of RFCs』→『All RFCs』→『TXT』→『ZIP』のリンクが2つ目のURLである
* https://www.rfc-editor.org/retrieve/bulk/
* https://www.rfc-editor.org/in-notes/tar/RFC-all.zip

このZIPには全RFCのテキスト形式のほか、一部はPDFやXMLも含まれている.  
すべての一貫しているのがTXT形式のためこれを解析し、結果をJSON形式として出力・保存する.

各TXTに含まれる他RFCへの参照を、他RFCへのURLを抽出することで取得する.  
任意のURLを抽出するわけではないことに注意.

```bash
# Example:
$ python apps/extract_rfc_referencing_urls_from_rfc_txts.py --help
Usage: extract_rfc_referencing_urls_from_rfc_txts.py [OPTIONS]

Options:
  --url TEXT      各RFC本文を取得するURLで、基本変更しない  [default: https://www.rfc-editor.org/in-notes/tar/RFC-all.zip]
  --zipfile TEXT  各RFC本文をURLから取得せずローカルのファイルを参照する場合に利用する
  --file TEXT     各RFCから他RFCへの参照URLの抽出結果を出力するファイル
  --verbose
  --help          Show this message and exit.
```

```bash
# Example:
$ python apps/extract_rfc_referencing_urls_from_rfc_txts.py --file rfc-referencing-urls.json

# ローカルのファイルを参照する場合
$ python apps/extract_rfc_referencing_urls_from_rfc_txts.py --zipfile ./RFC-all.zip --file rfc-referencing-urls.json
```

### 3. apps/create_duckdb_persistent_db.py

DuckDBのPersistent Databaseファイル(`.duckdb`など)を作成し、かつ`rfc_entries`テーブルを作成する.
* DuckDBのPersistent Databaseは以下のようなファイル拡張子が使われる
    * `.db` 
    * `.duckdb`
    * `.ddb`
* 本プロジェクトでは、わかりやすさ重視で`.duckdb`を利用する.

繰り返し実行した場合、上書きで初期化はされないことに注意.  
新しい物を作りたい場合、もとのファイルを削除したり、別のファイルで作ること.

また、オプションで追加することで、データを投入できる.

* `apps/trasform_rfc_index_to_json.py`で出力したRFC Indexを投入する(JSONファイル)
* `apps/extract_rfc_referencing_urls_from_rfc_txts.py`で出力したURL情報を下に、各RFCに他RFCへの参照情報、他RFCからの被参照情報を追加する
  * RFC Indexを投入することが前提
  * 他RFC参照情報を`references`カラムに、他RFCからの被参照情報を`referenced_by`カラムに追加する

```bash
# Example:
$ python apps/create_duckdb_persistent_db.py --help
Usage: create_duckdb_persistent_db.py [OPTIONS]

Options:
  -db, --dbfile TEXT           DuckDB Persistent Databaseの出力先のファイルパス(duckdbファイル)  [required]
  --rfc-index TEXT             trasform_rfc_index_to_json.pyの結果を指定する(JSONファイル)
  --rfc-referencing-urls TEXT  extract_rfc_referencing_urls_from_rfc_txts.pyの結果を指定する(JSONファイル)
  --verbose
  --help                       Show this message and exit.
```

```bash
# Example:
# テーブル作成 (データなし)
$ python apps/create_duckdb_persistent_db.py --dbfile rfc.duckdb 

# テーブル作成 (データも投入)
$ python apps/create_duckdb_persistent_db.py --dbfile rfc.duckdb --rfc-index rfc-index.json --rfc-referencing-urls rfc-referencing-urls.json
```

## Utility Scripts

Main Scriptsを補助するものであったり、開発の調査目的ものなど.  
実行は必須ではない.

### apps/get_all_xmlpaths_from_rfc_index.py.py  

`trasform_rfc_xmls.py`で使っているRFC一覧のXML形式のXMLファイルの、要素の一覧をXPath形式で出力するツール.  
開発時の要素名・構造の解析用.

```bash
# Example:
$ python apps/get_all_xmlpaths_from_rfc_index.py --help
Usage: get_all_xmlpaths_from_rfc_index.py [OPTIONS]

Options:
  --url TEXT  RFC一覧のXML形式が取得できるエンドポイント
  --help      Show this message and exit.
```

```bash
# Example
$ python apps/get_all_xmlpaths_from_rfc_index.py 
2025-01-13 14:19:02,921 - /workspaces/rfc-search/python/apps/get_all_xmlpaths_from_rfc_index.py:98 - INFO - app start
2025-01-13 14:19:02,921 - /workspaces/rfc-search/python/apps/get_all_xmlpaths_from_rfc_index.py:99 - INFO - command line argument: --url = https://www.rfc-editor.org/rfc-index.xml
2025-01-13 14:19:02,921 - /workspaces/rfc-search/python/apps/get_all_xmlpaths_from_rfc_index.py:102 - INFO - rfc index importing from internet: url=https://www.rfc-editor.org/rfc-index.xml
2025-01-13 14:19:05,013 - /workspaces/rfc-search/python/apps/get_all_xmlpaths_from_rfc_index.py:108 - INFO - rfc index imported from internet: url=https://www.rfc-editor.org/rfc-index.xml
/{https://www.rfc-editor.org/rfc-index}rfc-index
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry/{https://www.rfc-editor.org/rfc-index}doc-id
... (省略)
2025-01-13 14:19:05,096 - /workspaces/rfc-search/python/apps/get_all_xmlpaths_from_rfc_index.py:117 - INFO - app finished
```

### apps/verify_duckdb_persistent_db.py

`trasform_rfc_xmls.py`で作成したDuckDBのPersistent Databaseのファイルが、ちゃんと読み込めるファイルになっているか、実際に読んでみて検証するためのもの.  
デフォルトでは概要として一部列や行が省略されたテーブルが表示されるが、columnを指定することで特定の列のみ表示することもできる.

```bash
# Example
$ python apps/verify_duckdb_persistent_db.py --help
Usage: verify_duckdb_persistent_db.py [OPTIONS]

Options:
  --dbfile TEXT  DuckDBのPersistent Database形式のファイル  [required]
  --column TEXT  特定のカラムのみ出力したい場合にカラム名を指定する
  --help         Show this message and exit.
```

```bash
# Example
$ python apps/verify_duckdb_persistent_db.py --dbfile rfc.duckdb 
2025-01-13 14:20:27,973 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:27 - INFO - app start
2025-01-13 14:20:27,973 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:28 - INFO - command line argument: --dbfile = rfc.duckdb
2025-01-13 14:20:27,973 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:29 - INFO - command line argument: --column = None
2025-01-13 14:20:27,973 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:32 - INFO - duckdb database connecting: dbfile=rfc.duckdb
2025-01-13 14:20:27,978 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:48 - INFO - duckdb database connected: dbfile=rfc.duckdb
(省略)
2025-01-13 14:20:28,006 - /workspaces/rfc-search/python/apps/verify_duckdb_persistent_db.py:59 - INFO - app finished
```


## References

### DuckDB

* Connect - Persistent Database  
  https://duckdb.org/docs/connect/overview.html#persistent-database
* Python API  
  https://duckdb.org/docs/api/python/overview
* Data Types  
  https://duckdb.org/docs/sql/data_types/overview.html
