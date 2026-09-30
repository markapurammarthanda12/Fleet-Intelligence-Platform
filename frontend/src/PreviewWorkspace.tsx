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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "attention" | "scheduled">("all");
  const [selectedRow, setSelectedRow] = useState<PreviewRow | null>(null);
  const statusOf = (row: PreviewRow) => (row.status ?? "").toLowerCase();
  const needsAttention = (row: PreviewRow) => /overdue|due soon|critical|alert|risk|speeding|violation/.test(`${statusOf(row)} ${Object.values(row).join(" ").toLowerCase()}`);
  const isActive = (row: PreviewRow) => /on duty|in progress|active|moving/.test(statusOf(row));
  const isScheduled = (row: PreviewRow) => /scheduled|upcoming|planned/.test(statusOf(row));
  const visibleRows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !query || Object.values(row).some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && isActive(row)) || (statusFilter === "attention" && needsAttention(row)) || (statusFilter === "scheduled" && isScheduled(row));
      return matchesQuery && matchesStatus;
    });
  }, [filter, rows, statusFilter]);
  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(isActive).length,
    attention: rows.filter(needsAttention).length,
    scheduled: rows.filter(isScheduled).length,
  }), [rows]);

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
      <div className="preview-toolbar">
        <div className="preview-data-note" role="note"><span aria-hidden="true">i</span>Sample workspace · synthetic records · not connected to live fleet data</div>
        <div className="preview-status-filters" aria-label={`${title} filters`}>
          {(["all", "active", "attention", "scheduled"] as const).map((filterKey) => (
            <button key={filterKey} type="button" className={`preview-filter${statusFilter === filterKey ? " selected" : ""}`} aria-pressed={statusFilter === filterKey} onClick={() => setStatusFilter(filterKey)}>
              {filterKey === "all" ? "All" : filterKey === "active" ? "Active" : filterKey === "attention" ? "Needs attention" : "Scheduled"}<span>{counts[filterKey]}</span>
            </button>
          ))}
        </div>
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
                  <td key={column.key} className={columnIndex === 0 ? "preview-primary-cell" : undefined}>{columnIndex === 0 ? <button type="button" className="preview-record-link" onClick={() => setSelectedRow(row)}>{row[column.key]}</button> : row[column.key]}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {selectedRow && <section className="preview-detail" aria-label={`${title} record details`}>
        <div className="preview-detail-heading"><div><span className="eyebrow">SAMPLE RECORD</span><h3>{selectedRow[columns[0]?.key] ?? title}</h3></div><button className="preview-close" type="button" onClick={() => setSelectedRow(null)}>Close</button></div>
        <dl>{columns.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{selectedRow[column.key] || "—"}</dd></div>)}</dl>
      </section>}
      <footer className="table-footer"><span>Showing {visibleRows.length} of {rows.length} sample {rows.length === 1 ? "record" : "records"}</span><span>Live API integration follows in the backend phase.</span></footer>
    </section>
  );
}
