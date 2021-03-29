#!/bin/sh
# detect pending changes
git diff --quiet --exit-code
pendingCommit=$?
if [ $pendingCommit -eq 1 ]
then
  echo "Git changes detected. Please, commit first."
  exit 1
fi

if [ ! -f ~/.clasprc.json -a ! -f ./clasprc.json ]; then
  echo "Saving CLASP credentials to local file"
  echo $CLASP_ID > ./clasprc.json
  SAVED_CLASP=1
fi


DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.settings
source $DIR/.version

yarn clasp push -f
yarn clasp deploy --deploymentId $publishDeploymentId --description "$VERSION@$BUILD"

if [ $SAVED_CLASP -eq 1 ]; then
  rm ./clasprc.json
fi
