#!/bin/sh
# detect pending changes
git diff --quiet --exit-code
pendingCommit=$?
if [ $pendingCommit -eq 1 ]
then
  echo "Git changes detected. Please, commit first."
  exit 1
fi

bit branch master
git pull

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.settings
source $DIR/.version

yarn clasp push -f
yarn clasp deploy --deploymentId $publishDeploymentId --description "$VERSION@$BUILD"