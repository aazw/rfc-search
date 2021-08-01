#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ls -a $SCRIPT_DIR/../rfc/

curl -iL https://www.rfc-editor.org/in-notes/tar/RFC-all.zip -o $SCRIPT_DIR/../rfc/RFC-all.zip
cd $SCRIPT_DIR/../rfc/ 
unzip RFC-all.zip
