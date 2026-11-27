# Penguin Peaks — Audit Baseline (M0)

- **Baseline commit:** `4e53bf2520366a1305d7e3335e0f23ed7a903d50`
- **Branch:** `audit-remediation` (created from the baseline commit)
- **Working tree at branch creation:** clean, nothing to commit
- **Baseline verdict (independent audit, 2026-11-27):** NOT READY FOR PAID RELEASE
- **Mission source:** `~/workspace/user/files/Penguin_Peaks_Audit_and_Improvement_Mission.pdf`
- **Authorization:** user (owner) authorized running/building/testing this repo's code
  on 2026-11-27 ~20:12 IST: "Just run continuously and get the work done."

## Baseline file hashes (sha256)

| File | sha256 |
|---|---|
| app/index.html | `640c7b9c9caf4772e2fcef4772038eee88eed3d79ce42d5d47fee56b05816693` |
| index.html | `37258bc1698e2e0c3bfdac112c23c7f7e582888b8cc1d38ab566ed71c0d0b9fb` |
| main.js | `363eb8461df311027455b3d1037c3ae13f77a6742aa5e13d179dafceae43e6da` |

Recorded live at branch creation:

```
$ git rev-parse HEAD
4e53bf2520366a1305d7e3335e0f23ed7a903d50
$ git status
On branch main, nothing to commit, working tree clean
```

## Preservation rules for this branch

- Original builds (`dist/`, if present) and saves are never deleted; nothing
  unrelated is removed. All remediation lands as incremental commits on
  `audit-remediation`. History is never rewritten. Nothing is pushed to `main`.
- Defects PP-01..PP-10 are reproduced with a failing regression test FIRST,
  then fixed, then the test must pass. No defect is marked fixed on
  documentation claims alone.
- The Windows `.exe` has never run on a real Windows machine; no
  Windows/controller/Steam readiness is claimed without actual verification.
