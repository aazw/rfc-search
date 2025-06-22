import sys
import os
import logging

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
@click.option("--dbfile", type=str, required=True, default=None, help="DuckDBのPersistent Database形式のファイル")
@click.option("--column", type=str, required=False, default=None, help="特定のカラムのみ出力したい場合にカラム名を指定する")
def main(dbfile: str, column: str):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: --dbfile = {dbfile}")
    appLogger.info(f"command line argument: --column = {column}")

    # Open DuckDB Persistent Database
    appLogger.info(f"duckdb database connecting: dbfile={dbfile}")

    conn: duckdb.DuckDBPyConnection = None
    try:
        abspath = os.path.abspath(dbfile)
        dirpath = os.path.dirname(abspath)
        if not os.path.exists(abspath):
            appLogger.error(f"database file not found: dbfile={dbfile}")
            sys.exit(-1)

        conn = duckdb.connect(abspath)
    except Exception as e:
        appLogger.error(e)
        appLogger.error(f"database connect error: dbfile={dbfile}")
        sys.exit(-1)

    appLogger.info(f"duckdb database connected: dbfile={dbfile}")

    # Show table
    if column:
        conn.query(f"SELECT {column} FROM rfc_entries;").show()
    else:
        conn.table("rfc_entries").show()

    # Close
    conn.close()

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main(max_content_width=400)
