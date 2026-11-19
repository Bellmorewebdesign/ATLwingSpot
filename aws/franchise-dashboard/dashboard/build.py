#!/usr/bin/env python3
"""
Copy web/ into a folder ready to upload, without the comments.

    python3 build.py web OUT_DIR

The comments in web/ explain how the dashboard works; the published copy does
not need to. Removed:

* HTML: every <!-- ... --> comment.
* CSS: every /* ... */ comment.
* JS: only whole-line comments: lines that are nothing but // ..., and
  /* ... */ blocks that start a line and end one. Comments sharing a line with
  code are left alone: stripping those safely needs a real JS parser (a regex
  literal like /\\//g or a string like 'https://' looks like a comment to a
  simple scan), and they give nothing away.

The browser test (tests/ui.smoke.js) runs against this output, so a build that
broke the page would fail it.
"""
import pathlib
import re
import shutil
import sys


def strip_html(text):
    return re.sub(r"[ \t]*<!--.*?-->[ \t]*\n?", "", text, flags=re.S)


def strip_css(text):
    return re.sub(r"/\*.*?\*/[ \t]*\n?", "", text, flags=re.S)


def strip_js(text):
    out, in_block = [], False
    for line in text.splitlines(keepends=True):
        bare = line.strip()
        if in_block:
            if bare.endswith("*/"):
                in_block = False
            continue
        if bare.startswith("//"):
            continue
        if bare.startswith("/*"):
            if not bare.endswith("*/") or bare == "/*":
                in_block = True
            continue
        out.append(line)
    return re.sub(r"\n{3,}", "\n\n", "".join(out))


STRIP = {".html": strip_html, ".css": strip_css, ".js": strip_js}


def main(src, dst):
    src, dst = pathlib.Path(src), pathlib.Path(dst)
    shutil.copytree(src, dst, dirs_exist_ok=True)
    for path in dst.rglob("*"):
        fn = STRIP.get(path.suffix)
        if fn and path.is_file():
            path.write_text(fn(path.read_text(encoding="utf-8")), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: build.py SRC_DIR OUT_DIR")
    main(sys.argv[1], sys.argv[2])
