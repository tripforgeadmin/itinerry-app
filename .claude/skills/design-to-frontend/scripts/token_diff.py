#!/usr/bin/env python3
"""
token_diff.py — compare the design-side @theme tokens against the live app tokens.

Surfaces the drift the Phase 0 gap report must capture:
  - tokens only in the design file (need to be added to the app)
  - tokens only in the app (extra / renamed)
  - tokens whose values differ
  - whether a `.dark {}` theme exists in each file

Usage:
    python3 token_diff.py
    python3 token_diff.py <design_tokens.css> <app_globals.css>

Defaults (resolved relative to the repo root, four levels up from this script):
    design : docs/design/styles/tokens.css
    app    : app/globals.css

Output is a plain-text report. Exit code is 0 on success, 2 if a file is missing.
This is a reconciliation aid, not a formatter — it never edits files.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DESIGN = REPO_ROOT / "docs/design/styles/tokens.css"
DEFAULT_APP = REPO_ROOT / "app/globals.css"

# Matches `--token-name: value;` (value up to the first semicolon), ignoring comments.
TOKEN_RE = re.compile(r"--([A-Za-z0-9-]+)\s*:\s*([^;]+);")


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)


def extract_theme_tokens(css: str) -> dict[str, str]:
    """Tokens declared inside the top-level @theme {...} block."""
    css = strip_comments(css)
    idx = css.find("@theme")
    if idx == -1:
        # No @theme block — fall back to any :root / top-level declarations.
        return {name: val.strip() for name, val in TOKEN_RE.findall(css)}
    brace = css.find("{", idx)
    if brace == -1:
        return {}
    depth, end = 0, len(css)
    for i in range(brace, len(css)):
        if css[i] == "{":
            depth += 1
        elif css[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    block = css[brace + 1:end]
    return {name: val.strip() for name, val in TOKEN_RE.findall(block)}


def has_dark_theme(css: str) -> bool:
    return bool(re.search(r"\.dark\s*\{", strip_comments(css)))


def load(path: Path) -> str:
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(2)
    return path.read_text(encoding="utf-8")


def section(title: str) -> None:
    print(f"\n{title}\n" + "-" * len(title))


def main() -> None:
    args = sys.argv[1:]
    design_path = Path(args[0]) if len(args) >= 1 else DEFAULT_DESIGN
    app_path = Path(args[1]) if len(args) >= 2 else DEFAULT_APP

    design_css, app_css = load(design_path), load(app_path)
    design, app = extract_theme_tokens(design_css), extract_theme_tokens(app_css)

    print("Token diff — design vs app")
    print(f"  design : {design_path}  ({len(design)} tokens)")
    print(f"  app    : {app_path}  ({len(app)} tokens)")

    only_design = sorted(set(design) - set(app))
    only_app = sorted(set(app) - set(design))
    changed = sorted(k for k in (set(design) & set(app)) if design[k] != app[k])

    section(f"Only in DESIGN — add to app ({len(only_design)})")
    print("\n".join(f"  --{k}: {design[k]}" for k in only_design) or "  (none)")

    section(f"Only in APP — extra / renamed ({len(only_app)})")
    print("\n".join(f"  --{k}: {app[k]}" for k in only_app) or "  (none)")

    section(f"Value CHANGED ({len(changed)})")
    print("\n".join(f"  --{k}: design={design[k]!r}  app={app[k]!r}" for k in changed) or "  (none)")

    section("Dark theme (.dark {})")
    print(f"  design : {'present' if has_dark_theme(design_css) else 'MISSING'}")
    print(f"  app    : {'present' if has_dark_theme(app_css) else 'MISSING'}")

    section("Summary")
    print(f"  {len(only_design)} to add · {len(only_app)} extra · {len(changed)} changed")
    print("  Use this to drive the Phase 1 token reconciliation. Review each before applying —")
    print("  some 'only in app' tokens may be intentional app-only additions, not drift.")


if __name__ == "__main__":
    main()
