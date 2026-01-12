## Governance Wiring Review Checklist

> This checklist is mandatory for any PR that wires specifications into runtime behavior.

### Scope & Intent
- [ ] Wiring scope document included (`docs/governance/wiring-scope.md`)
- [ ] Scope document accurately reflects this PR
- [ ] No undocumented execution paths affected

### Authority & Semantics
- [ ] No silent authority expansion
- [ ] Any authority expansion explicitly declared and justified
- [ ] Refusal logic unchanged or strengthened

### Execution Safety
- [ ] Demo / Observe protections preserved
- [ ] No live-account access introduced without explicit approval
- [ ] No credentials added or referenced

### Separation of Concerns
- [ ] Specs-only files not modified unless required
- [ ] Wiring changes isolated to this branch
- [ ] No opportunistic refactors included

### Validation
- [ ] Tests updated or added
- [ ] Manual verification steps documented
- [ ] No CI rules silently activated

### Approvals
- [ ] Human review completed
- [ ] No auto-merge enabled
- [ ] Squash merge does not obscure intent

---

**Reviewer Notes**
- Confirm wiring matches declared scope.
- Reject PR if scope document is missing or incomplete.
