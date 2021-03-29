#!/bin/sh
# detect pending changes
git diff --quiet --exit-code
pendingCommit=$?
if [ $pendingCommit -eq 1 ]
then
  echo "Git changes detected. Please, commit first."
  exit 1
fi

git checkout master
gitOK=$?
if [ $gitOK -ne 0 ]
then
  echo "Git can not checkout master. Please, solve issue first."
  exit 1
fi

git pull
gitOK=$?
if [ $gitOK -ne 0 ]
then
  echo "Git problems detected. Please, solve them first."
  exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.settings
source $DIR/.version

yarn clasp push -f
yarn clasp deploy --deploymentId $publishDeploymentId --description "$VERSION@$BUILD"