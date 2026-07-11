'use client';
import { useMemo, useState } from 'react';
import type { UsageRow } from '../http/dto/api/usage-report-api.dto';
export type UsageColumn<Row extends UsageRow> = {
  id: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  sortValue?: (row: Row) => string | number | bigint;
};
export function UsageTable<Row extends UsageRow>({
  caption,
  rows,
  columns,
}: {
  caption: string;
  rows: Row[];
  columns: UsageColumn<Row>[];
}) {
  const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(null);
  const sorted = useMemo(
    () =>
      sort
        ? rows
            .map((row, i) => ({ row, i }))
            .sort((a, b) => {
              const col = columns.find((c) => c.id === sort.id);
              const av = col?.sortValue?.(a.row) ?? '';
              const bv = col?.sortValue?.(b.row) ?? '';
              const cmp = av < bv ? -1 : av > bv ? 1 : a.i - b.i;
              return sort.desc ? -cmp : cmp;
            })
            .map((x) => x.row)
        : rows,
    [rows, columns, sort],
  );
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.id}
              scope="col"
              aria-sort={
                sort?.id === c.id
                  ? sort.desc
                    ? 'descending'
                    : 'ascending'
                  : 'none'
              }
            >
              <button
                type="button"
                onClick={() =>
                  setSort((s) => ({
                    id: c.id,
                    desc: s?.id === c.id ? !s.desc : false,
                  }))
                }
              >
                {c.header}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => (
              <td key={c.id}>{c.cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
