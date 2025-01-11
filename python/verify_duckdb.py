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
@click.option("--dbfile", type=str, required=True, default=None, help="")
def main(dbfile: str):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: dbfile = {dbfile}")

    con = duckdb.connect(dbfile)
    con.table("rfc_entries").show()

    con.close()

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main()
