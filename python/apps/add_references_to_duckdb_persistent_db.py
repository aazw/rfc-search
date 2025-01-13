import sys
import logging
import json
import re

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


@click.command()
@click.option("--dbfile", type=str, required=True, default=None, help="trasform_rfc_xmls.pyで出力したDuckDB形式のファイル(結果はこのファイルに追加される)")
@click.option("--input", type=str, required=True, default=None, help="extract_urls_from_rfc_txts.pyで出力したJSON形式のファイル")
def main(dbfile: str, input: str):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: dbfile = {dbfile}")
    appLogger.info(f"command line argument: input = {input}")

    # DuckDB Persistent Databaseの読み込み
    conn: duckdb.DuckDBPyConnection = None
    try:
        conn = duckdb.connect(dbfile)
    except Exception as e:
        appLogger.error(e)
        appLogger.error(f"json file read error: file={input}")
        sys.exit(-1)

    # jsonファイルの読み込み
    referencesMap: dict = {}
    with open(input) as f:
        try:
            referencesMap = json.load(f)
        except Exception as e:
            appLogger.error(e)
            appLogger.error(f"json file read error: file={input}")
            sys.exit(-1)

    # Mapping
    rfc_pattern = re.compile(r"((rfc|RFC)[0-9]+)")

    referes: dict = {}
    referred_by: dict = {}

    for doc_id, urls in referencesMap.items():
        for url in urls:
            matched = rfc_pattern.findall(url)
            if len(matched) > 0:
                refer = matched[0][0].upper()
                print(f"{doc_id} -> {refer}")

                # 自分自身を削除
                if doc_id == refer:
                    continue

                # Refersに追加
                if isinstance(referes.get(doc_id), list):
                    referes[doc_id].append(refer)
                else:
                    referes[doc_id] = [refer]

                # Referred Byに追加
                if isinstance(referred_by.get(refer), list):
                    referred_by[refer].append(doc_id)
                else:
                    referred_by[refer] = [doc_id]

    # Insert
    for doc_id, items in referes.items():
        conn.execute("UPDATE rfc_entries SET refers = ? WHERE doc_id = ?;", (sorted(items, key=lambda x: int(re.sub(r"^RFC0*", "", x))), doc_id))

    for doc_id, items in referred_by.items():
        conn.execute("UPDATE rfc_entries SET referred_by = ? WHERE doc_id = ?;", (sorted(items, key=lambda x: int(re.sub(r"^RFC0*", "", x))), doc_id))

    # Finalize
    conn.close()

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main()
