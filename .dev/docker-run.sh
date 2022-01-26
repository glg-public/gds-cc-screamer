#!/usr/bin/env bash

IMAGE_NAME="${IMAGE_NAME:-$(basename $(pwd))}"

DOCKER_RUN="docker run \
             -it \
             --rm \
             --name gds-cc-screamer \
             --mount type=bind,source="$(pwd)"/checks,target=/app/checks,readonly \
             --mount type=bind,source="$(pwd)"/test,target=/app/test,readonly \
             ${IMAGE_NAME}:development"

eval "$DOCKER_RUN"