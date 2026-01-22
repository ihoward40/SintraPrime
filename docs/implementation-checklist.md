# Drive Tooling implementation checklist

- [ ] Populate `config/drives.json` targets + approvedRoots
- [ ] Set env secrets referenced by `secretRef` fields
- [ ] (Optional) Create Make.com scenario for `ensurePath`
- [ ] Run `/drive authTest` for each target and save receipts
- [ ] Use `/drive ensurePath` with `dryRun` first
