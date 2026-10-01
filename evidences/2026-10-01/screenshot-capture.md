# Product screenshot capture record

Capture date shown by the live app: 1 October 2026 (Asia/Kolkata). The image files were recovered into this workspace on 2 October 2026 from the native capture bundle after browser screenshots had been visually reviewed.

## Environment

- Local Docker Compose demo at `http://localhost:3000`.
- Synthetic `tenant-100k` fleet; no real vehicle or personal data.
- Browser viewport: 714 × 746 pixels.
- These images are representative UI evidence, not load-test or production-security evidence.

## Captures

- [`dashboard-overview.jpg`](dashboard-overview.jpg): captured at 10:09 PM IST. The overview showed 100,000 vehicles, 371 healthy, 97,970 warnings, and 1,659 critical. Counts are a time-specific simulator snapshot.
- [`alerts.jpg`](alerts.jpg): captured at 10:11 PM IST. The page showed 1,809 open alerts overall. It loaded 200 alert rows; all 200 were critical and the loaded rows included 0 warnings. The alert table is paginated, so this does not imply that the entire fleet had no warning alerts.

The images are embedded in Section 3.1 of `docs/Fleet_Intelligence_Solution_Document_DRAFT.docx`. A later submission capture should be taken against the final release candidate and noted separately with its commit.
