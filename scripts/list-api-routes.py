#!/usr/bin/env python3
"""Enumerate every REST route exposed by apps/backend's NestJS controllers.

Regex-parses `*.controller.ts` files for @Controller/@Get|Post|Put|Patch|Delete/
@UseGuards/@Public/@Roles decorators. Does not require building or running the
backend (no database needed) — this is the CI-independent way to regenerate
docs/api/README.md's route index. For full request/response JSON schemas, use
`make export-openapi` instead (see docs/api/README.md).

Usage:
    python3 scripts/list-api-routes.py            # markdown table, grouped by domain
    python3 scripts/list-api-routes.py --json      # raw structured data
"""
import re
import os
import sys
import json
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(__file__), "..", "apps", "backend", "src")

CONTROLLER_RE = re.compile(r"@Controller\(\s*(\[[^\]]*\]|['\"`]([^'\"`]*)['\"`])?\s*\)")
CLASS_RE = re.compile(r"export class (\w+)")
GUARD_RE = re.compile(r"@UseGuards\(([^)]*)\)")
ROUTE_RE = re.compile(r"@(Get|Post|Put|Patch|Delete)\(\s*(['\"`]([^'\"`]*)['\"`])?\s*\)")
METHOD_NAME_RE = re.compile(r"^\s*(?:async\s+)?(\w+)\s*\(")
API_TAGS_RE = re.compile(r"@ApiTags\(\s*['\"`]([^'\"`]*)['\"`]")
PUBLIC_RE = re.compile(r"@Public\(\)")
ROLES_RE = re.compile(r"@Roles\(([^)]*)\)")


def extract(path):
    src = open(path).read()
    lines = src.split("\n")

    cm = CONTROLLER_RE.search(src)
    base = ""
    if cm and cm.group(2):
        base = cm.group(2)
    elif cm and cm.group(1) and cm.group(1).startswith("["):
        base = cm.group(1)

    tagm = API_TAGS_RE.search(src)
    tag = tagm.group(1) if tagm else ""

    cls = CLASS_RE.search(src)
    classname = cls.group(1) if cls else os.path.basename(path)

    class_start_idx = next((i for i, l in enumerate(lines) if "export class" in l), None)
    class_level_guard = ""
    if class_start_idx is not None:
        pre = "\n".join(lines[max(0, class_start_idx - 10):class_start_idx])
        gm = GUARD_RE.search(pre)
        if gm:
            class_level_guard = gm.group(1)

    results = []
    pending_guard = pending_roles = pending_public = None
    pending_public = False
    for i, line in enumerate(lines):
        gm = GUARD_RE.search(line)
        if gm:
            pending_guard = gm.group(1)
        if PUBLIC_RE.search(line):
            pending_public = True
        rm = ROLES_RE.search(line)
        if rm:
            pending_roles = rm.group(1)
        m = ROUTE_RE.search(line)
        if m:
            method = m.group(1).upper()
            sub = m.group(3) or ""
            name = ""
            for j in range(i + 1, min(i + 4, len(lines))):
                nm = METHOD_NAME_RE.match(lines[j])
                if nm:
                    name = nm.group(1)
                    break
            results.append({
                "file": os.path.relpath(path, os.path.join(os.path.dirname(__file__), "..")),
                "class": classname,
                "tag": tag,
                "base": base,
                "sub": sub,
                "method": method,
                "handler": name,
                "guard": pending_guard or class_level_guard,
                "public": pending_public,
                "roles": pending_roles,
            })
            pending_guard = pending_roles = None
            pending_public = False
    return results


def full_path(base, sub):
    parts = [p.strip("'\" ") for p in [base, sub] if p]
    joined = "/".join(p.strip("/") for p in parts if p.strip("/"))
    return "/" + joined if joined else "/"


def auth_desc(r):
    if r["public"]:
        return "Public"
    g = r["guard"] or ""
    if "JwtAuthGuard" in g and "RolesGuard" in g:
        role = f" (roles: {r['roles']})" if r["roles"] else ""
        return f"JWT + Roles{role}"
    if "JwtAuthGuard" in g:
        return "JWT"
    if g:
        return g
    return "—"


def main():
    files = []
    for dirpath, _, filenames in os.walk(ROOT):
        for f in filenames:
            if f.endswith(".controller.ts"):
                files.append(os.path.join(dirpath, f))
    files.sort()

    routes = []
    for path in files:
        routes.extend(extract(path))

    if "--json" in sys.argv:
        print(json.dumps(routes, indent=2))
        return

    domains = defaultdict(list)
    for r in routes:
        rel = os.path.relpath(r["file"], os.path.join("apps", "backend", "src"))
        domains[rel.split(os.sep)[0]].append(r)

    for domain in sorted(domains):
        drs = domains[domain]
        print(f"### {domain} ({len(drs)} routes)\n")
        by_class = defaultdict(list)
        for r in drs:
            by_class[r["class"]].append(r)
        for cls, rs in by_class.items():
            print(f"**`{cls}`** — `{rs[0]['file']}`\n")
            print("| Method | Path | Auth | Handler |")
            print("|---|---|---|---|")
            for r in rs:
                print(f"| {r['method']} | `{full_path(r['base'], r['sub'])}` | {auth_desc(r)} | `{r['handler']}` |")
            print()

    print(f"<!-- {len(routes)} routes across {len(domains)} domains, {len(files)} controller files -->", file=sys.stderr)


if __name__ == "__main__":
    main()
