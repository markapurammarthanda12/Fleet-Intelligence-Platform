# Fleet dataset

This folder contains the generated 100,000-vehicle dataset used by the Fleet Intelligence Platform demo.

- `vehicles.jsonl.gz` is the compressed vehicle master dataset (100,000 records).
- `telemetry.jsonl.gz` is the compressed telemetry dataset (101,026 records).

Download each `.gz` file from GitHub and extract it to get the corresponding `.jsonl` file. JSONL means one JSON record per line. The uncompressed files are ignored by Git to keep regular source changes small; these compressed copies are included here for download.

To regenerate locally instead, run `bash scripts/generate_dataset.sh` from the repository root. The generated data is synthetic and does not represent real vehicles.
