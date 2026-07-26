#!/usr/bin/env bash
# Renders every *.puml in this folder to png/ and svg/.
#
#   ./render.sh                 # render all diagrams
#   ./render.sh 03-data-model   # render one (with or without the .puml suffix)
#
# Requires a JDK. PlantUML itself is downloaded on first run into .cache/ (git-ignored).
# Graphviz is optional: if `dot` is on PATH it is used, otherwise PlantUML's built-in
# Smetana layout engine is used instead.

set -euo pipefail

cd "$(dirname "$0")"

PLANTUML_VERSION="1.2025.4"
CACHE_DIR=".cache"
JAR="${PLANTUML_JAR:-$CACHE_DIR/plantuml-$PLANTUML_VERSION.jar}"

if ! command -v java >/dev/null 2>&1; then
  echo "error: java not found. Install a JDK (e.g. brew install openjdk)." >&2
  exit 1
fi

if [ ! -f "$JAR" ]; then
  echo "Downloading PlantUML $PLANTUML_VERSION ..."
  mkdir -p "$CACHE_DIR"
  curl -fsSL -o "$JAR" \
    "https://github.com/plantuml/plantuml/releases/download/v$PLANTUML_VERSION/plantuml-$PLANTUML_VERSION.jar"
fi

# Graphviz gives nicer layouts; Smetana keeps the script dependency-free without it.
if command -v dot >/dev/null 2>&1; then
  LAYOUT=()
  echo "Using Graphviz for layout."
else
  LAYOUT=(-Playout=smetana)
  echo "Graphviz (dot) not found — using PlantUML's built-in Smetana layout."
fi

if [ "$#" -gt 0 ]; then
  SOURCES=()
  for name in "$@"; do
    SOURCES+=("${name%.puml}.puml")
  done
else
  SOURCES=(*.puml)
fi

# ${arr[@]+"${arr[@]}"} — macOS ships bash 3.2, where expanding an empty array under
# `set -u` is an "unbound variable" error. LAYOUT is empty whenever Graphviz is used.
java -jar "$JAR" ${LAYOUT[@]+"${LAYOUT[@]}"} -tpng -o png "${SOURCES[@]}"
java -jar "$JAR" ${LAYOUT[@]+"${LAYOUT[@]}"} -tsvg -o svg "${SOURCES[@]}"

echo "Done: png/ and svg/ updated."
