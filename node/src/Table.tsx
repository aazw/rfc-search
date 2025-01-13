import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";

import dbUrl from "./rfc.duckdb?url";

import React, { useState, useEffect } from "react";

import "./Table.css";

function convertMonthExpression(month: String): String {
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
  doc_id: String;
  title: String;
  author: {
    name: String;
    title: String;
  }[];
  date: {
    year: String;
    month: String;
    day: String;
  };
  format: String[];
  page_count: String;
  keywords: String[];
  is_also: String[];
  obsoletes: String[];
  obsoleted_by: String[];
  updates: String[];
  updated_by: String[];
  see_also: String[];
  refers: String[];
  referred_by: String[];
  abstract: String;
  draft: String;
  current_status: String;
  publication_status: String;
  stream: String;
  errata_url: String;
  area: String;
  wg_acronym: String;
  doi: String;
}

async function initDuckDB(): Promise<duckdb.AsyncDuckDB> {
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

  const response = await fetch(dbUrl);

  await db.registerFileBuffer("rfc_duckdb", new Uint8Array(await response.arrayBuffer()));
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
                doc_id                             LIKE '%${searchText}%' or
                title                              LIKE '%${searchText}%' or
                len(list_filter(author, x -> x.name LIKE '%${searchText}%' or x.title LIKE '%${searchText}%' )) >= 1 or
                date.year                          LIKE '%${searchText}%' or
                date.month                         LIKE '%${searchText}%' or
                date.day                           LIKE '%${searchText}%' or
                array_to_string(format, ' ')       LIKE '%${searchText}%' or
                page_count                         LIKE '%${searchText}%' or
                array_to_string(keywords, ' ')     LIKE '%${searchText}%' or
                array_to_string(is_also, ' ')      LIKE '%${searchText}%' or
                array_to_string(obsoletes, ' ')    LIKE '%${searchText}%' or
                array_to_string(obsoleted_by, ' ') LIKE '%${searchText}%' or
                array_to_string(updates, ' ')      LIKE '%${searchText}%' or
                array_to_string(updated_by, ' ')   LIKE '%${searchText}%' or
                array_to_string(see_also, ' ')     LIKE '%${searchText}%' or
                array_to_string(refers, ' ')       LIKE '%${searchText}%' or
                array_to_string(referred_by, ' ')  LIKE '%${searchText}%' or
                abstract                           LIKE '%${searchText}%' or
                draft                              LIKE '%${searchText}%' or
                current_status                     LIKE '%${searchText}%' or
                publication_status                 LIKE '%${searchText}%' or
                stream                             LIKE '%${searchText}%' or
                errata_url                         LIKE '%${searchText}%' or
                area                               LIKE '%${searchText}%' or
                wg_acronym                         LIKE '%${searchText}%' or
                doi                                LIKE '%${searchText}%'`;
  }

  const resultTotal = await conn.query(queryString);

  // totalが、9494nのようなn付き(=BigInt型)で返ってくるから、それをnumberに変換する
  const total = Number(resultTotal.toArray()[0].toJSON()["total"]);
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
                refers,
                referred_by,
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
            LIMIT ${limit}
            OFFSET ${offset};`;

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
                refers,
                referred_by, 
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
                doc_id                             LIKE '%${searchText}%' or
                title                              LIKE '%${searchText}%' or
                len(list_filter(author, x -> x.name LIKE '%${searchText}%' or x.title LIKE '%${searchText}%' )) >= 1 or
                date.year                          LIKE '%${searchText}%' or
                date.month                         LIKE '%${searchText}%' or
                date.day                           LIKE '%${searchText}%' or
                array_to_string(format, ' ')       LIKE '%${searchText}%' or
                page_count                         LIKE '%${searchText}%' or
                array_to_string(keywords, ' ')     LIKE '%${searchText}%' or
                array_to_string(is_also, ' ')      LIKE '%${searchText}%' or
                array_to_string(obsoletes, ' ')    LIKE '%${searchText}%' or
                array_to_string(obsoleted_by, ' ') LIKE '%${searchText}%' or
                array_to_string(updates, ' ')      LIKE '%${searchText}%' or
                array_to_string(updated_by, ' ')   LIKE '%${searchText}%' or
                array_to_string(see_also, ' ')     LIKE '%${searchText}%' or
                array_to_string(refers, ' ')       LIKE '%${searchText}%' or
                array_to_string(referred_by, ' ')  LIKE '%${searchText}%' or
                abstract                           LIKE '%${searchText}%' or
                draft                              LIKE '%${searchText}%' or
                current_status                     LIKE '%${searchText}%' or
                publication_status                 LIKE '%${searchText}%' or
                stream                             LIKE '%${searchText}%' or
                errata_url                         LIKE '%${searchText}%' or
                area                               LIKE '%${searchText}%' or
                wg_acronym                         LIKE '%${searchText}%' or
                doi                                LIKE '%${searchText}%'
            ORDER BY doc_id DESC
            LIMIT ${limit}
            OFFSET ${offset};`;
  }

  const resultEntries = await conn.query(queryString);
  const entries: RFCEntry[] = resultEntries.toArray().map((row) => row.toJSON());
  //   console.log("entries: ", records);

  await conn.close();

  const ret = {
    Total: total,
    RFCEntries: entries,
  };
  return ret;
}

type Props = {};

type Condition = {
  SearchText?: string;
  CurrentPage: number;
};

// propをObject Destructuringで展開して受け取る
export default function Table(_: Props) {
  // 第1引数: 初期値
  // 第1戻り値: 現在の値
  // 第2戻り値: 状態を変更する関数
  //
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
      const db = await initDuckDB();
      setDB(db);
    })();
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
    })();
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

  const onPreviousPageButtonClicked = (_: React.MouseEvent<HTMLButtonElement>) => {
    if (condition.CurrentPage > 1) {
      const newCondition: Condition = {
        SearchText: condition.SearchText,
        CurrentPage: condition.CurrentPage - 1,
      };
      setCondition(newCondition);
    }
  };

  const onNextPageButtonClicked = (_: React.MouseEvent<HTMLButtonElement>) => {
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
          <div>Now Loading...</div>
        </>
      )}
      {result != null && (
        <>
          <div className="toolbar">
            <input
              className="toolbar-input border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              type="text"
              placeholder="Search"
              onChange={onSearchTextValueChanged}
            ></input>
            <span className="toolbar-total py-2 px-4">
              Showing {(condition.CurrentPage - 1) * 100 + 1} - {condition.CurrentPage * 100 > result?.Total ? result?.Total : condition.CurrentPage * 100} of {result?.Total}
            </span>
            {/* '<' */}
            {condition.CurrentPage > 1 && (
              <button onClick={onPreviousPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 rounded-l cursor-pointer">
                &lt;
              </button>
            )}
            {condition.CurrentPage == 1 && (
              <button onClick={onPreviousPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 rounded-l cursor-not-allowed">
                &lt;
              </button>
            )}
            {/* 1 */}
            {condition.CurrentPage != 1 && (
              <button className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 cursor-pointer" onClick={() => onSpecificPageButtonClicked(1)}>
                1
              </button>
            )}
            {condition.CurrentPage == 1 && <button className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 cursor-not-allowed">1</button>}
            {/* ... */}
            {condition.CurrentPage >= 4 && <span className="bg-gray-300 font-bold py-2 px-4">...</span>}
            {/* Previous Page (Current Page -1) */}
            {condition.CurrentPage >= 3 && (
              <span className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 cursor-pointer" onClick={() => onSpecificPageButtonClicked(condition.CurrentPage - 1)}>
                {condition.CurrentPage - 1}
              </span>
            )}
            {/* Current Page  */}
            {condition.CurrentPage >= 2 && condition.CurrentPage <= getLastPage(result?.Total) - 1 && (
              <span className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 cursor-not-allowed">{condition.CurrentPage}</span>
            )}
            {/* Next Page (Current Page + 1) */}
            {condition.CurrentPage <= getLastPage(result?.Total) - 2 && (
              <span className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 cursor-pointer" onClick={() => onSpecificPageButtonClicked(condition.CurrentPage + 1)}>
                {condition.CurrentPage + 1}
              </span>
            )}
            {/* ... */}
            {condition.CurrentPage <= getLastPage(result?.Total) - 3 && <span className="bg-gray-300 font-bold py-2 px-4">...</span>}
            {/* Last Page */}
            {1 < getLastPage(result?.Total) && condition.CurrentPage != getLastPage(result?.Total) && (
              <button
                className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 cursor-pointer"
                onClick={() => onSpecificPageButtonClicked(getLastPage(result?.Total))}
              >
                {getLastPage(result?.Total)}
              </button>
            )}
            {1 < getLastPage(result?.Total) && condition.CurrentPage == getLastPage(result?.Total) && (
              <button className="text-white bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 cursor-not-allowed">{getLastPage(result?.Total)}</button>
            )}
            {/* '>' */}
            {condition.CurrentPage < getLastPage(result?.Total) && (
              <button onClick={onNextPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 rounded-r cursor-pointer">
                &gt;
              </button>
            )}
            {condition.CurrentPage == getLastPage(result?.Total) && (
              <button onClick={onNextPageButtonClicked} className="text-blue-600 bg-gray-300 hover:text-white hover:bg-blue-700 font-bold py-2 px-4 rounded-r cursor-not-allowed">
                &gt;
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="fixed-header-table">
              <thead className="text-xs text-white bg-gray-700 uppercase">
                <tr>
                  <th>Doc ID</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Format</th>
                  <th>Pages</th>
                  <th>Keywords</th>
                  <th>Is Also</th>
                  <th>Obsoletes</th>
                  <th>Obsoleted By</th>
                  <th>Updates</th>
                  <th>Updated By</th>
                  <th>See Also</th>
                  <th>Refers</th>
                  <th>Referred By</th>
                  <th>Abstract</th>
                  <th>Draft</th>
                  <th>Current Status</th>
                  <th>Publication Status</th>
                  <th>Stream</th>
                  <th>Errata URL</th>
                  <th>Area</th>
                  <th>WG Acronym</th>
                  <th>DOI</th>
                </tr>
              </thead>
              <tbody className="text-sm text-left text-gray-800">
                {result?.RFCEntries?.map((row) => (
                  <tr className="bg-slate-200">
                    <td>
                      <a
                        className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
                        href={"https://www.rfc-editor.org/info/" + row.doc_id?.toString().toLowerCase()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.doc_id}
                      </a>
                    </td>
                    <td>{row.title}</td>
                    <td>
                      {!!row.author &&
                        Array.from(row.author)?.map((item, index) => {
                          const isNotLast = row.author.length != index + 1;
                          const isTitle = !!item.title;
                          return (
                            <>
                              {item.name}&nbsp;{isTitle && "(" + item.title + ")"}
                              {isNotLast && <br />}
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {row.date.year}/{convertMonthExpression(row.date.month)}
                    </td>
                    <td>
                      {!!row.format &&
                        Array.from(row.format)?.map((item, index) => {
                          const isNotLast = row.format.length != index + 1;
                          return (
                            <>
                              {item}
                              {isNotLast && <br />}
                            </>
                          );
                        })}
                    </td>
                    <td>{row.page_count}</td>
                    <td>
                      {!!row.keywords &&
                        Array.from(row.keywords)?.map((item, index) => {
                          const isNotLast = row.keywords.length != index + 1;
                          return (
                            <>
                              {item}
                              {isNotLast && <br />}
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.is_also &&
                        Array.from(row.is_also)?.map((item, index) => {
                          const isNotLast = row.is_also.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.obsoletes &&
                        Array.from(row.obsoletes)?.map((item, index) => {
                          const isNotLast = row.obsoletes.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.obsoleted_by &&
                        Array.from(row.obsoleted_by)?.map((item, index) => {
                          const isNotLast = row.obsoleted_by.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.updates &&
                        Array.from(row.updates)?.map((item, index) => {
                          const isNotLast = row.updates.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.updated_by &&
                        Array.from(row.updated_by)?.map((item, index) => {
                          const isNotLast = row.updated_by.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.see_also &&
                        Array.from(row.see_also)?.map((item, index) => {
                          const isNotLast = row.see_also.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.refers &&
                        Array.from(row.refers)?.map((item, index) => {
                          const isNotLast = row.refers.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>
                      {!!row.referred_by &&
                        Array.from(row.referred_by)?.map((item, index) => {
                          const isNotLast = row.referred_by.length != index + 1;
                          return (
                            <>
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
                            </>
                          );
                        })}
                    </td>
                    <td>{row.abstract}</td>
                    <td>{row.draft}</td>
                    <td>{row.current_status}</td>
                    <td>{row.publication_status}</td>
                    <td>{row.stream}</td>
                    <td>{row.errata_url}</td>
                    <td>{row.area}</td>
                    <td>{row.wg_acronym}</td>
                    <td>{row.doi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
