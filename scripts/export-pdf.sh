#!/bin/zsh
# Runs Obsidian's own "Export to PDF" on a dev-vault note through the Obsidian CLI, to check
# print output after a change or an Obsidian update (route chosen in spike S2).
#
# Usage: scripts/export-pdf.sh <note path in vault> <out dir> [pageSize A4|A5|Letter|…]
#        [landscape true|false] [margin 0 default|2 minimal|1 none] [downscale 10-100]
#        [includeName true|false]
#
# Writes <out dir>/<note>.pdf and one PNG per page, and prints a check of the export window
# taken just before printing (tabs drawn, parts wider than the text column).
# The save dialog is stubbed and the PDF is not opened; the export options saved in
# dev-vault/.obsidian/app.json are put back afterwards. Obsidian must have dev-vault open.
# Every call passes vault=dev-vault: without it the CLI may act on another open vault.
S=${0:A:h}
cd "$S/../dev-vault" || exit 1
ob() { obsidian vault=dev-vault "$@"; }

name=$(ob eval code="app.vault.getName()")
[[ "$name" == "=> dev-vault" ]] || { echo "Refusing: the CLI reached '$name'"; exit 1; }

note=$1; dir=${2:A}; size=${3:-A4}; land=${4:-false}; margin=${5:-0}; down=${6:-100}; title=${7:-false}
[[ -n "$note" && -n "$2" ]] || { sed -n '5,7p' "$0"; exit 1; }
mkdir -p "$dir"
base=${${note:t}%.md}
out="$dir/$base.pdf"
rm -f -- "$out" "$dir/$base"-*.png(N)

# A covered window stops drawing (requestAnimationFrame, observers); never bring it to the front.
ob eval code="require('@electron/remote').getCurrentWebContents().setBackgroundThrottling(false)" >/dev/null
ob open path="$note" >/dev/null
sleep 2
ob eval code="window.__songfolioExportOpts={out:'$out',pageSize:'$size',landscape:$land,margin:'$margin',downscale:$down,includeName:$title}; 'ok'" >/dev/null
ob eval code="$(cat "$S/export-pdf.js")" >/dev/null
for i in {1..70}; do
	st=$(ob eval code="JSON.stringify(window.__songfolioExport)")
	case "$st" in *'"status":"done"'*|*'"status":"timeout"'*) break;; esac
	sleep 1
done
echo "${st#=> }"
[[ -f "$out" ]] || { echo "No PDF written"; exit 1; }
pdfinfo "$out" | grep -E "Pages|Page size"
pdftoppm -r 60 -png "$out" "$dir/$base"
ls "$dir/$base"-*.png
