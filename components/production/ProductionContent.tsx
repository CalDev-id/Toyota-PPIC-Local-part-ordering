"use client";

import { useEffect, useState } from "react";

import ItemsPage, { type ItemRow } from "@/components/items/page";
import StatsPage from "@/components/stats/page";

export default function ProductionContent() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRows();
  }, []);

  async function fetchRows() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/items", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Gagal ambil data item");
      }

      const data: ItemRow[] = await res.json();
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Data item tidak bisa dimuat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StatsPage rows={rows} loading={loading} error={error} />
      <ItemsPage rows={rows} loading={loading} onRowsChange={setRows} onRefresh={fetchRows} />
    </>
  );
}
