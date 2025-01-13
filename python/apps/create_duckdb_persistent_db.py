import sys
import os
import logging
import json
import re
from typing import TypedDict, Dict, List, Optional


import click
import duckdb
import pandas as pd


# Making Python loggers output all messages to stdout in addition to log file
# https://stackoverflow.com/questions/14058453/making-python-loggers-output-all-messages-to-stdout-in-addition-to-log-file
formatter = logging.Formatter("%(asctime)s - %(pathname)s:%(lineno)d - %(levelname)s - %(message)s")

handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
handler.setFormatter(formatter)

appLogger = logging.getLogger(__name__)
appLogger.setLevel(logging.INFO)
appLogger.addHandler(handler)


# https://kdotdev.com/kdotdev/python-typed-dict
# https://qiita.com/simonritchie/items/63218b0a5c4a3d3632a1
class RFCEntry(TypedDict):
    doc_id: str
    title: str
    author: list[dict]
    date: dict
    format: list[str]
    page_count: str
    keywords: list[str]
    is_also: list[str]
    obsoletes: list[str]
    obsoleted_by: list[str]
    updates: list[str]
    updated_by: list[str]
    see_also: list[str]
    references: list[str]
    referenced_by: list[str]
    see_also: list[str]
    abstract: str
    draft: str
    current_status: str
    publication_status: str
    stream: str
    errata_url: str
    area: str
    wg_acronym: str
    doi: str


# https://qiita.com/papi_tokei/items/2a309d313bc6fc5661c3
RFCReferenceMap = Dict[str, Optional[List[str]]]

RFCReferences = Dict[str, List[str]]

RFCReferencedBy = Dict[str, List[str]]


def remove_zerofill(doc_id: str):
    return re.sub(r"^RFC0+", "RFC", doc_id)


def mappingReferences(referenceMap: RFCReferenceMap, verbose: bool = False) -> tuple[RFCReferences, RFCReferencedBy]:

    # Mapping
    rfc_pattern = re.compile(r"((rfc|RFC)[0-9]+)")

    references: RFCReferences = {}
    referenced_by: RFCReferencedBy = {}

    for doc_id, urls in referenceMap.items():
        for url in urls:
            matched = rfc_pattern.findall(url)
            if len(matched) > 0:
                refer = matched[0][0].upper()
                if verbose:
                    appLogger.info(f"{doc_id} -> {refer}")

                # 自分自身を削除
                if doc_id == refer:
                    continue

                # Referencesに追加
                if isinstance(references.get(doc_id), list):
                    references[doc_id].append(refer)
                else:
                    references[doc_id] = [refer]

                # Referenced Byに追加
                if isinstance(referenced_by.get(refer), list):
                    referenced_by[refer].append(doc_id)
                else:
                    referenced_by[refer] = [doc_id]

    return references, referenced_by


@click.command()
@click.option("-db", "--dbfile", type=str, required=True, default=None, help="DuckDB Persistent Databaseの出力先のファイルパス(duckdbファイル)")
@click.option("--rfc-index", type=str, required=False, default=None, help="trasform_rfc_index_to_json.pyの結果を指定する(JSONファイル)")
@click.option("--rfc-referencing-urls", type=str, required=False, default=None, help="extract_rfc_referencing_urls_from_rfc_txts.pyの結果を指定する(JSONファイル)")
@click.option("--verbose", is_flag=True, show_default=True, default=False, help="")
def main(dbfile: str, rfc_index: str, rfc_referencing_urls: str, verbose: bool):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: --dbfile = {dbfile}")
    appLogger.info(f"command line argument: --rfc_index = {rfc_index}")
    appLogger.info(f"command line argument: --rfc-referencing-urls = {rfc_referencing_urls}")
    appLogger.info(f"command line argument: --verbose = {verbose}")

    if not rfc_index and rfc_referencing_urls:
        appLogger.error(f"--rfc_index is required if --rfc-referencing-urls exists.")
        sys.exit(-1)

    # Open DuckDB Database
    appLogger.info(f"duckdb database connecting: dbfile={dbfile}")

    # database:
    # * :memory:
    # * rfc.duckdb
    # DuckDBへの接続
    conn: duckdb.DuckDBPyConnection = None
    try:
        abspath = os.path.abspath(dbfile)
        dirpath = os.path.dirname(abspath)
        if not os.path.exists(dirpath):
            appLogger.error(f"directory not found: path={dbfile} directory={dirpath}")
            sys.exit(-1)

        conn = duckdb.connect(abspath)
    except Exception as e:
        appLogger.error(e)
        appLogger.error(f"databse connect error: dbfile={dbfile}")
        sys.exit(-1)

    appLogger.info(f"duckdb database connected: dbfile={dbfile}")

    # Create Persistent Database
    appLogger.info(f"duckdb persistent database creating")

    # Creat table
    appLogger.info(f"creating table: table=rfc_entries")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rfc_entries (
            doc_id              TEXT,
            title               TEXT,
            author              STRUCT(
                                    name TEXT,
                                    title TEXT
                                )[],
            date                STRUCT(
                                    day   TEXT,
                                    month TEXT,
                                    year  TEXT
                                ),
            format              TEXT[],
            page_count          TEXT,
            keywords            TEXT[],
            is_also             TEXT[],
            obsoletes           TEXT[],
            obsoleted_by        TEXT[],
            updates             TEXT[],
            updated_by          TEXT[],
            see_also            TEXT[],
            "references"        TEXT[],
            referenced_by       TEXT[],
            abstract            TEXT,
            draft               TEXT,
            current_status      TEXT,
            publication_status  TEXT,    
            stream              TEXT,
            errata_url          TEXT,
            area                TEXT,
            wg_acronym          TEXT,
            doi                 TEXT
        );
        """
    )

    appLogger.info(f"created table: table=rfc_entries")

    # Insert RFC entries from index data
    # rfc_index
    if rfc_index:
        appLogger.info(f"rfc index data importing: file={rfc_index}")
        if not os.path.exists(rfc_index):
            appLogger.error(f"file not found: {rfc_index}")
            sys.exit(-1)

        rfc_entries: list[RFCEntry] = []
        try:
            abspath = os.path.abspath(rfc_index)
            with open(abspath) as f:
                # Format:  [ { ... }, { ... }, ... ]
                rfc_entries = json.load(f)
                appLogger.info(f"rfc index data imported: file={rfc_index}")
        except json.JSONDecodeError as e:
            appLogger.error(e)
            appLogger.error(f"file is not properly formatted: {rfc_index}")
            sys.exit(-1)
        except Exception as e:
            appLogger.error(e)
            appLogger.error(f"unknown error: {rfc_index}")
            sys.exit(-1)

        # rfc_referencing_urls
        rfcReferences: RFCReferences = {}
        rfcRerencedBy: RFCReferencedBy = {}
        if rfc_referencing_urls:
            appLogger.info(f"rfc referencing urls importing: file={rfc_referencing_urls}")

            if not os.path.exists(rfc_referencing_urls):
                appLogger.error(f"file not found: {rfc_referencing_urls}")
                sys.exit(-1)

            referencesMap: RFCReferenceMap = None
            try:
                abspath = os.path.abspath(rfc_referencing_urls)
                with open(abspath) as f:
                    # Format:  { "<doc_id>": [ "<other_doc_id>", ... ], ... }
                    referencesMap = json.load(f)
                    appLogger.info(f"rfc referencing urls imported: file={rfc_referencing_urls}")
            except json.JSONDecodeError as e:
                appLogger.error(e)
                appLogger.error(f"file is not properly formatted: {rfc_referencing_urls}")
                sys.exit(-1)
            except Exception as e:
                appLogger.error(e)
                appLogger.error(f"unknown error: {rfc_referencing_urls}")
                sys.exit(-1)

            # 解析
            appLogger.info(f"rfc referencing urls preparing")

            rfcReferences, rfcRerencedBy = mappingReferences(referencesMap, verbose=verbose)

            appLogger.info(f"rfc referencing urls prepared")

        # データの正規化
        appLogger.info(f"rfc entries normalizing")

        # 実際のデータには含まれないカラムなので、そのままDuckDBに投入するとエラーが起こる
        # 例: duckdb.duckdb.BinderException: Binder Error: table rfc_entries has 24 columns but 22 values were supplie
        #
        # references, referenced_byを追加する
        #
        # Python3.7以降、dictの順序は保証され、DuckDBにpd.DataFrameで投入する際はこの順序を利用しているため、
        # カラムの定義順とdictのキー・値の順番を一致させる必要がある.
        # つまり、dictもreferences, referenced_byを最後尾ではなく、カラムの定義位置(see_alsoの後)で定義する必要がある
        rfc_entries_nomalized: list[RFCEntry] = []
        for entry in rfc_entries:
            doc_id = remove_zerofill(entry["doc_id"])
            is_also = [remove_zerofill(item) for item in entry["is_also"]] if entry["is_also"] else None
            obsoletes = [remove_zerofill(item) for item in entry["obsoletes"]] if entry["obsoletes"] else None
            obsoleted_by = [remove_zerofill(item) for item in entry["obsoleted_by"]] if entry["obsoleted_by"] else None
            updates = [remove_zerofill(item) for item in entry["updates"]] if entry["updates"] else None
            updated_by = [remove_zerofill(item) for item in entry["updated_by"]] if entry["updated_by"] else None
            see_also = [remove_zerofill(item) for item in entry["see_also"]] if entry["see_also"] else None
            references = rfcReferences.get(doc_id, None)
            referenced_by = rfcRerencedBy.get(doc_id, None)

            if references:
                references = sorted(references, key=lambda x: int(re.sub(r"^RFC0*", "", x)))

            if referenced_by:
                referenced_by = sorted(referenced_by, key=lambda x: int(re.sub(r"^RFC0*", "", x)))

            rfc_entries_nomalized.append(
                {
                    "doc_id": doc_id,
                    "title": entry["title"],
                    "author": entry["author"],
                    "date": entry["date"],
                    "format": entry["format"],
                    "page_count": entry["page_count"],
                    "keywords": entry["keywords"],
                    "is_also": is_also,
                    "obsoletes": obsoletes,
                    "obsoleted_by": obsoleted_by,
                    "updates": updates,
                    "updated_by": updated_by,
                    "see_also": see_also,
                    "references": references,  # Here
                    "referenced_by": referenced_by,  # Here
                    "abstract": entry["abstract"],
                    "draft": entry["draft"],
                    "current_status": entry["current_status"],
                    "publication_status": entry["publication_status"],
                    "stream": entry["stream"],
                    "errata_url": entry["errata_url"],
                    "area": entry["area"],
                    "wg_acronym": entry["wg_acronym"],
                    "doi": entry["doi"],
                }
            )

        appLogger.info(f"rfc entries normalized")

        # Insert rfc entries
        appLogger.info(f"rfc entries inserting: table=rfc_entries")
        df = pd.DataFrame(rfc_entries_nomalized)

        # DataFrameを使ってテーブルにINSERT
        conn.register("temp_table", df)
        conn.execute("INSERT INTO rfc_entries SELECT * FROM temp_table;")

        appLogger.info(f"rfc entries inserted: table=rfc_entries")

    # Finalize
    conn.close()

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main(max_content_width=400)
