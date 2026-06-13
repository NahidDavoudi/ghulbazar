#!/bin/bash

# ============================
# backup-controllers.sh
# Copy and tar all controllers
# ============================

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_DIR="./controllers_backup_${TIMESTAMP}"
TAR_FILE="./controllers_backup_${TIMESTAMP}.tar.gz"

echo "📁 Creating temporary folder: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Searching for controller files..."

FOUND=0

while IFS= read -r -d '' file; do
    module=$(basename "$(dirname "$file")")
    dest="${OUTPUT_DIR}/${module}_$(basename "$file")"
    cp "$file" "$dest"
    echo "  ✅ Copied: $file → $dest"
    ((FOUND++))
done < <(find ./app/Modules -name "*Controller.php" -print0)

if [ "$FOUND" -eq 0 ]; then
    echo "⚠️  No controllers found!"
    rmdir "$OUTPUT_DIR"
    exit 1
fi

echo ""
echo "📦 Tarring $FOUND files..."
tar -czf "$TAR_FILE" -C "$OUTPUT_DIR" .

echo "🗑️  Removing temporary folder..."
rm -rf "$OUTPUT_DIR"

echo ""
echo "✅ Done! File saved to:"
echo "   → $TAR_FILE"
echo "   → Controller count: $FOUND"
