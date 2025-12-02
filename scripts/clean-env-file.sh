#!/bin/bash
# Clean environment variables in .env file
# Removes quotes around values to prevent parsing issues

set -e

ENV_FILE="${1:-jamz-server/.env.local}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File not found: $ENV_FILE"
    exit 1
fi

echo "🧹 Cleaning environment file: $ENV_FILE"

# Create backup
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "📦 Backup created: $BACKUP_FILE"

# Clean the file
# Remove quotes from values but preserve comments and empty lines
sed -i.tmp '
  # Skip empty lines and comments
  /^[[:space:]]*$/b
  /^[[:space:]]*#/b
  
  # For lines with key=value, remove quotes around the value
  s/^\([A-Z_][A-Z0-9_]*\)="\(.*\)"$/\1=\2/
  s/^\([A-Z_][A-Z0-9_]*\)='\''\(.*\)'\''$/\1=\2/
' "$ENV_FILE"

# Remove temp file
rm -f "${ENV_FILE}.tmp"

echo "✅ Environment file cleaned"
echo ""
echo "Changes made:"
diff "$BACKUP_FILE" "$ENV_FILE" || true
echo ""
echo "If changes look incorrect, restore with:"
echo "  cp $BACKUP_FILE $ENV_FILE"
