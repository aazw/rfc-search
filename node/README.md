# React + TypeScript + Vite

## Components

* Rect
* TypeScript
* Tailwind CSS
* DuckDB WASM
* Vite

## Run Dev Server

```bash
# at <root>/node
npm run dev
```

```bash
# Example:
$ npm run dev

> node@0.0.0 dev
> vite

Re-optimizing dependencies because lockfile has changed

  VITE v6.0.7  ready in 226 ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  press h + enter to show help
```

## Build

```bash
npm run build
```

```bash
# Example:
$ npm run build

> node@0.0.0 build
> tsc -b && vite build

vite v6.0.7 building for production...
✓ 172 modules transformed.
dist/index.html                                         0.46 kB │ gzip:  0.30 kB
dist/assets/duckdb-browser-eh.worker-D6ypKDsm.js      760.53 kB
dist/assets/duckdb-browser-mvp.worker-CM-L3bpJ.js     820.87 kB
dist/assets/rfc-Y23NUqIM.duckdb                    12,070.91 kB
dist/assets/duckdb-eh-DrTJ_0hP.wasm                35,659.69 kB
dist/assets/duckdb-mvp-DuKjbjvP.wasm               40,621.60 kB
dist/assets/index-BLc-K5Tw.css                          7.34 kB │ gzip:  2.09 kB
dist/assets/index-BogsuIO6.js                         355.89 kB │ gzip: 95.05 kB
✓ built in 4.96s
```

## References

### DuckDB

* DuckDB-WASM  
  <https://shell.duckdb.org/docs/index.html>
* DuckDB Wasm  
  <https://duckdb.org/docs/api/wasm/overview>
* Query  
  <https://duckdb.org/docs/api/wasm/query>

### React

* 【React】イベントハンドラで引数を使いたい【備忘録】  
  <https://qiita.com/tsuuuuu_san/items/73747c8b6e6e28f6bd23>

### Tailwind CSS

* Buttons  
  <https://v1.tailwindcss.com/components/buttons>
