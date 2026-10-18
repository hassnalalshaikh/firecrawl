# Reviewed transport artifact v9

This contribution preserves the already reviewed private runtime archive. `provenance.json` binds the exact source commit, all package source files, dist/DTS files, production manifest, archive checksum and paired source commits. The metadata commit containing this recipe follows the recorded transport source commit.

The unchanged official SDK tsup8.5.0 configuration and canonical pnpm10.11.0 development lock produced the qualified six dist/DTS files under Node24.21.0. V3 records stock/patched builds and81 adapted patched Jest tests. Use the canonical SDK package build, without changing production ranges to development-lock versions. This recipe deliberately accepts already-built dist and verifies every byte; it does not replace the build with a custom bundler.

Run the normal pack recipe with Node24.21.0, the recorded pnpm10.11.0 CLI, the qualified build output and a new output directory outside the repository:

```bash
node artifact/transport-v9/pack-reviewed.mjs --dist /path/to/qualified/dist --out /path/to/new/pack-output --pnpm /path/to/pnpm10.11.0/bin/pnpm.cjs
```

The script normalizes checkout CRLF to canonical LF for source and runtime-manifest text. It checks source hashes, source ancestry, all dist/DTS hashes, the exact production manifest and tool identity before calling normal `pnpm pack` with scripts disabled. It checks the resulting SHA256 and SRI against the reviewed archive. It performs no install, build, lock edit, publication or provider operation.

The production manifest follows the official SDK publication identity transform: `firecrawl`, no self-dependency, original production dependency ranges, and dist-only file selection. The transport patch does not require the canonical development-lock versions to become exact production pins.

The SDK and native pair remain private. pnpm11.3 can refuse a HTTPS URL as an overridden child before deduplication, even when the URL is also a direct dependency. Do not disable `blockExoticSubdeps` or treat a direct declaration as distribution proof. Published asset URLs, release tag and source PR URLs stay null until their actual owned publication stages.

V9 proves the original SDK subtree and the recorded private browser slice. It does not prove the full Root peer graph, a deployed browser lifecycle or provider billing.
