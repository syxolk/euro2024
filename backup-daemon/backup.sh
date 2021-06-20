#!/bin/sh
set -e

NOW=$(date +'%Y%m%d_%H%M%S')
BACKUP_FILE="/backups/db_$NOW.sql.gz"
PGPASSWORD=123456 pg_dump -h db -U euro2020 euro2020 | gzip > "$BACKUP_FILE"
