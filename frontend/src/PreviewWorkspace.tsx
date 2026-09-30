import { useMemo, useState } from "react";

export type PreviewColumn = {
  key: string;
  label: string;
};

export type PreviewRow = Record<string, string>;

type Props = {
  id: string;
  title: string;
  description: string;
  columns: PreviewColumn[];
  rows: PreviewRow[];
};

export default function PreviewWorkspace({ id, title, description, columns, rows }: Props) {
  const [filter, setFilter] = useState("");
  const visibleRows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(query)));
  }, [filter, rows]);

  return (
    <section className="preview-workspace panel" id={id} aria-labelledby={`${id}-title`}>
      <div className="preview-heading">
        <div>
          <div className="section-title-row"><h2 id={`${id}-title`}>{title}</h2><span className="preview-badge">UI preview</span></div>
          <p>{description}</p>
        </div>
        <label className="preview-search">
          <span className="sr-only">Search {title.toLowerCase()}</span>
          <span aria-hidden="true">⌕</span>
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
        </label>
      </div>
      <div className="preview-data-note" role="note">
        <span aria-hidden="true">i</span>
        Preview only: these sample records are synthetic and are not connected to fleet data yet.
      </div>
      {visibleRows.length === 0 ? (
        <div className="empty-state preview-empty"><strong>No matching records</strong><span>Try another search term.</span></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>{visibleRows.map((row, index) => (
              <tr key={`${id}-${index}`}>
                {columns.map((column, columnIndex) => (
                  <td key={column.key} className={columnIndex === 0 ? "preview-primary-cell" : undefined}>{row[column.key]}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <footer className="table-footer"><span>Showing {visibleRows.length} sample {visibleRows.length === 1 ? "record" : "records"}</span><span>Live API integration follows in the backend phase.</span></footer>
    </section>
  );
}
