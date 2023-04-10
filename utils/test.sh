#!/bin/bash

set -eo pipefail
cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

export NVM_DIR=$HOME/.nvm
source "$NVM_DIR/nvm.sh"

# This are versions 12, 14, 16, 18
NODE_VERSIONS=("lts/erbium" "lts/fermium" "lts/gallium" "lts/hydrogen")

for NODE_VERSION in "${NODE_VERSIONS[@]}"; do
  nvm install "$NODE_VERSION"
  nvm exec "$NODE_VERSION" npm install
  nvm exec "$NODE_VERSION" npm test
done
