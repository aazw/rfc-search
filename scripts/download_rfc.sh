#!/bin/bash

set -eu

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd $SCRIPT_DIR/../rfc/ 

curl -iL https://www.rfc-editor.org/in-notes/tar/RFC-all.zip -o RFC-all.zip
unzip -o RFC-all.zip -x "*.pdf" || true
