#!/bin/zsh
# Spike S2: runs Obsidian's own "Export to PDF" on a dev-vault note through the Obsidian CLI.
# Usage: scripts/spike-export-pdf.sh <note path in vault> <absolute out.pdf> [pageSize A4|Letter|…]
#        [landscape true|false] [margin 0 default|2 minimal|1 none] [downscale 10-100]
# The save dialog is stubbed to <out.pdf> and the PDF is not opened; both are restored after.
# Every obsidian call passes vault=dev-vault: without it the CLI may act on another open vault.
# Side effect: the export dialog saves its options to dev-vault/.obsidian/app.json.
S=${0:A:h}
cd "$S/../dev-vault" || exit 1
ob() { obsidian vault=dev-vault "$@"; }
name=$(ob eval code="app.vault.getName()")
[[ "$name" == "=> dev-vault" ]] || { echo "Refusing: CLI reached '$name'"; exit 1; }
note=$1; out=$2; size=${3:-A4}; land=${4:-false}; margin=${5:-0}; down=${6:-100}
rm -f "$out"
ob open path="$note" >/dev/null
sleep 2
ob dev:debug on >/dev/null
ob dev:console clear >/dev/null
ob eval code="window.__s2opts={out:'$out',pageSize:'$size',landscape:$land,margin:'$margin',downscale:$down}; 'ok'" >/dev/null
ob eval code="$(cat $S/spike-export-pdf.js)"
for i in {1..70}; do
	st=$(ob eval code="JSON.stringify(window.__s2)")
	case "$st" in *'"status":"done"'*|*'"status":"timeout"'*) break;; esac
	sleep 1
done
echo "$st"
ob dev:console level=debug limit=40
ls -la "$out" && pdfinfo "$out" | grep -E "Pages|Page size"
