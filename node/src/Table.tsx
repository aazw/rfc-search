import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

import dbUrl from "./rfc.duckdb?url";

import React, { useState, useEffect } from "react";

import "./Table.css";

function convertMonthExpression(month: string): string {
  switch (month) {
    case "January":
    case "Jan":
      return "01";
    case "February":
    case "Feb":
      return "02";
    case "March":
    case "Mar":
      return "03";
    case "April":
    case "Apr":
      return "04";
    case "May":
      return "05";
    case "June":
    case "Jun":
      return "06";
    case "July":
    case "Jul":
      return "07";
    case "August":
    case "Aug":
      return "08";
    case "September":
    case "Sep":
      return "09";
    case "October":
    case "Oct":
      return "10";
    case "November":
    case "Nov":
      return "11";
    case "December":
    case "Dec":
      return "12";
  }
  return month;
}

interface RFCEntry {
  doc_id: string;
  title: string;
  author: {
    name: string;
    title: string;
  }[];
  date: {
    year: string;
    month: string;
    day: string;
  };
  format: string[];
  page_count: string;
  keywords: string[];
  is_also: string[];
  obsoletes: string[];
  obsoleted_by: string[];
  updates: string[];
  updated_by: string[];
  see_also: string[];
  references: string[];
  referenced_by: string[];
  abstract: string;
  draft: string;
  current_status: string;
  publication_status: string;
  stream: string;
  errata_url: string;
  area: string;
  wg_acronym: string;
  doi: string;
}

async function initDuckDB(updateProgress: ((loaded: number) => void) | null = null): Promise<duckdb.AsyncDuckDB | null> {
  if (updateProgress) {
    updateProgress(-1);
  }

  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: duckdb_wasm,
      mainWorker: mvp_worker,
    },
    eh: {
      mainModule: duckdb_wasm_eh,
      mainWorker: eh_worker,
    },
  };

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  //   const logger = new duckdb.ConsoleLogger();
  const logger = new duckdb.VoidLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  // ファイルを取得
  const response = await fetch(dbUrl);

  // 全体のコンテンツサイズを取得
  const contentLength = response.headers.get("Content-Length");

  if (response.body && contentLength) {
    if (updateProgress) {
      updateProgress(0);
    }

    // プログレスバーを表示する実装
    const totalSize = parseInt(contentLength, 10);
    let loadedSize = 0;

    // 空の Uint8Array を作成してデータを保持
    const arrayBuffer = new Uint8Array(totalSize);

    // ストリームリーダーを取得
    const reader = response.body.getReader();

    // ArrayBuffer に書き込む位置を管理
    let offset = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      // 読み取ったデータを ArrayBuffer に書き込む
      arrayBuffer.set(value, offset);
      offset += value.length;

      // プログレスを更新
      loadedSize += value.length;

      // updateProgress(loadedSize);
      const percentage = (loadedSize / totalSize) * 100;
      if (updateProgress) {
        updateProgress(percentage);
      }
    }

    await db.registerFileBuffer("rfc_duckdb", new Uint8Array(arrayBuffer));
  } else {
    // 通常の実装
    await db.registerFileBuffer("rfc_duckdb", new Uint8Array(await response.arrayBuffer()));
  }

  // await db.registerFileBuffer("rfc_duckdb", new Uint8Array(await response.arrayBuffer()));
  await db.open({
    // これ必須
    path: "rfc_duckdb",
  });

  return db;
}

type GetRFCEntriesResuest = {
  db: duckdb.AsyncDuckDB;
  searchText?: string;
  limit?: number;
  offset?: number;
};

type GetRFCEntriesResult = {
  Total: number;
  RFCEntries: RFCEntry[];
};

async function getRFCEntries({ db, searchText = "", limit = 100, offset = 0 }: GetRFCEntriesResuest): Promise<GetRFCEntriesResult> {
  const conn = await db.connect();
  console.log("Database connected!");

  let queryString: string;
  let params: unknown[] = [];

  // get Total size
  queryString = `
            SELECT 
              count(*) AS total
            FROM rfc_entries`;

  if (searchText != "") {
    queryString = `
            SELECT 
                count(*) as total
            FROM rfc_entries
            WHERE 
                doc_id                              LIKE ? or
                title                               LIKE ? or
                len(list_filter(author, x -> x.name LIKE ? or x.title LIKE ? )) >= 1 or
                date.year                           LIKE ? or
                date.month                          LIKE ? or
                date.day                            LIKE ? or
                array_to_string(format, ' ')        LIKE ? or
                page_count                          LIKE ? or
                array_to_string(keywords, ' ')      LIKE ? or
                array_to_string(is_also, ' ')       LIKE ? or
                array_to_string(obsoletes, ' ')     LIKE ? or
                array_to_string(obsoleted_by, ' ')  LIKE ? or
                array_to_string(updates, ' ')       LIKE ? or
                array_to_string(updated_by, ' ')    LIKE ? or
                array_to_string(see_also, ' ')      LIKE ? or
                array_to_string("references", ' ')  LIKE ? or
                array_to_string(referenced_by, ' ') LIKE ? or
                abstract                            LIKE ? or
                draft                               LIKE ? or
                current_status                      LIKE ? or
                publication_status                  LIKE ? or
                stream                              LIKE ? or
                errata_url                          LIKE ? or
                area                                LIKE ? or
                wg_acronym                          LIKE ? or
                doi                                 LIKE ?`;
    params = [
      `%${searchText}%`, // doc_id
      `%${searchText}%`, // title
      `%${searchText}%`, // author.name
      `%${searchText}%`, // author.title
      `%${searchText}%`, // date.year
      `%${searchText}%`, // date.month
      `%${searchText}%`, // date.day
      `%${searchText}%`, // format
      `%${searchText}%`, // page_count
      `%${searchText}%`, // keywords
      `%${searchText}%`, // is_also
      `%${searchText}%`, // obsoletes
      `%${searchText}%`, // obsoleted_by
      `%${searchText}%`, // updates
      `%${searchText}%`, // updated_by
      `%${searchText}%`, // see_also
      `%${searchText}%`, // references
      `%${searchText}%`, // referenced_by
      `%${searchText}%`, // abstract
      `%${searchText}%`, // draft
      `%${searchText}%`, // current_status
      `%${searchText}%`, // publication_status
      `%${searchText}%`, // stream
      `%${searchText}%`, // errata_url
      `%${searchText}%`, // area
      `%${searchText}%`, // wg_acronym
      `%${searchText}%`, // doi
    ];
  }

  const stmtTotal = await conn.prepare(queryString);

  const resultTotal = await stmtTotal.query(...params);

  // totalが、9494nのようなn付き(=BigInt型)で返ってくるから、それをnumberに変換する
  let total = -1;
  if (resultTotal.numRows > 0) {
    interface resultIF {
      total?: bigint;
    }
    const totalRow: resultIF | null | undefined = resultTotal.get(0)?.toJSON();
    const totalNBigInt: bigint = totalRow?.total ?? 0n;
    total = Number(totalNBigInt);
  }
  // console.log("total: ", total);

  // get RFC entries
  queryString = `
            SELECT 
                doc_id, 
                title, 
                author, 
                date, 
                format, 
                page_count, 
                keywords, 
                is_also, 
                obsoletes, 
                obsoleted_by, 
                updates, 
                updated_by, 
                see_also, 
                "references",
                referenced_by,
                abstract, 
                draft, 
                current_status, 
                publication_status, 
                stream, 
                errata_url, 
                area, 
                wg_acronym, 
                doi 
            FROM rfc_entries
            ORDER BY CAST(regexp_replace(doc_id, '^(RFC|rfc)', '') AS numeric) DESC
            LIMIT ?
            OFFSET ?;`;
  params = [limit, offset];

  if (searchText != "") {
    queryString = `
            SELECT 
                doc_id, 
                title, 
                author, 
                date, 
                format, 
                page_count, 
                keywords, 
                is_also, 
                obsoletes, 
                obsoleted_by, 
                updates, 
                updated_by,
                see_also, 
                "references",
                referenced_by, 
                abstract, 
                draft, 
                current_status, 
                publication_status, 
                stream, 
                errata_url, 
                area, 
                wg_acronym, 
                doi 
            FROM rfc_entries
            WHERE 
                doc_id                              LIKE ? or
                title                               LIKE ? or
                len(list_filter(author, x -> x.name LIKE ? or x.title LIKE ? )) >= 1 or
                date.year                           LIKE ? or
                date.month                          LIKE ? or
                date.day                            LIKE ? or
                array_to_string(format, ' ')        LIKE ? or
                page_count                          LIKE ? or
                array_to_string(keywords, ' ')      LIKE ? or
                array_to_string(is_also, ' ')       LIKE ? or
                array_to_string(obsoletes, ' ')     LIKE ? or
                array_to_string(obsoleted_by, ' ')  LIKE ? or
                array_to_string(updates, ' ')       LIKE ? or
                array_to_string(updated_by, ' ')    LIKE ? or
                array_to_string(see_also, ' ')      LIKE ? or
                array_to_string("references", ' ')  LIKE ? or
                array_to_string(referenced_by, ' ') LIKE ? or
                abstract                            LIKE ? or
                draft                               LIKE ? or
                current_status                      LIKE ? or
                publication_status                  LIKE ? or
                stream                              LIKE ? or
                errata_url                          LIKE ? or
                area                                LIKE ? or
                wg_acronym                          LIKE ? or
                doi                                 LIKE ?
            ORDER BY doc_id DESC
            LIMIT ?
            OFFSET ?;`;
    params = [
      `%${searchText}%`, // doc_id
      `%${searchText}%`, // title
      `%${searchText}%`, // author.name
      `%${searchText}%`, // author.title
      `%${searchText}%`, // date.year
      `%${searchText}%`, // date.month
      `%${searchText}%`, // date.day
      `%${searchText}%`, // format
      `%${searchText}%`, // page_count
      `%${searchText}%`, // keywords
      `%${searchText}%`, // is_also
      `%${searchText}%`, // obsoletes
      `%${searchText}%`, // obsoleted_by
      `%${searchText}%`, // updates
      `%${searchText}%`, // updated_by
      `%${searchText}%`, // see_also
      `%${searchText}%`, // references
      `%${searchText}%`, // referenced_by
      `%${searchText}%`, // abstract
      `%${searchText}%`, // draft
      `%${searchText}%`, // current_status
      `%${searchText}%`, // publication_status
      `%${searchText}%`, // stream
      `%${searchText}%`, // errata_url
      `%${searchText}%`, // area
      `%${searchText}%`, // wg_acronym
      `%${searchText}%`, // doi
      limit,
      offset,
    ];
  }

  const stmtEntries = await conn.prepare(queryString);

  const resultEntries = await stmtEntries.query(...params);

  const entries: RFCEntry[] | null = resultEntries.toArray();
  //   console.log("entries: ", records);

  await conn.close();

  const ret = {
    Total: total,
    RFCEntries: entries,
  };
  return ret;
}

type Condition = {
  SearchText?: string;
  CurrentPage: number;
};

// propをObject Destructuringで展開して受け取る
export default function Table() {
  // 第1引数: 初期値
  // 第1戻り値: 現在の値
  // 第2戻り値: 状態を変更する関数

  // DuckDB Persistent Databaseのファイルのダウンロード状態
  // -2: : initial state
  // -1 start fetching
  // 0-100: loading
  const [progress, updateProgress] = useState<number>(-2);

  // DuckDB WASMのデータベースオブジェクト
  const [db, setDB] = useState<duckdb.AsyncDuckDB | null>(null);

  // 現在の検索条件・ページ
  const [condition, setCondition] = useState<Condition>({ SearchText: "", CurrentPage: 1 });

  // DuckDBから取得したデータ
  const [result, setResult] = useState<GetRFCEntriesResult | null>(null);

  // 第1引数: 副作用
  // 第2引数: 依存配列
  useEffect(() => {
    (async () => {
      const db = await initDuckDB(updateProgress);
      setDB(db);
    })().catch((error) => {
      console.error(error);
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (!db) return;
      const result = await getRFCEntries({
        db: db,
        searchText: condition.SearchText,
        offset: (condition.CurrentPage - 1) * 100,
        limit: 100,
      });
      setResult(result);
    })().catch((error) => {
      console.error(error);
    });
  }, [db, condition]);

  // イベントハンドラ
  const onSearchTextValueChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const newCondition: Condition = {
      SearchText: newValue,
      CurrentPage: 1,
    };
    setCondition(newCondition);
  };

  const pageSize = 100;
  const getLastPage = (total?: number): number => {
    if (total == null || total <= 0) return 1;
    return Math.floor(total / pageSize) + (total % pageSize > 0 ? 1 : 0);
  };

  const onPreviousPageButtonClicked = () => {
    if (condition.CurrentPage > 1) {
      const newCondition: Condition = {
        SearchText: condition.SearchText,
        CurrentPage: condition.CurrentPage - 1,
      };
      setCondition(newCondition);
    }
  };

  const onNextPageButtonClicked = () => {
    if (condition.CurrentPage < getLastPage(result?.Total)) {
      const newCondition: Condition = {
        SearchText: condition.SearchText,
        CurrentPage: condition.CurrentPage + 1,
      };
      setCondition(newCondition);
    }
  };

  const onSpecificPageButtonClicked = (newPage: number) => {
    const newCondition: Condition = {
      SearchText: condition.SearchText,
      CurrentPage: newPage,
    };
    setCondition(newCondition);
  };

  return (
    <>
      {result == null && (
        <>
          {progress == -2 && <div className="mx-2">Before Loading</div>}
          {progress == -1 && <div className="mx-2">Start Loading </div>}
          {progress > -1 && <div className="mx-2">Now Loading ... {progress.toFixed(2)} %</div>}
        </>
      )}
      {result != null && (
        <div className="flex flex-col h-full w-full">
          <div className="flex-none flex flex-col lg:flex-row mx-2">
            <div className="basis-full lg:grow lg:relative">
              <input
                className="border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                type="text"
                placeholder="Search"
                onChange={onSearchTextValueChanged}
              ></input>
            </div>
            <div className="basis-full lg:basis-autolg:relative lg:flex-none flex flex-col lg:flex-row">
              <span className="basis-full lg:basis-auto lg:flex-none mt-2 lg:mt-0 py-2 lg:px-4 text-xs lg:text-base">
                {result?.Total > 0 && (
                  <>
                    Showing {(condition.CurrentPage - 1) * 100 + 1} - {condition.CurrentPage * 100 > result?.Total ? result?.Total : condition.CurrentPage * 100} of {result?.Total}
                  </>
                )}
                {result?.Total == 0 && <>No data</>}
              </span>
              <div className="basis-full lg:basis-auto lg:grow-0 mt-2 lg:mt-0">
                {/* '<' */}
                {condition.CurrentPage > 1 && (
                  <button onClick={onPreviousPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 rounded-l cursor-pointer">
                    &lt;
                  </button>
                )}
                {condition.CurrentPage == 1 && (
                  <button onClick={onPreviousPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 rounded-l cursor-not-allowed">
                    &lt;
                  </button>
                )}
                {/* 1 */}
                {condition.CurrentPage != 1 && (
                  <button className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-pointer" onClick={() => onSpecificPageButtonClicked(1)}>
                    1
                  </button>
                )}
                {condition.CurrentPage == 1 && <button className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-not-allowed">1</button>}
                {/* ... */}
                {condition.CurrentPage >= 4 && (
                  <button disabled className="bg-gray-300 font-bold py-2 px-2 lg:px-4">
                    ...
                  </button>
                )}
                {/* Previous Page (Current Page -1) */}
                {condition.CurrentPage >= 3 && (
                  <button
                    className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-pointer"
                    onClick={() => onSpecificPageButtonClicked(condition.CurrentPage - 1)}
                  >
                    {condition.CurrentPage - 1}
                  </button>
                )}
                {/* Current Page  */}
                {condition.CurrentPage >= 2 && condition.CurrentPage <= getLastPage(result?.Total) - 1 && (
                  <button className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-not-allowed">{condition.CurrentPage}</button>
                )}
                {/* Next Page (Current Page + 1) */}
                {condition.CurrentPage <= getLastPage(result?.Total) - 2 && (
                  <button
                    className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-pointer"
                    onClick={() => onSpecificPageButtonClicked(condition.CurrentPage + 1)}
                  >
                    {condition.CurrentPage + 1}
                  </button>
                )}
                {/* ... */}
                {condition.CurrentPage <= getLastPage(result?.Total) - 3 && (
                  <button disabled className="bg-gray-300 font-bold py-2 px-2 lg:px-4">
                    ...
                  </button>
                )}
                {/* Last Page */}
                {1 < getLastPage(result?.Total) && condition.CurrentPage != getLastPage(result?.Total) && (
                  <button
                    className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-pointer"
                    onClick={() => onSpecificPageButtonClicked(getLastPage(result?.Total))}
                  >
                    {getLastPage(result?.Total)}
                  </button>
                )}
                {1 < getLastPage(result?.Total) && condition.CurrentPage == getLastPage(result?.Total) && (
                  <button className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 cursor-not-allowed">{getLastPage(result?.Total)}</button>
                )}
                {/* '>' */}
                {condition.CurrentPage < getLastPage(result?.Total) && (
                  <button onClick={onNextPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 rounded-r cursor-pointer">
                    &gt;
                  </button>
                )}
                {condition.CurrentPage == getLastPage(result?.Total) && (
                  <button onClick={onNextPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-2 lg:px-4 rounded-r cursor-not-allowed">
                    &gt;
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="relative flex grow ml-0 mr-0 mt-4">
            <div className="absolute w-full h-full px-2 overflow-hidden">
              <div className="h-full overflow-auto">
                <table className="border-collapse border table-fixed">
                  <thead className="text-xs text-white bg-gray-700 uppercase">
                    <tr>
                      <th className="border border-white align-top text-left">Doc ID</th>
                      <th className="border border-white align-top text-left min-w-60">Title</th>
                      <th className="border border-white align-top text-left">Author</th>
                      <th className="border border-white align-top text-left">Date</th>
                      <th className="border border-white align-top text-left min-w-80">Abstract</th>
                      <th className="border border-white align-top text-left">Pages</th>
                      <th className="border border-white align-top text-left">Format</th>
                      <th className="border border-white align-top text-left">Keywords</th>
                      <th className="border border-white align-top text-left">Is Also</th>
                      <th className="border border-white align-top text-left">Obsoletes</th>
                      <th className="border border-white align-top text-left">Obsoleted By</th>
                      <th className="border border-white align-top text-left">Updates</th>
                      <th className="border border-white align-top text-left">Updated By</th>
                      <th className="border border-white align-top text-left">See Also</th>
                      <th className="border border-white align-top text-left">References</th>
                      <th className="border border-white align-top text-left">Referenced By</th>
                      <th className="border border-white align-top text-left">Draft</th>
                      <th className="border border-white align-top text-left">Current Status</th>
                      <th className="border border-white align-top text-left">Publication Status</th>
                      <th className="border border-white align-top text-left">Stream</th>
                      <th className="border border-white align-top text-left">Errata URL</th>
                      <th className="border border-white align-top text-left">Area</th>
                      <th className="border border-white align-top text-left">WG Acronym</th>
                      <th className="border border-white align-top text-left">DOI</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-left text-gray-800">
                    {result?.RFCEntries?.map((row) => (
                      <tr className="bg-slate-200" key={row.doc_id}>
                        <td className="border border-white align-top text-left">
                          <a
                            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                            href={"https://www.rfc-editor.org/info/" + row.doc_id?.toString().toLowerCase()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {row.doc_id}
                          </a>
                        </td>
                        <td className="border border-white align-top text-left">{row.title}</td>
                        <td className="border border-white align-top text-left">
                          {!!row.author &&
                            Array.from(row.author)?.map((item, index) => {
                              const isNotLast = row.author.length != index + 1;
                              const namAndTitle = item.name + " " + (item.title ? "(" + item.title + ")" : "");
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={namAndTitle}>
                                  <span>{namAndTitle}</span>
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {row.date.year}/{convertMonthExpression(row.date.month)}
                        </td>
                        <td className="border border-white align-top text-left">{row.abstract}</td>
                        <td className="border border-white align-top text-left">{row.page_count}</td>
                        <td className="border border-white align-top text-left">
                          {!!row.format &&
                            Array.from(row.format)?.map((item, index) => {
                              const isNotLast = row.format.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.keywords &&
                            Array.from(row.keywords)?.map((item, index) => {
                              const isNotLast = row.keywords.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.is_also &&
                            Array.from(row.is_also)?.map((item, index) => {
                              const isNotLast = row.is_also.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.obsoletes &&
                            Array.from(row.obsoletes)?.map((item, index) => {
                              const isNotLast = row.obsoletes.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.obsoleted_by &&
                            Array.from(row.obsoleted_by)?.map((item, index) => {
                              const isNotLast = row.obsoleted_by.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.updates &&
                            Array.from(row.updates)?.map((item, index) => {
                              const isNotLast = row.updates.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.updated_by &&
                            Array.from(row.updated_by)?.map((item, index) => {
                              const isNotLast = row.updated_by.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.see_also &&
                            Array.from(row.see_also)?.map((item, index) => {
                              const isNotLast = row.see_also.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.references &&
                            Array.from(row.references)?.map((item, index) => {
                              const isNotLast = row.references.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">
                          {!!row.referenced_by &&
                            Array.from(row.referenced_by)?.map((item, index) => {
                              const isNotLast = row.referenced_by.length != index + 1;
                              return (
                                // https://qiita.com/ikeike_ryuryu/items/edec3acfce7868e4b0d0
                                <React.Fragment key={item}>
                                  {item.startsWith("RFC") && (
                                    <a
                                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                                      href={"https://www.rfc-editor.org/info/" + item.toString().toLowerCase()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {item}
                                    </a>
                                  )}
                                  {!item.startsWith("RFC") && item}
                                  {isNotLast && <br />}
                                </React.Fragment>
                              );
                            })}
                        </td>
                        <td className="border border-white align-top text-left">{row.draft}</td>
                        <td className="border border-white align-top text-left">{row.current_status}</td>
                        <td className="border border-white align-top text-left">{row.publication_status}</td>
                        <td className="border border-white align-top text-left">{row.stream}</td>
                        <td className="border border-white align-top text-left">{row.errata_url}</td>
                        <td className="border border-white align-top text-left">{row.area}</td>
                        <td className="border border-white align-top text-left">{row.wg_acronym}</td>
                        <td className="border border-white align-top text-left">{row.doi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
