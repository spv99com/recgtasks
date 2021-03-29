#!/bin/sh
# detect pending changes
git diff --quiet --exit-code
pendingCommit=$?
if [ $pendingCommit -eq 1 ]
then
  echo "Git changes detected. Please, commit first."
  exit
fi

# get curent version & build number
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.version

# increase build number
BUILD=$((BUILD+1))

# store updated build number
echo "BUILD=$BUILD" > $DIR/.version
echo "VERSION=$VERSION" >> $DIR/.version

# write version and build number to respective files
sed -i -E "s/(recgversion.*[(]v)(.*)([)].*)/\1$VERSION@$BUILD\3/g" src/html/index.html
sed -i -E "s/^var codeBuild.*;/var codeBuild = '$BUILD';/" src/Code.js

# commit changes
git commit . -m "version bump $VERSION@$BUILD"
git push
