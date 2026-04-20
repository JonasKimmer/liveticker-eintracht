#!/usr/bin/env bash
# ============================================================================
# Code Quality Audit — Liveticker Eintracht
# Prüft Frontend (React/TypeScript) und Backend (FastAPI/Python)
# auf Best-Practice-Verstöße, Code-Smells und Wartbarkeitsprobleme.
#
# Usage:  chmod +x scripts/code_quality_audit.sh && ./scripts/code_quality_audit.sh
# ============================================================================

set +e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE="$ROOT/frontend/src"
BE="$ROOT/backend/app"
BE_TESTS="$ROOT/backend/tests"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_ISSUES=0
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0

# ---------- helpers ---------------------------------------------------------

section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

issue() {
  local severity="$1"
  local file="$2"
  local msg="$3"
  TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
  case "$severity" in
    CRITICAL) CRITICAL=$((CRITICAL + 1)); echo -e "  ${RED}[CRITICAL]${NC} $file — $msg" ;;
    HIGH)     HIGH=$((HIGH + 1));         echo -e "  ${RED}[HIGH]${NC}     $file — $msg" ;;
    MEDIUM)   MEDIUM=$((MEDIUM + 1));     echo -e "  ${YELLOW}[MEDIUM]${NC}   $file — $msg" ;;
    LOW)      LOW=$((LOW + 1));           echo -e "  ${GREEN}[LOW]${NC}      $file — $msg" ;;
  esac
}

# Portable grep count helper — works on macOS BSD grep and GNU grep
gcount() {
  # Usage: gcount <pattern> <path> [--include flags...]
  # Returns total match count across all files
  local pattern="$1"; shift
  local path="$1"; shift
  grep -r "$@" -c "$pattern" "$path" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}'
}

gfiles() {
  # Usage: gfiles <pattern> <path> [--include flags...]
  # Returns number of files with matches
  local pattern="$1"; shift
  local path="$1"; shift
  grep -r "$@" -l "$pattern" "$path" 2>/dev/null | wc -l | tr -d ' '
}

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
printf "║          CODE QUALITY AUDIT — Liveticker Eintracht          ║\n"
printf "║                  %s                    ║\n" "$(date '+%Y-%m-%d %H:%M:%S')"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# 1. TYPESCRIPT / FRONTEND
# ============================================================================

section "1. TypeScript Strict-Mode & Typsicherheit"

# 1.1 — any usage
echo -e "  ${BOLD}Scanning for 'any' usage...${NC}"
ANY_EXPLICIT=$(gcount '\bany\b' "$FE" --include='*.ts' --include='*.tsx')
ANY_FILES=$(gfiles '\bany\b' "$FE" --include='*.ts' --include='*.tsx')
if [ "$ANY_EXPLICIT" -gt 50 ]; then
  issue "HIGH" "Frontend ($ANY_FILES files)" "'any' appears $ANY_EXPLICIT times — reduces type safety"
elif [ "$ANY_EXPLICIT" -gt 0 ]; then
  issue "MEDIUM" "Frontend ($ANY_FILES files)" "'any' appears $ANY_EXPLICIT times"
fi

# Top offenders
echo -e "  ${BOLD}Top 'any' offenders:${NC}"
grep -r --include='*.ts' --include='*.tsx' -c '\bany\b' "$FE" 2>/dev/null | sort -t: -k2 -nr | head -10 | while IFS= read -r line; do
  file="${line%:*}"
  cnt="${line##*:}"
  if [ "${cnt:-0}" -gt 0 ] 2>/dev/null; then
    rel=$(echo "$file" | sed "s|$ROOT/||")
    echo -e "    ${cnt}×  $rel"
  fi
done

# 1.2 — @ts-ignore / @ts-expect-error
TS_IGNORE=$(gcount '@ts-ignore\|@ts-expect-error' "$FE" --include='*.ts' --include='*.tsx')
if [ "$TS_IGNORE" -gt 0 ]; then
  issue "MEDIUM" "Frontend" "$TS_IGNORE @ts-ignore/@ts-expect-error directives"
fi

# 1.3 — as any casts
AS_ANY=$(gcount 'as any' "$FE" --include='*.ts' --include='*.tsx')
if [ "$AS_ANY" -gt 0 ]; then
  issue "MEDIUM" "Frontend" "$AS_ANY 'as any' type casts found"
fi

# 1.4 — Non-null assertions (!)
NON_NULL=$(gcount '!\.' "$FE" --include='*.ts' --include='*.tsx')
if [ "$NON_NULL" -gt 10 ]; then
  issue "LOW" "Frontend" "$NON_NULL non-null assertions (!) — consider optional chaining"
fi

# ──────────────────────────────────────────────────────────────────

section "2. React Best Practices"

# 2.1 — console.log in production code (not tests)
CONSOLE_LOGS=$(gcount 'console\.log' "$FE" --include='*.ts' --include='*.tsx')
CONSOLE_FILES=$(grep -r --include='*.ts' --include='*.tsx' -l 'console\.log' "$FE" 2>/dev/null | grep -v '\.test\.' | grep -v '__test__' | wc -l | tr -d ' ')
if [ "$CONSOLE_FILES" -gt 0 ]; then
  issue "MEDIUM" "Frontend ($CONSOLE_FILES files)" "$CONSOLE_LOGS console.log statements in production code"
  grep -r --include='*.ts' --include='*.tsx' -l 'console\.log' "$FE" 2>/dev/null | grep -v '\.test\.' | grep -v '__test__' | head -8 | while read -r f; do
    echo -e "    $(echo "$f" | sed "s|$ROOT/||")"
  done
fi

# 2.2 — useEffect count
EFFECT_COUNT=$(gcount 'useEffect(' "$FE" --include='*.ts' --include='*.tsx')
echo -e "  ${BOLD}useEffect calls: $EFFECT_COUNT total${NC} (manual review needed for missing deps)"

# 2.3 — Direct DOM manipulation
DIRECT_DOM=$(gcount 'document\.getElementById\|document\.querySelector\|document\.getElement' "$FE" --include='*.ts' --include='*.tsx')
if [ "$DIRECT_DOM" -gt 3 ]; then
  issue "MEDIUM" "Frontend" "$DIRECT_DOM direct DOM manipulations — prefer useRef"
fi

# 2.4 — Inline styles (style={{ ... }})
INLINE_STYLES=$(gcount 'style={{' "$FE" --include='*.tsx')
if [ "$INLINE_STYLES" -gt 20 ]; then
  issue "LOW" "Frontend" "$INLINE_STYLES inline styles — consider CSS modules or styled-components"
fi

# 2.5 — Large component files (>400 lines)
echo -e "  ${BOLD}Large components (>400 LOC):${NC}"
find "$FE" -name '*.tsx' -not -name '*.test.*' | while read -r f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 400 ]; then
    rel=$(echo "$f" | sed "s|$ROOT/||")
    issue "LOW" "$rel" "$lines lines — consider splitting"
  fi
done

# 2.6 — TODO / FIXME / HACK / XXX
TODOS_FE=$(gcount 'TODO\|FIXME\|HACK\|XXX' "$FE" --include='*.ts' --include='*.tsx')
if [ "$TODOS_FE" -gt 0 ]; then
  issue "LOW" "Frontend" "$TODOS_FE TODO/FIXME/HACK/XXX comments"
  grep -rn --include='*.ts' --include='*.tsx' 'TODO\|FIXME\|HACK\|XXX' "$FE" 2>/dev/null | head -10 | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# ──────────────────────────────────────────────────────────────────

section "3. Security (Frontend)"

# 3.1 — dangerouslySetInnerHTML
DANGEROUS_HTML=$(gcount 'dangerouslySetInnerHTML' "$FE" --include='*.tsx')
if [ "$DANGEROUS_HTML" -gt 0 ]; then
  issue "HIGH" "Frontend" "$DANGEROUS_HTML dangerouslySetInnerHTML usages — XSS risk"
  grep -rn --include='*.tsx' 'dangerouslySetInnerHTML' "$FE" 2>/dev/null | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# 3.2 — Hardcoded secrets/keys
SECRETS_FE=$(grep -r --include='*.ts' --include='*.tsx' -ciE '(api[_-]?key|secret|password|token)[[:space:]]*[:=][[:space:]]*"[^"]{8,}' "$FE" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
if [ "$SECRETS_FE" -gt 0 ]; then
  issue "CRITICAL" "Frontend" "$SECRETS_FE potential hardcoded secrets"
fi

# 3.3 — eval()
EVAL_FE=$(gcount '\beval(' "$FE" --include='*.ts' --include='*.tsx')
if [ "$EVAL_FE" -gt 0 ]; then
  issue "CRITICAL" "Frontend" "$EVAL_FE eval() calls — code injection risk"
fi

# ============================================================================
# 2. PYTHON / BACKEND
# ============================================================================

section "4. Python Code Quality"

# 4.1 — Bare except
BARE_EXCEPT=$(grep -r --include='*.py' -cE 'except[[:space:]]*:' "$BE" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
if [ "$BARE_EXCEPT" -gt 0 ]; then
  issue "HIGH" "Backend" "$BARE_EXCEPT bare 'except:' clauses — catch specific exceptions"
  grep -rn --include='*.py' -E 'except[[:space:]]*:' "$BE" 2>/dev/null | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# 4.2 — Broad except Exception
BROAD_EXCEPT=$(gcount 'except Exception' "$BE" --include='*.py')
if [ "$BROAD_EXCEPT" -gt 5 ]; then
  issue "MEDIUM" "Backend" "$BROAD_EXCEPT broad 'except Exception' clauses"
fi

# 4.3 — print() in production code (not tests)
PRINT_BE=$(gcount '\bprint(' "$BE" --include='*.py')
if [ "$PRINT_BE" -gt 0 ]; then
  issue "MEDIUM" "Backend" "$PRINT_BE print() calls — use logger instead"
  grep -rn --include='*.py' '\bprint(' "$BE" 2>/dev/null | head -8 | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# 4.4 — TODO / FIXME / HACK
TODOS_BE=$(gcount 'TODO\|FIXME\|HACK\|XXX' "$BE" --include='*.py')
if [ "$TODOS_BE" -gt 0 ]; then
  issue "LOW" "Backend" "$TODOS_BE TODO/FIXME/HACK/XXX comments"
  grep -rn --include='*.py' 'TODO\|FIXME\|HACK\|XXX' "$BE" 2>/dev/null | head -10 | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# 4.5 — Magic numbers (portable, no -P)
echo -e "  ${BOLD}Potential magic numbers (numeric literals > 1 in logic):${NC}"
grep -rn --include='*.py' -E '(if|elif|while|return|==|!=|>=|<=|>|<)[[:space:]]*[0-9]{2,}' "$BE" 2>/dev/null \
  | grep -v 'status_code\|HTTP_\|port\|__\|test\|#' \
  | head -10 | while read -r line; do
  echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
done

# 4.6 — Large functions (>50 lines)
echo -e "  ${BOLD}Large functions/methods (>50 LOC):${NC}"
find "$BE" -name '*.py' | while read -r pyfile; do
  python3 -c "
import re
with open('$pyfile') as f:
    lines = f.readlines()
func_start = None
func_name = None
for i, line in enumerate(lines):
    m = re.match(r'^(\s*)(async\s+)?def\s+(\w+)', line)
    if m:
        if func_start is not None:
            length = i - func_start
            if length > 50:
                rel = '$pyfile'.replace('$ROOT/', '')
                print(f'    {length} LOC  {rel}:{func_start+1} → {func_name}()')
        func_start = i
        func_name = m.group(3)
if func_start is not None:
    length = len(lines) - func_start
    if length > 50:
        rel = '$pyfile'.replace('$ROOT/', '')
        print(f'    {length} LOC  {rel}:{func_start+1} → {func_name}()')
" 2>/dev/null
done

# 4.7 — Mutable default arguments (exclude Pydantic Field() / Query() / type annotations)
echo -e "  ${BOLD}Mutable default arguments:${NC}"
MUTABLE_TMP=$(mktemp)
grep -rn --include='*.py' -E 'def\s+\w+\(.*=\s*(\[\]|\{\}|set\(\))' "$BE" 2>/dev/null \
  | grep -v 'Field(\|Query(\|Depends(\|Body(' \
  > "$MUTABLE_TMP" 2>/dev/null || true
MUTABLE_DEFAULTS=$(wc -l < "$MUTABLE_TMP" | tr -d ' ')
if [ "$MUTABLE_DEFAULTS" -gt 0 ]; then
  issue "HIGH" "Backend" "$MUTABLE_DEFAULTS mutable default arguments (list/dict/set)"
  head -5 "$MUTABLE_TMP" | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi
rm -f "$MUTABLE_TMP"

# ──────────────────────────────────────────────────────────────────

section "5. Security (Backend)"

# 5.1 — SQL injection risks (raw SQL — only sqlalchemy execute/text, not variable names)
RAW_SQL_TMP=$(mktemp)
grep -rn --include='*.py' -E '\.(execute|raw)\(|sqlalchemy.*text\(' "$BE" 2>/dev/null \
  | grep -v 'receive_text\|send_text\|\.text\b\|entry\.text\|match_context\|ticker_text\|translated' \
  > "$RAW_SQL_TMP" 2>/dev/null || true
RAW_SQL=$(wc -l < "$RAW_SQL_TMP" | tr -d ' ')
if [ "$RAW_SQL" -gt 0 ]; then
  echo -e "  ${BOLD}$RAW_SQL raw SQL / execute / text() calls (review for injection):${NC}"
  head -10 "$RAW_SQL_TMP" | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi
rm -f "$RAW_SQL_TMP"

# 5.2 — Hardcoded secrets
SECRETS_BE=$(grep -r --include='*.py' -ciE '(api[_-]?key|secret|password|token)[[:space:]]*=[[:space:]]*"[^"]{8,}' "$BE" 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
if [ "$SECRETS_BE" -gt 0 ]; then
  issue "CRITICAL" "Backend" "$SECRETS_BE potential hardcoded secrets"
  grep -rn --include='*.py' -iE '(api[_-]?key|secret|password|token)[[:space:]]*=[[:space:]]*"[^"]{8,}' "$BE" 2>/dev/null | head -5 | while read -r line; do
    echo -e "    $(echo "$line" | sed "s|$ROOT/||")"
  done
fi

# 5.3 — Routes without Pydantic request bodies
# Scans entire function signature (up to closing ')') for Schema/BaseModel/Body params
echo -e "  ${BOLD}Routes without Pydantic request bodies:${NC}"
ROUTE_TMP=$(mktemp)
python3 -c "
import re, glob, os
api_dir = '$BE/api/'
for pyfile in glob.glob(api_dir + '**/*.py', recursive=True):
    with open(pyfile) as f:
        content = f.read()
    # Find @router.post/put/patch decorators and their functions
    for m in re.finditer(r'@router\.(post|put|patch)\(.*?\)\s*\nasync\s+def\s+\w+\((.*?)\)\s*(?:->.*?)?:', content, re.DOTALL):
        params = m.group(2)
        # Check if any parameter uses a Pydantic schema or Body()
        if not re.search(r'Schema|BaseModel|Body\(|Create|Update|Patch|Request', params):
            # Get line number
            line_start = content[:m.start()].count('\n') + 1
            rel = pyfile.replace('$ROOT/', '')
            print(f'    {rel}:{line_start} — @router.{m.group(1)}')
" 2>/dev/null > "$ROUTE_TMP" || true
ROUTE_COUNT=$(wc -l < "$ROUTE_TMP" | tr -d ' ')
if [ "$ROUTE_COUNT" -gt 0 ]; then
  cat "$ROUTE_TMP"
  echo -e "  ${BOLD}  ($ROUTE_COUNT routes — some may use path/query params legitimately)${NC}"
fi
rm -f "$ROUTE_TMP"

# 5.4 — CORS wildcard
CORS_WILD=$(gcount 'allow_origins=\["\*"\]\|allow_origins=\["*"\]' "$BE" --include='*.py')
if [ "$CORS_WILD" -gt 0 ]; then
  issue "MEDIUM" "Backend" "CORS allows all origins (*) — restrict in production"
fi

# 5.5 — Debug mode
DEBUG_MODE=$(gcount 'DEBUG\s*=\s*True\|debug=True' "$BE" --include='*.py')
if [ "$DEBUG_MODE" -gt 0 ]; then
  issue "MEDIUM" "Backend" "$DEBUG_MODE debug=True found — disable in production"
fi

# ──────────────────────────────────────────────────────────────────

section "6. Error Handling & Logging"

# 6.1 — Exception swallowing (except + pass)
SWALLOWED=$(grep -r --include='*.py' -A1 'except' "$BE" 2>/dev/null | grep -c '^\s*pass$' || true)
if [ "$SWALLOWED" -gt 2 ]; then
  issue "MEDIUM" "Backend" "$SWALLOWED swallowed exceptions (except + pass)"
fi

# 6.2 — Missing error boundaries in React
ERROR_BOUNDARIES=$(gfiles 'componentDidCatch\|ErrorBoundary' "$FE" --include='*.tsx')
if [ "$ERROR_BOUNDARIES" -eq 0 ]; then
  issue "MEDIUM" "Frontend" "No ErrorBoundary components found"
fi

# 6.3 — Unhandled promise rejections (.then without .catch)
UNHANDLED_PROMISE=$(gcount '\.then(' "$FE" --include='*.ts' --include='*.tsx')
CATCH_COUNT=$(gcount '\.catch(' "$FE" --include='*.ts' --include='*.tsx')
if [ "$UNHANDLED_PROMISE" -gt "$((CATCH_COUNT + 5))" ]; then
  issue "MEDIUM" "Frontend" ".then() calls ($UNHANDLED_PROMISE) far exceed .catch() ($CATCH_COUNT) — possible unhandled rejections"
fi

# ──────────────────────────────────────────────────────────────────

section "7. Code Duplication & Complexity"

# 7.1 — Duplicated fetch/API patterns
echo -e "  ${BOLD}API call patterns:${NC}"
FETCH_COUNT=$(gcount '\bfetch(' "$FE" --include='*.ts' --include='*.tsx')
AXIOS_COUNT=$(gcount 'axios\.' "$FE" --include='*.ts' --include='*.tsx')
API_HELPER=$(gcount 'apiClient\|useApi\|api\.' "$FE" --include='*.ts' --include='*.tsx')
echo -e "    fetch(): $FETCH_COUNT | axios: $AXIOS_COUNT | api helper: $API_HELPER"
if [ "$FETCH_COUNT" -gt 5 ] && [ "$API_HELPER" -gt 0 ]; then
  issue "LOW" "Frontend" "$FETCH_COUNT raw fetch() calls alongside API helper — consolidate"
fi

# 7.2 — Duplicated string literals (exclude test files, comments, CSS values)
echo -e "  ${BOLD}Repeated string literals (>5×, non-test, non-CSS):${NC}"
grep -roh --include='*.ts' --include='*.tsx' '"[a-z_]\{5,\}"' "$FE" 2>/dev/null \
  | grep -v '"center"\|"pointer"\|"absolute"\|"relative"\|"hidden"\|"transparent"\|"block"\|"react"\|"button"\|"solid"\|"column"\|"nowrap"\|"inherit"' \
  | sort | uniq -c | sort -rn | head -10 | while read -r count str; do
  if [ "$count" -gt 5 ]; then
    echo -e "    ${count}×  $str"
  fi
done

# ──────────────────────────────────────────────────────────────────

section "8. Testing Quality"

# 8.1 — Test file count
FE_TEST_FILES=$(find "$FE" -name '*.test.ts' -o -name '*.test.tsx' | wc -l | tr -d ' ')
BE_TEST_FILES=$(find "$BE_TESTS" -name 'test_*.py' | wc -l | tr -d ' ')
E2E_FILES=$(find "$ROOT/frontend/e2e" -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')
echo -e "  Frontend test files: $FE_TEST_FILES"
echo -e "  Backend test files:  $BE_TEST_FILES"
echo -e "  E2E test files:      $E2E_FILES"

# 8.2 — Source files without corresponding test (using tempfile to avoid subshell counter bug)
UNTESTED_FE_TMP=$(mktemp)
find "$FE" -name '*.tsx' -not -name '*.test.*' -not -name 'index.tsx' -not -path '*/types/*' | while read -r f; do
  base=$(basename "$f" .tsx)
  dir=$(dirname "$f")
  if [ ! -f "$dir/$base.test.tsx" ] && [ ! -f "$dir/$base.test.ts" ] && [ ! -f "$dir/__tests__/$base.test.tsx" ]; then
    echo "$f" >> "$UNTESTED_FE_TMP"
  fi
done
UNTESTED_FE=$(wc -l < "$UNTESTED_FE_TMP" | tr -d ' ')
echo -e "  ${BOLD}Frontend source files without test: $UNTESTED_FE${NC}"
head -15 "$UNTESTED_FE_TMP" | while read -r f; do
  echo -e "    $(echo "$f" | sed "s|$ROOT/||")"
done
if [ "$UNTESTED_FE" -gt 15 ]; then
  echo -e "    ... and $((UNTESTED_FE - 15)) more"
fi
rm -f "$UNTESTED_FE_TMP"

# Backend: check if test file imports or references the module
UNTESTED_BE_TMP=$(mktemp)
find "$BE" -name '*.py' -not -name '__init__.py' -not -path '*/migrations/*' | while read -r f; do
  base=$(basename "$f" .py)
  # Check for dedicated test file or direct import in any test
  if [ ! -f "$BE_TESTS/test_$base.py" ]; then
    if ! grep -rl "from.*\.$base import\|import.*\.$base" "$BE_TESTS" >/dev/null 2>&1; then
      echo "$f" >> "$UNTESTED_BE_TMP"
    fi
  fi
done
UNTESTED_BE=$(wc -l < "$UNTESTED_BE_TMP" | tr -d ' ')
echo -e "  ${BOLD}Backend source files without test: $UNTESTED_BE${NC}"
cat "$UNTESTED_BE_TMP" | while read -r f; do
  echo -e "    $(echo "$f" | sed "s|$ROOT/||")"
done
rm -f "$UNTESTED_BE_TMP"

# 8.3 — Skipped tests
SKIPPED_FE=$(gcount 'it\.skip\|test\.skip\|xit(\|xdescribe(' "$FE" --include='*.test.ts' --include='*.test.tsx')
SKIPPED_BE=$(gcount '@pytest.mark.skip\|pytest.skip(' "$BE_TESTS" --include='*.py')
if [ "$SKIPPED_FE" -gt 0 ] || [ "$SKIPPED_BE" -gt 0 ]; then
  issue "LOW" "Tests" "$SKIPPED_FE skipped (FE) + $SKIPPED_BE skipped (BE)"
fi

# ──────────────────────────────────────────────────────────────────

section "9. Dependencies & Config"

# 9.1 — Dependency versions
if [ -f "$ROOT/frontend/package.json" ]; then
  echo -e "  ${BOLD}Frontend dependency highlights:${NC}"
  REACT_VER=$(grep '"react"' "$ROOT/frontend/package.json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  TS_VER=$(grep '"typescript"' "$ROOT/frontend/package.json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  echo -e "    React: ${REACT_VER:-unknown}"
  echo -e "    TypeScript: ${TS_VER:-unknown}"

  CRA_VER=$(grep '"react-scripts"' "$ROOT/frontend/package.json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  echo -e "    react-scripts (CRA): ${CRA_VER:-not found}"
  if [ -n "$CRA_VER" ]; then
    issue "LOW" "Frontend" "Still using CRA ($CRA_VER) — consider Vite migration"
  fi
fi

# 9.2 — tsconfig strictness
if [ -f "$ROOT/frontend/tsconfig.json" ]; then
  STRICT=$(grep '"strict"' "$ROOT/frontend/tsconfig.json" | grep -c 'true' || true)
  NO_IMPLICIT_ANY=$(grep '"noImplicitAny"' "$ROOT/frontend/tsconfig.json" | grep -c 'true' || true)
  STRICT_NULL=$(grep '"strictNullChecks"' "$ROOT/frontend/tsconfig.json" | grep -c 'true' || true)
  echo -e "  ${BOLD}tsconfig.json:${NC}"
  if [ "$STRICT" -eq 0 ]; then
    issue "HIGH" "tsconfig.json" "strict: false — enables implicit any, no strict null checks"
  fi
  if [ "$NO_IMPLICIT_ANY" -eq 0 ] && [ "$STRICT" -eq 0 ]; then
    echo -e "    noImplicitAny:    ${RED}false${NC}"
  fi
  if [ "$STRICT_NULL" -eq 0 ] && [ "$STRICT" -eq 0 ]; then
    echo -e "    strictNullChecks: ${RED}false${NC}"
  fi
fi

# ──────────────────────────────────────────────────────────────────

section "10. File Organization & Hygiene"

# 10.1 — Unused imports (via TypeScript compiler if available)
echo -e "  ${BOLD}Unused imports:${NC}"
if command -v npx >/dev/null 2>&1 && [ -f "$ROOT/frontend/tsconfig.json" ]; then
  UNUSED_IMPORT_COUNT=$(cd "$ROOT/frontend" && npx tsc --noEmit 2>&1 | grep -c "is declared but" || true)
  echo -e "    tsc --noEmit reports $UNUSED_IMPORT_COUNT 'declared but unused' warnings"
else
  echo -e "    (npx/tsc not available — skipping)"
fi

# 10.2 — Empty files
EMPTY_FILES=$(find "$FE" "$BE" \( -name '*.ts' -o -name '*.tsx' -o -name '*.py' \) | while read -r f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -lt 2 ] && [ "$(basename "$f")" != "__init__.py" ]; then
    echo "$f"
  fi
done | wc -l | tr -d ' ')
if [ "$EMPTY_FILES" -gt 0 ]; then
  issue "LOW" "Project" "$EMPTY_FILES nearly empty source files"
fi

# 10.3 — Commented-out code blocks (>3 consecutive // lines)
echo -e "  ${BOLD}Potential commented-out code (>3 consecutive // lines):${NC}"
find "$FE" \( -name '*.ts' -o -name '*.tsx' \) -not -name '*.test.*' 2>/dev/null | while read -r f; do
  awk '/^[[:space:]]*\/\// {count++; if(count==4) printf "    %s:%d\n", FILENAME, NR-3} /^[^\/]/ {count=0}' "$f" 2>/dev/null
done | sed "s|$ROOT/||" | head -10

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total issues found: ${BOLD}$TOTAL_ISSUES${NC}"
echo -e "    ${RED}CRITICAL:${NC}  $CRITICAL"
echo -e "    ${RED}HIGH:${NC}      $HIGH"
echo -e "    ${YELLOW}MEDIUM:${NC}    $MEDIUM"
echo -e "    ${GREEN}LOW:${NC}       $LOW"
echo ""

if [ "$CRITICAL" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}ACTION REQUIRED: $CRITICAL critical issues need immediate attention.${NC}"
elif [ "$HIGH" -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}$HIGH high-priority issues should be addressed.${NC}"
else
  echo -e "  ${GREEN}${BOLD}No critical or high issues. Code quality is solid.${NC}"
fi

echo ""
echo -e "  Run individual tools for deeper analysis:"
echo -e "    Frontend:  cd frontend && npx tsc --noEmit && npx type-coverage"
echo -e "    Backend:   cd backend && flake8 app/ && mypy app/ && pytest --cov"
echo ""
