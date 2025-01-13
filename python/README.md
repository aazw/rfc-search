# Python scripts

## Main Scripts

これらのスクリプトは入出力に依存関係があるため、実行順があることに注意.  
詳しくは、[../README.md](../README.md) を参照されたし.

### apps/trasform_rfc_xmls.py  

以下1つ目のURLのトップページの『Browse the RFC Index』 → 『XML』のリンクが、2つ目のURLである.
* https://www.rfc-editor.org/  
* https://www.rfc-editor.org/rfc-index.xml

このXML形式の一覧を解析し、結果をJSON形式として出力・保存、あるいはDuckDBのPersistent Databaseとして保存する.

XMLのうち、RFXエントリに関する内容をすべて摘出し、出力する.

* DuckDBのPersistent Databaseは以下のようなファイル拡張子が使われる
    * `.db` 
    * `.duckdb`
    * `.ddb`
* 本プロジェクトでは、わかりやすさ重視で`.duckdb`を利用する

```bash
# Example:
$  python apps/trasform_rfc_xmls.py --help
Usage: trasform_rfc_xmls.py [OPTIONS]

Options:
  --url TEXT                     XMLを取得するURLで、基本変更しない  [default: https://www.rfc-editor.org/rfc-index.xml]
  --output [stdout|file|duckdb]  取得結果を出力するファイルフォーマット
  --file TEXT                    取得結果がファイルの場合の出力先
  --prettyprint                  出力がstdoutかfileの場合、Pretty PrintなJSONで出力するかどうか
```

```bash
# Example:
$ python apps/trasform_rfc_xmls.py --output duckdb --file ./rfc.duckdb
```

### apps/extract_urls_from_rfc_txts.py  

以下1つ目のURLのトップページの『Get TAR or ZIP files of RFCs』→『All RFCs』→『TXT』→『ZIP』のリンクが2つ目のURLである
* https://www.rfc-editor.org/retrieve/bulk/
* https://www.rfc-editor.org/in-notes/tar/RFC-all.zip

このZIPには全RFCのテキスト形式のほか、一部はPDFやXMLも含まれている.  
すべての一貫しているのがTXT形式のためこれを解析し、結果をJSON形式として出力・保存する.

各TXTに含まれる他RFCへの参照を、他RFCへのURLを抽出することで取得する.  
任意のURLを抽出するわけではないことに注意.

```bash
# Example:
$ python apps/extract_urls_from_rfc_txts.py --help
Usage: extract_urls_from_rfc_txts.py [OPTIONS]

Options:
  --url TEXT      各RFC本文を取得するURLで、基本変更しない  [default: https://www.rfc-
                  editor.org/in-notes/tar/RFC-all.zip]
  --zipfile TEXT  各RFC本文をURLから取得せずローカルのファイルを参照する場合に利用する
  --output TEXT   各RFCから他RFCへの参照URLの抽出結果を出力するファイル
  --help          Show this message and exit.
```

```bash
# Example:
$ python apps/extract_urls_from_rfc_txts.py --output ./rfc-reference-urls.json

# ローカルのファイルを参照する場合
$ python apps/extract_urls_from_rfc_txts.py --zipfile ./RFC-all.zip --output ./rfc-reference-urls.json
```

### apps/add_references_to_duckdb_persistent_db.py  

`apps/trasform_rfc_xmls.py`で出力したDuckDBのPersistent Databaseファイル(`.duckdb`など)の`rfc_entries`テーブルに、
`python apps/extract_urls_from_rfc_txts.py`で出力した他RFC参照情報ファイル(`.json`ファイル)の情報を、
他RFC参照情報を`refers`テーブルに、他RFCからの参照情報を`referred_by`テーブルに追加するためのもの.

結果は、もとのDuckDBのPersistent Databaseファイル(`.duckdb`など)に追加される形.

```bash
# Example:
$ python apps/add_references_to_duckdb_persistent_db.py --help
Usage: add_references_to_duckdb_persistent_db.py [OPTIONS]

Options:
  --dbfile TEXT  trasform_rfc_xmls.pyで出力したDuckDB形式のファイル(結果はこのファイルに追加される)
                 [required]
  --input TEXT   extract_urls_from_rfc_txts.pyで出力したJSON形式のファイル  [required]
  --help         Show this message and exit.
```

```bash
# Example:
$ python apps/add_references_to_duckdb_persistent_db.py --dbfile ./rfc.duckdb --input ./rfc-reference-urls.json
```

## Utility Scripts

Main Scriptsを補助するものであったり、開発の調査目的ものなど.  
実行は必須ではない.

### apps/get_xmlpaths_from_rfc_xmls.py  



### apps/verify_duckdb_persistent_db.py


## References

### DuckDB

* Connect - Persistent Database  
  https://duckdb.org/docs/connect/overview.html#persistent-database
* Python API  
  https://duckdb.org/docs/api/python/overview
* Data Types  
  https://duckdb.org/docs/sql/data_types/overview.html
