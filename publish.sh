#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source $DIR/.settings
source $DIR/.version
cd src
clasp push
clasp deploy --deploymentId $publishDeploymentId --description "$VERSION@$BUILD"
