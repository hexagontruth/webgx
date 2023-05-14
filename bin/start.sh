#!/bin/bash

export env=${env:-development}

dir=$(dirname $0)/..

cd $dir

node src/server
# if [[ $NODE_ENV == "production" ]]; then
#   node src/server
# else
#   npx webpack serve --mode development
# fi
