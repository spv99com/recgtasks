#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/config.sh
URL=https://script.google.com/macros/s/$HEAD/exec
python -mwebbrowser $URL