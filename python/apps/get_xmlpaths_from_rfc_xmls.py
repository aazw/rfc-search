import sys
import logging
import xml.etree.ElementTree as ET

import click
import requests


# Making Python loggers output all messages to stdout in addition to log file
# https://stackoverflow.com/questions/14058453/making-python-loggers-output-all-messages-to-stdout-in-addition-to-log-file
formatter = logging.Formatter("%(asctime)s - %(pathname)s:%(lineno)d - %(levelname)s - %(message)s")

handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
handler.setFormatter(formatter)

appLogger = logging.getLogger(__name__)
appLogger.setLevel(logging.INFO)
appLogger.addHandler(handler)


# 実行例
"""
$ python get_rfc_all_xmlpath.py 
command line argument: url = https://www.rfc-editor.org/rfc-index.xml
/{https://www.rfc-editor.org/rfc-index}rfc-index
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry/{https://www.rfc-editor.org/rfc-index}is-also
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}bcp-entry/{https://www.rfc-editor.org/rfc-index}is-also/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}fyi-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}fyi-entry/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}fyi-entry/{https://www.rfc-editor.org/rfc-index}is-also
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}fyi-entry/{https://www.rfc-editor.org/rfc-index}is-also/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}abstract
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}abstract/{https://www.rfc-editor.org/rfc-index}p
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}area
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}author
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}author/{https://www.rfc-editor.org/rfc-index}name
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}author/{https://www.rfc-editor.org/rfc-index}title
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}current-status
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}date
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}date/{https://www.rfc-editor.org/rfc-index}day
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}date/{https://www.rfc-editor.org/rfc-index}month
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}date/{https://www.rfc-editor.org/rfc-index}year
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}doi
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}draft
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}errata-url
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}format
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}format/{https://www.rfc-editor.org/rfc-index}file-format
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}is-also
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}is-also/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}keywords
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}keywords/{https://www.rfc-editor.org/rfc-index}kw
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}obsoleted-by
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}obsoleted-by/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}obsoletes
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}obsoletes/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}page-count
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}publication-status
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}see-also
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}see-also/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}stream
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}title
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}updated-by
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}updated-by/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}updates
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}updates/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-entry/{https://www.rfc-editor.org/rfc-index}wg_acronym
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-not-issued-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}rfc-not-issued-entry/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}std-entry
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}std-entry/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}std-entry/{https://www.rfc-editor.org/rfc-index}is-also
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}std-entry/{https://www.rfc-editor.org/rfc-index}is-also/{https://www.rfc-editor.org/rfc-index}doc-id
/{https://www.rfc-editor.org/rfc-index}rfc-index/{https://www.rfc-editor.org/rfc-index}std-entry/{https://www.rfc-editor.org/rfc-index}title
"""


# 再帰的にXMLの全パスを出力する
def print_xml_paths(element, path="") -> set:

    current_path = f"{path}/{element.tag}"
    s = set([current_path])

    for child in element:
        child_set = print_xml_paths(child, current_path)
        s = s | child_set

    return s


@click.command()
@click.option("--url", type=str, default="https://www.rfc-editor.org/rfc-index.xml", help="")
def main(url: str):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: url = {url}")

    resp = requests.get(url)
    resp.raise_for_status()

    root = ET.fromstring(resp.text)
    root_set = print_xml_paths(root)

    for path in sorted(root_set):
        print(path)

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main(max_content_width=400)
