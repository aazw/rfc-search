// import { useState } from "react";

import "./App.css";

import Table from "./Table.tsx";

export default function App() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-none mx-4">
        <h1 className="text-2xl font-bold py-2">RFC Search</h1>
      </div>
      <div className="relative flex grow w-full pb-2">
        <Table></Table>
      </div>
    </div>
  );
}
