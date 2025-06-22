import os
import sys
import logging
import json

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


@click.command()
@click.option("--url", type=str, default="https://www.rfc-editor.org/rfc-index.xml", required=False, show_default=True, help="XMLを取得するURLで、基本変更しない")
@click.option("-f", "--file", type=str, required=False, default=None, help="取得結果がファイルの場合の出力先")
@click.option("-pp", "--pretty-print", is_flag=True, show_default=True, default=False, help="出力がstdoutかfileの場合、Pretty PrintなJSONで出力するかどうか")
def main(url: str, file: str, pretty_print: bool):
    appLogger.info(f"app start")
    appLogger.info(f"command line argument: --url = {url}")
    appLogger.info(f"command line argument: --file = {file}")
    appLogger.info(f"command line argument: --pretty-print = {pretty_print}")

    if file:
        abspath = os.path.abspath(file)
        dirpath = os.path.dirname(abspath)
        if not os.path.exists(dirpath):
            appLogger.error(f"directory not found: path={file} directory={dirpath}")
            sys.exit(-1)

    # RFC Indexの取得
    appLogger.info(f"rfc index importing from internet: url={url}")

    resp = requests.get(url)
    resp.raise_for_status()

    # RFC IndexをElement Treeで読み込む
    root = ET.fromstring(resp.text)
    appLogger.info(f"rfc index imported from internet: url={url}")

    namespaces = {
        "": "https://www.rfc-editor.org/rfc-index",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
    }

    rfc_entries = []
    for entry in root.findall("rfc-entry", namespaces):

        # <rfc-entry>
        #     <doc-id>RFC0001</doc-id>
        #     <title>Host Software</title>
        #     <author>
        #         <name>S. Crocker</name>
        #     </author>
        #     <date>
        #         <month>April</month>
        #         <year>1969</year>
        #     </date>
        #     <format>
        #         <file-format>ASCII</file-format>
        #         <file-format>HTML</file-format>
        #     </format>
        #     <page-count>11</page-count>
        #     <current-status>UNKNOWN</current-status>
        #     <publication-status>UNKNOWN</publication-status>
        #     <stream>Legacy</stream>
        #     <doi>10.17487/RFC0001</doi>
        # </rfc-entry>

        # <rfc-entry>
        #     <doc-id>RFC0010</doc-id>
        #     <title>Documentation conventions</title>
        #     <author>
        #         <name>S.D. Crocker</name>
        #     </author>
        #     <date>
        #         <month>July</month>
        #         <year>1969</year>
        #     </date>
        #     <format>
        #         <file-format>ASCII</file-format>
        #         <file-format>HTML</file-format>
        #     </format>
        #     <page-count>3</page-count>
        #     <obsoletes>
        #         <doc-id>RFC0003</doc-id>
        #     </obsoletes>
        #     <obsoleted-by>
        #         <doc-id>RFC0016</doc-id>
        #     </obsoleted-by>
        #     <updated-by>
        #         <doc-id>RFC0024</doc-id>
        #         <doc-id>RFC0027</doc-id>
        #         <doc-id>RFC0030</doc-id>
        #     </updated-by>
        #     <current-status>UNKNOWN</current-status>
        #     <publication-status>UNKNOWN</publication-status>
        #     <stream>Legacy</stream>
        #     <doi>10.17487/RFC0010</doi>
        # </rfc-entry>

        # <rfc-entry>
        #     <doc-id>RFC9703</doc-id>
        #     <title>Label Switched Path (LSP) Ping/Traceroute for Segment Routing (SR) Egress Peer Engineering (EPE) Segment Identifiers (SIDs) with MPLS Data Plane</title>
        #     <author>
        #         <name>S. Hegde</name>
        #     </author>
        #     <author>
        #         <name>M. Srivastava</name>
        #     </author>
        #     <author>
        #         <name>K. Arora</name>
        #     </author>
        #     <author>
        #         <name>S. Ninan</name>
        #     </author>
        #     <author>
        #         <name>X. Xu</name>
        #     </author>
        #     <date>
        #         <month>December</month>
        #         <year>2024</year>
        #     </date>
        #     <format>
        #         <file-format>HTML</file-format>
        #         <file-format>TEXT</file-format>
        #         <file-format>PDF</file-format>
        #         <file-format>XML</file-format>
        #     </format>
        #     <page-count>15</page-count>
        #     <keywords>
        #         <kw>OAM</kw>
        #         <kw>EPE</kw>
        #         <kw>BGP-LS</kw>
        #         <kw>BGP</kw>
        #         <kw>SPRING</kw>
        #         <kw>SDN</kw>
        #         <kw>SID</kw>
        #     </keywords>
        #     <abstract><p>Egress Peer Engineering (EPE) is an application of Segment Routing (SR) that solves the problem of egress peer selection.  The SR-based BGP-EPE solution allows a centralized controller, e.g., a Software-Defined Network (SDN) controller, to program any egress peer.  The EPE solution requires the node or the SDN controller to program 1) the PeerNode Segment Identifier (SID) describing a session between two nodes, 2) the PeerAdj SID describing the link or links that are used by the sessions between peer nodes, and 3) the PeerSet SID describing any connected interface to any peer in the related group.  This document provides new sub-TLVs for EPE-SIDs that are used in the Target FEC Stack TLV (Type 1) in MPLS Ping and Traceroute procedures.</p></abstract>
        #     <draft>draft-ietf-mpls-sr-epe-oam-19</draft>
        #     <current-status>PROPOSED STANDARD</current-status>
        #     <publication-status>PROPOSED STANDARD</publication-status>
        #     <stream>IETF</stream>
        #     <area>rtg</area>
        #     <wg_acronym>mpls</wg_acronym>
        #     <doi>10.17487/RFC9703</doi>
        # </rfc-entry>

        # doc-id
        doc_id_entry = entry.find("doc-id", namespaces)
        doc_id = getattr(doc_id_entry, "text", None)

        # title
        title_entry = entry.find("title", namespaces)
        title = getattr(title_entry, "text", None)

        # author
        author = []
        for author_entry in entry.findall("author", namespaces):
            item = {}

            # author/name
            author_name_entry = author_entry.find("name", namespaces)
            author_name = getattr(author_name_entry, "text", None)
            item["name"] = author_name

            # author/title
            author_title_entry = author_entry.find("title", namespaces)
            author_title = getattr(author_title_entry, "text", None)
            item["title"] = author_title

            author.append(item)

        # date
        date_entry = entry.find("date", namespaces)
        date = {}

        # date/day
        date_day_entry = date_entry.find("day", namespaces)
        date_day = getattr(date_day_entry, "text", None)
        date["day"] = date_day

        # date/month
        date_month_entry = date_entry.find("month", namespaces)
        date_month = getattr(date_month_entry, "text", None)
        date["month"] = date_month

        # date/year
        date_year_entry = date_entry.find("year", namespaces)
        date_year = getattr(date_year_entry, "text", None)
        date["year"] = date_year

        # format
        format_entry = entry.find("format", namespaces)
        format = None

        # format/file-format
        if format_entry:
            format = []
            for file_format_entry in format_entry.findall("file-format", namespaces):
                file_format = getattr(file_format_entry, "text", None)
                format.append(file_format)

        # page-count
        page_count_entry = entry.find("page-count", namespaces)
        page_count = getattr(page_count_entry, "text", None)

        # keywords
        keywords_entry = entry.find("keywords", namespaces)
        keywords = None

        # keywords/kw
        if keywords_entry:
            keywords = []
            for keywords_kw_entry in keywords_entry.findall("kw", namespaces):
                keywords_kw = getattr(keywords_kw_entry, "text", None)
                keywords.append(keywords_kw)

        # is-also
        is_also_entry = entry.find("is-also", namespaces)
        is_also = None

        # is-also/doc-id
        if is_also_entry:
            is_also = []
            for is_also_doc_id_entry in is_also_entry.findall("doc-id", namespaces):
                is_also_doc_id = getattr(is_also_doc_id_entry, "text", None)
                is_also.append(is_also_doc_id)

        # obsoletes
        obsoletes_entry = entry.find("obsoletes", namespaces)
        obsoletes = None

        # obsoletes/doc-id
        if obsoletes_entry:
            obsoletes = []
            for obsoletes_doc_id_entry in obsoletes_entry.findall("doc-id", namespaces):
                obsoletes_doc_id = getattr(obsoletes_doc_id_entry, "text", None)
                obsoletes.append(obsoletes_doc_id)

        # obsoleted-by
        obsoleted_by_entry = entry.find("obsoleted-by", namespaces)
        obsoleted_by = None

        # obsoleted-by/doc-id
        if obsoleted_by_entry:
            obsoleted_by = []
            for obsoleted_by_doc_id_entry in entry.findall("doc-id", namespaces):
                obsoleted_by_doc_id = getattr(obsoleted_by_doc_id_entry, "text", None)
                obsoleted_by.append(obsoleted_by_doc_id)

        # updates
        updates_entry = entry.find("updates", namespaces)
        updates = None

        # updates/doc-id
        if updates_entry:
            updates = []
            for updates_doc_id_entry in updates_entry.findall("doc-id", namespaces):
                updates_doc_id = getattr(updates_doc_id_entry, "text", None)
                updates.append(updates_doc_id)

        # updated-by
        updated_by_entry = entry.find("updated-by", namespaces)
        updated_by = None

        # updated-by/doc-id
        if updated_by_entry:
            updated_by = []
            for updated_by_doc_id_entry in updated_by_entry.findall("doc-id", namespaces):
                updated_by_doc_id = getattr(updated_by_doc_id_entry, "text", None)
                updated_by.append(updated_by_doc_id)

        # abstract
        abstract_entry = entry.find("abstract", namespaces)
        abstract = getattr(abstract_entry, "text", None)
        if abstract_entry and not abstract:
            abstract_p_entry = abstract_entry.find("p", namespaces)
            abstract = getattr(abstract_p_entry, "text", None)

        # see_also
        see_also_entry = entry.find("see-also", namespaces)
        see_also = None

        # see_also_doc_id
        if see_also_entry:
            see_also = []
            for see_also_doc_id_entry in see_also_entry.find("doc-id", namespaces):
                see_also_doc_id = getattr(see_also_doc_id_entry, "text", None)
                see_also.append(see_also_doc_id)

        # draft
        draft_entry = entry.find("draft", namespaces)
        draft = getattr(draft_entry, "text", None)

        # current-status
        current_status_entry = entry.find("current-status", namespaces)
        current_status = getattr(current_status_entry, "text", None)

        # publication-status
        publication_status_entry = entry.find("publication-status", namespaces)
        publication_status = getattr(publication_status_entry, "text", None)

        # stream
        stream_entry = entry.find("stream", namespaces)
        stream = getattr(stream_entry, "text", None)

        # errata_url
        errata_url_entry = entry.find("errata-url", namespaces)
        errata_url = getattr(errata_url_entry, "text", None)

        # area
        area_entry = entry.find("area", namespaces)
        area = getattr(area_entry, "text", None)

        # wg_acronym
        wg_acronym_entry = entry.find("wg_acronym", namespaces)
        wg_acronym = getattr(wg_acronym_entry, "text", None)

        # doi
        doi_entry = entry.find("doi", namespaces)
        doi = getattr(doi_entry, "text", None)

        rfc_entry = {
            "doc_id": doc_id,
            "title": title,
            "author": author,
            "date": date,
            "format": format,
            "page_count": page_count,
            "keywords": keywords,
            "is_also": is_also,
            "obsoletes": obsoletes,
            "obsoleted_by": obsoleted_by,
            "updates": updates,
            "updated_by": updated_by,
            "see_also": see_also,
            "abstract": abstract,
            "draft": draft,
            "current_status": current_status,
            "publication_status": publication_status,
            "stream": stream,
            "errata_url": errata_url,
            "area": area,
            "wg_acronym": wg_acronym,
            "doi": doi,
        }

        rfc_entries.append(rfc_entry)

    if file:
        # File
        abspath = os.path.abspath(file)
        with open(abspath, mode="w") as f:
            appLogger.info(f"data exporting to the file: file={file} filepath={abspath}")

            if pretty_print:
                f.write(json.dumps(rfc_entries, indent=4))
            else:
                f.write(json.dumps(rfc_entries))

            appLogger.info(f"data exported to the file: file={file} filepath={abspath}")
    else:
        # Stdout
        if pretty_print:
            print(json.dumps(rfc_entries, indent=4))
        else:
            print(rfc_entries)

    appLogger.info(f"app finished")


if __name__ == "__main__":
    main(max_content_width=400)
