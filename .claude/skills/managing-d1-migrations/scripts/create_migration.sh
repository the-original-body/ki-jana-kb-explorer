#!/bin/bash
# Usage: ./create_migration.sh "description_of_change"

if [ -z "$1" ]; then
  echo "Error: Description required."
  echo "Usage: ./create_migration.sh \"add_users_table\""
  exit 1
fi

# Ensure migrations directory exists
mkdir -p migrations

# Generate generic timestamp (YYYYMMDDHHMMSS)
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DESCRIPTION=$(echo "$1" | tr ' ' '_')
FILENAME="migrations/${TIMESTAMP}_${DESCRIPTION}.sql"

touch "$FILENAME"
echo "Created migration: $FILENAME"
echo "-- Add your SQL here. Remember D1 limitations (No transactions, limited ALTER)." > "$FILENAME"
