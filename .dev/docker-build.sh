#!/usr/bin/env bash

IMAGE_NAME="${IMAGE_NAME:-$(basename $(pwd))}"

DOCKER_BUILD="docker build -t '${IMAGE_NAME}:development' ."
eval "$DOCKER_BUILD"