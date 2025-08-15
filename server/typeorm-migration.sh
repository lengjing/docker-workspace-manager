#!/bin/bash
# typeorm-migration.sh
# 用法：
#   ./typeorm-migration.sh generate Init
#   ./typeorm-migration.sh create AddUserTable
#   ./typeorm-migration.sh run
#   ./typeorm-migration.sh revert
#   ./typeorm-migration.sh show

DATA_SOURCE="./src/data-source.ts"
MIGRATIONS_DIR="./src/migrations"

case "$1" in
  generate)
    if [ -z "$2" ]; then
      echo "缺少 migration 名称"
      exit 1
    fi
    npx typeorm-ts-node-commonjs migration:generate "$MIGRATIONS_DIR/$2" -d "$DATA_SOURCE"
    ;;
  create)
    if [ -z "$2" ]; then
      echo "缺少 migration 名称"
      exit 1
    fi
    npx typeorm-ts-node-commonjs migration:create "$MIGRATIONS_DIR/$2"
    ;;
  run)
    npx typeorm-ts-node-commonjs migration:run -d "$DATA_SOURCE"
    ;;
  revert)
    npx typeorm-ts-node-commonjs migration:revert -d "$DATA_SOURCE"
    ;;
  show)
    npx typeorm-ts-node-commonjs migration:show -d "$DATA_SOURCE"
    ;;
  *)
    echo "用法: $0 {generate|create|run|revert|show} [MigrationName]"
    exit 1
    ;;
esac
