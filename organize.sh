#!/bin/bash
set -e

echo "🗂 Organizing Docker scripts into subfolders..."

# Create target folders
mkdir -p docker/build docker/test

# Move build scripts
mv docker_build.sh              docker/build/build_all.sh
mv docker_build_be.sh           docker/build/build_be.sh
mv docker_build_fe.sh           docker/build/build_fe.sh
mv docker-compose_local_only.sh docker/build/dev_compose.sh

# Move test scripts
mv docker_test.sh    docker/test/test_all.sh
mv docker_test_be.sh docker/test/test_be.sh
mv docker_test_fe.sh docker/test/test_fe.sh

echo "✅ Docker scripts reorganized successfully!"
