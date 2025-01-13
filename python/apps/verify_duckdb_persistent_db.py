import sys
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
    appLogger.info(f"command line argument: dbfile = {dbfile}")
    appLogger.info(f"command line argument: column = {column}")

    conn = duckdb.connect(dbfile)

    if column:
        conn.query(f"SELECT {column} FROM rfc_entries;").show()
    else:
        conn.table("rfc_entries").show()

    conn.close()

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main(max_content_width=400)
