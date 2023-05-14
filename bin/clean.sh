#!/bin/sh

dir=$(dirname $0)/..
cd $dir || exit 1

rm public/dist/*
