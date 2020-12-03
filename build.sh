#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.version
BUILD=$((BUILD+1))
echo "BUILD=$BUILD" > $DIR/.version
echo "VERSION=$VERSION" >> $DIR/.version
sed -i -E "s/(recgversion.*[(]v)(.*)([)].*)/\1$VERSION@$BUILD\3/g" src/index.html
sed -E "s/^var codeBuild.*;/var codeBuild = '$BUILD';/s;t;d" src/Code.js
git commit -m "version bump $VERSION@$BUILD"
cd src
clasp push
