import sys
import io
import logging
import json
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import re
from urllib.parse import urlparse, ParseResult

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


@click.command()
@click.option("--url", type=str, default="https://www.rfc-editor.org/in-notes/tar/RFC-all.zip", required=False, show_default=True, help="各RFC本文を取得するURLで、基本変更しない")
@click.option("--zipfile", type=str, default=None, required=False, help="各RFC本文をURLから取得せずローカルのファイルを参照する場合に利用する")
@click.option("--output", type=str, default=None, required=False, help="各RFCから他RFCへの参照URLの抽出結果を出力するファイル")
def main(
    url: str,
    zipfile: str,
    output: str,
):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: url = {url}")
    appLogger.info(f"command line argument: zipfile = {zipfile}")
    appLogger.info(f"command line argument: output = {output}")

    input_zip: ZipFile = None
    try:
        if zipfile:
            input_zip = ZipFile(zipfile)
        else:
            resp: requests.Response = requests.get(url)
            resp.raise_for_status()

            # https://stackoverflow.com/questions/10908877/extracting-a-zipfile-to-memory
            # https://qiita.com/nujust/items/9cb4564e712720549bc1
            input_zip = ZipFile(io.BytesIO(resp.content))

    except Exception as e:
        appLogger.error(e)
        appLogger.error("zip file can not be loaded")
        sys.exit(-1)

    # ファイル名がrfxXXX.txtなもののみ
    # .txtで終わる、という判定だけだと、一部RFCドキュメントではないものも混じるため
    filename_matcher = re.compile(r"^(rfc|RFC)[0-9]+\.(txt|TXT)$")

    # URL抽出
    # https://stackoverflow.com/questions/720113/find-hyperlinks-in-text-using-python-twitter-related
    # https://stackoverflow.com/questions/839994/extracting-a-url-in-python
    url_pattern1 = re.compile(r"(https?://[^ ]+)")

    # RFC参照URLパターン1
    # Examples:
    # * http://rfc-editor.org/info/rfc6514
    # * http://www.rfc-editor.org/ien/ien23.txt
    # * http://www.rfc-editor.org/info/6325
    # * http://www.rfc-editor.org/info/bcp90
    # * http://www.rfc-editor.org/info/rfc5968
    # * http://www.rfc-editor.org/info/sstd63
    # * http://www.rfc-editor.org/info/std13
    # * http://www.rfc-editor.org/rfc/rfc7463.txt
    # * https://rfc-editor.org/info/bcp38
    # * https://www.rfc-editor.org/errata/eid7960
    # * https://www.rfc-editor.org/ien/ien119.txt
    # * https://www.rfc-editor.org/info/bcp97
    # * https://www.rfc-editor.org/info/rfc2338
    # * https://www.rfc-editor.org/info/std53
    # * https://www.rfc-editor.org/info/std80
    # * https://www.rfc-editor.org/rfc/rfc5234
    url_pattern2 = re.compile(r"(https?://(www\.)?rfc-editor\.org/(rfc|info|errata|ien|)/(rfc|bcp|std|sstd|eid|ien|)?[0-9]+(\.txt)?)")

    # RFC参照URLパターン2
    # Examples:
    # * http://ietf.org/rfc/rfc7035.txt
    # * http://tools.ietf.org/html/rfc5965
    # * http://www.ietf.org/rfc/ien/ien116.txt
    # * http://www.ietf.org/rfc/rfc2780.txt
    url_pattern3 = re.compile(r"(https?://((www|tools)\.)?ietf\.org/(rfc|html)/(rfc|ien/ien)[0-9]+(\.txt)?)")

    referencesMap: dict = {}

    for name in input_zip.namelist():
        if filename_matcher.fullmatch(name):
            # print("name: ", name)
            zip_content: bytes = input_zip.read(name)
            try:
                doc_id = name[:-4].upper()
                appLogger.info(f"doc_id: {doc_id}")

                # https://qiita.com/kojix2/items/e038de99d8a1aa3c4ba4
                # https://docs.python.org/ja/3/library/stdtypes.html#bytes.decode
                zip_content_str: str = zip_content.decode("utf-8", errors="ignore")  # Form Feedの制御文字？か何かでエラーが出るRFCがあるので、エラーを無視する
                # print(zip_content_str)

                lines = zip_content_str.splitlines()
                paragraphs = []  # パラグラフの間に空業(blank line)が入る(RFC2223で規定)
                current_paragraph: str = ""
                for line in lines:
                    if line == "":
                        if current_paragraph != "":
                            paragraphs.append(current_paragraph)
                            current_paragraph = ""
                    else:
                        if line.startswith("    ") and not line.startswith("     "):
                            line = line[4:]
                        if line.endswith("-") or line.endswith("/") or line.endswith("_") or line.endswith("?") or line.endswith("&") or line.endswith("#"):
                            current_paragraph += line.lstrip()
                        else:
                            current_paragraph += " " + line

                result: set = set()
                for paragraph in paragraphs:
                    # 簡易抽出
                    extract_urls = [items for items in url_pattern1.findall(paragraph)]

                    # 簡易抽出したものから、WebのURLをフィルタ
                    for extract_url in extract_urls:

                        # RFC参照URLパターン1
                        urls = url_pattern2.findall(extract_url)
                        if len(urls) > 0:
                            extract_url = urls[0][0]
                            appLogger.info(f"* {extract_url}")
                            result.add(extract_url)

                        # RFC参照URLパターン2
                        urls = url_pattern3.findall(extract_url)
                        if len(urls) > 0:
                            extract_url = urls[0][0]
                            appLogger.info(f"* {extract_url}")
                            result.add(extract_url)

                referencesMap[doc_id] = list(result)

            except Exception as e:
                appLogger.error(e)
                appLogger.error(f"read rfc error: file={name}")
                sys.exit(-1)

    if output:
        if output.endswith(".json"):
            with open(output, mode="w") as f:
                f.write(json.dumps(referencesMap, indent=4))

    appLogger.info("app finished")


if __name__ == "__main__":
    main(max_content_width=400)
