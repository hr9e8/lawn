#!/usr/bin/env bash
set -euo pipefail

bunx convex deploy --cmd 'bun run build' --cmd-url-env-var-name VITE_CONVEX_URL
bunx convex run migrations:runAll
