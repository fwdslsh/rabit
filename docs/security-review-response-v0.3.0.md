# Security Review Response (v0.3.0)

**Date:** 2026-01-13
**Review Date:** 2026-01-13 (targeting v0.2)
**Status:** Analysis of applicability to v0.3.0

---

## Executive Summary

We received a thorough security review targeting the v0.2 specification. This document analyzes which feedback remains applicable after the v0.3.0 simplification and identifies actionable improvements.

**Key finding:** Many concerns were addressed by v0.3.0's philosophy shift (simpler spec, convention over specification), but several security and operational recommendations remain valid.

---

## Feedback Analysis

### 1. Trust & Integrity

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| Manifest signing (Ed25519) | Explicitly out of scope (§2 Non-goals) | **Defer** - Document as future consideration |
| TLS opt-in enforcement | Client implementation detail | **Add to CLIENT_SPEC.md** |
| MITM/mirror-poisoning risks | Mitigated by sha256 hashes on entries | **Partial** - Add guidance on verifying manifest integrity via Git commits |

**Rationale:** v0.3.0's philosophy is "don't reinvent the wheel." Transport security should use existing mechanisms (HTTPS, Git commit signatures) rather than a custom signing scheme.

**Action Items:**
- [x] Add TLS/insecure handling guidance to CLIENT_SPEC.md (already present in §8.1)
- [ ] Add recommendation to use Git-signed commits for manifest integrity
- [ ] Document that sha256 protects entry content but not manifest metadata

### 2. Schema & Validation Hardening

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| `additionalProperties: true` everywhere | Intentional for forward compatibility | **Reviewed** |
| Required hash algorithm identifiers | Fixed - we use explicit `sha256` field | **Resolved** |
| Namespace enforcement for extensions | `metadata` object provides namespace (extensions deprecated) | **Resolved** |

**Analysis:** We keep `additionalProperties: true` at root and entry level for forward compatibility - newer spec versions can add fields that older clients ignore per §12 ("Clients must ignore unknown fields"). Nested objects (`repoMetadata`, `agentInstructions`) already have `additionalProperties: false`.

**Action Items:**
- [x] sha256 field is explicit about algorithm (no longer generic `hash` or `rid`)
- [x] Reviewed additionalProperties policy - current approach is intentional

### 3. Examples Alignment

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| Missing `.burrow.json` in examples | **Fixed** - All example burrows now have manifests | **Resolved** |
| Missing `.warren.json` | **Fixed** - `examples/.warren.json` created | **Resolved** |
| PoC client targets draft-02 | **Fixed** - Updated to v0.3.0 types | **Resolved** |
| Docker example hardening | Not yet addressed | **Todo** |

**Action Items:**
- [x] Example burrows have `.burrow.json` files
- [x] Warren manifest created
- [x] Client types updated to v0.3.0
- [ ] Harden Docker examples (CORS, auth, rate limiting)

### 4. Server Hardening

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| Run as non-root | Not yet addressed | **Todo for rabit-server** |
| Disable auto-generation by default | Not yet addressed | **Todo** |
| Max body size limits | Not yet addressed | **Todo** |
| Restrictive CORS | Not yet addressed | **Todo** |
| Directory listing controls | Not yet addressed | **Todo** |

**Action Items:**
- [ ] Update rabit-server Dockerfile to run as non-root
- [ ] Make auto-generation opt-in
- [ ] Add size limits and rate limiting
- [ ] Provide secure CORS defaults
- [ ] Document volume mount security

### 5. Documentation & Policy

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| README links outdated | **Fixed** in v0.3.0 update | **Resolved** |
| Missing SECURITY.md | **Created** | **Resolved** |
| No disclosure policy | **Added** to SECURITY.md | **Resolved** |
| No Quick Start | **Fixed** - README now has Quick Start | **Resolved** |

**Action Items:**
- [x] README updated with correct links
- [x] Quick Start section added
- [x] Create SECURITY.md with disclosure policy

### 6. Supply Chain

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| Inconsistent lockfiles | Not addressed | **Todo** |
| `@types/bun` uses `latest` | Not addressed | **Todo** |
| Broad `^` ranges on deps | Not addressed | **Todo** |
| No SBOM generation | Not addressed | **Consider** |
| No vulnerability scanning | Not addressed | **Todo** |

**Action Items:**
- [ ] Ensure all packages have committed lockfiles
- [ ] Pin dependency versions (remove `latest`)
- [ ] Tighten version ranges
- [ ] Add Dependabot or similar
- [ ] Consider SBOM for releases

### 7. Observability & Privacy

| Feedback | v0.3.0 Status | Action |
|----------|---------------|--------|
| Logging redaction rules | **Added** to CLIENT_SPEC.md §8.4 | **Resolved** |
| PII minimization | **Added** to CLIENT_SPEC.md | **Resolved** |
| Rate-limit hooks | Present in client | **Documented** |
| Audit log guidance | Not specified | **Consider** |

**Action Items:**
- [x] Add logging/redaction guidance to CLIENT_SPEC.md (§8.4)
- [x] Document TLS handling (§8.5)
- [x] Document SSRF prevention (§8.6)
- [x] Document resource limits (§8.7)

---

## Resolved by v0.3.0 Design

Several concerns were inherently addressed by v0.3.0's simpler design:

1. **RID complexity** → Replaced with simple optional `sha256` field
2. **Complex root descriptors** → Replaced with standard URIs
3. **Conformance levels** → Removed (guidance only)
4. **Traversal algorithm in spec** → Moved to CLIENT_SPEC.md (implementation detail)
5. **IANA registration** → Removed (not an RFC)

---

## Remaining Risks

### High Priority
1. **Server defaults are permissive** - Auto-generation and CORS * can leak data
2. **No SECURITY.md** - No disclosure process for vulnerabilities
3. **Supply chain hygiene** - Loose deps, no scanning

### Medium Priority
4. **Manifest integrity** - sha256 protects entries, not manifests themselves
5. **Logging may leak credentials** - No redaction guidance
6. **additionalProperties: true** - Allows arbitrary fields

### Low Priority (Deferred)
7. **No manifest signing** - Explicitly out of scope
8. **No SBOM** - Nice to have for releases

---

## Recommended Actions

### Immediate (This PR) - COMPLETED
1. ✅ Create SECURITY.md
2. ✅ Add logging/redaction guidance to CLIENT_SPEC.md (§8.4-8.7)
3. ✅ Review schema additionalProperties (kept for forward compatibility)

### Follow-up (Server Update)
4. Harden rabit-server defaults
5. Update Docker examples with security guidance
6. Pin dependencies and add lockfiles

### Future Consideration
7. Manifest integrity via Git signatures (document approach)
8. SBOM generation for releases
9. Dependabot/vulnerability scanning

---

## Conclusion

The v0.3.0 simplification addressed several concerns by removing complexity (RID scheme, conformance levels, complex roots). The remaining feedback is largely operational/security hardening that should be addressed in:

1. **SECURITY.md** - Disclosure policy
2. **CLIENT_SPEC.md** - Logging, TLS, credential handling
3. **rabit-server** - Non-root, auth, rate limits (future PR)
4. **Package hygiene** - Lockfiles, pinned deps (future PR)

The core specification is sound; the gaps are in operational guidance and implementation defaults.
