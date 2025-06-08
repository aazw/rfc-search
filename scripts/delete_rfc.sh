#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd $SCRIPT_DIR/../rfc/

rm *.pdf
rm *.ps
rm *.txt
rm RFC-all.zip
rm -rf a
