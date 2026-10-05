#!/usr/bin/env python3
"""Rewrite ISO dates in markdown prose to dd-MM-YYYY (CONTRIBUTING.md section 6).

Skips fenced code blocks, inline code, URLs and paths, and ISO date-times
(anything followed by 'T' and a time), because those are data or identifiers.
Usage: python3 scripts/format-dates.py [--check] <file.md> ...
"""
import re, sys

ISO = re.compile(r"(?<![\w/.:-])(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?![\w-]|T\d)")
SEGMENT = re.compile(r"(`[^`\n]*`|https?://\S+|\S*/\S*)")

def convert_line(line):
    out = []
    for i, part in enumerate(SEGMENT.split(line)):
        if i % 2 == 1:
            out.append(part)  # code span, URL, or path: untouched
        else:
            out.append(ISO.sub(lambda m: f"{m.group(3)}-{m.group(2)}-{m.group(1)}", part))
    return "".join(out)

def convert(text):
    out, fenced = [], False
    for line in text.split("\n"):
        if line.strip().startswith("```"):
            fenced = not fenced
            out.append(line)
        elif fenced:
            out.append(line)
        else:
            out.append(convert_line(line))
    return "\n".join(out)

def main(argv):
    check = "--check" in argv
    changed = 0
    for path in [a for a in argv if a != "--check"]:
        with open(path, encoding="utf-8") as f:
            src = f.read()
        dst = convert(src)
        if dst != src:
            changed += 1
            if check:
                print(f"needs conversion: {path}")
            else:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(dst)
                print(f"converted: {path}")
    return 1 if (check and changed) else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
