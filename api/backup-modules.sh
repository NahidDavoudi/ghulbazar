#!/bin/bash

PROJECT_ROOT="$(pwd)"
MODULES_DIR="$PROJECT_ROOT/app/Modules"
BACKUP_DIR="$PROJECT_ROOT/backup"

if [ ! -d "$MODULES_DIR" ]; then
    echo "❌ app/Modules directory not found. Please run from the project root."
    exit 1
fi

# Find latest version
latest=0
for dir in "$BACKUP_DIR"/v*; do
    if [ -d "$dir" ]; then
        ver=$(basename "$dir" | grep -oE '[0-9]+')
        [ "$ver" -gt "$latest" ] && latest=$ver
    fi
done

new_version=$((latest + 1))
version_dir="$BACKUP_DIR/v${new_version}"
mkdir -p "$version_dir"/{models,services,controllers}

echo "📦 Creating backup version v${new_version}"

count=0

# Enable nullglob so that empty globs expand to nothing
shopt -s nullglob

for module_path in "$MODULES_DIR"/*/; do
    module_name=$(basename "$module_path")
    
    # 1. Controllers
    for ctrl in "$module_path"*Controller.php; do
        fname=$(basename "$ctrl")
        cp "$ctrl" "$version_dir/controllers/${module_name}_${fname}"
        ((count++))
        echo "  ✅ Controller: $fname"
    done
    
    # 2. Services
    for srv in "$module_path"*Service.php; do
        fname=$(basename "$srv")
        cp "$srv" "$version_dir/services/${module_name}_${fname}"
        ((count++))
        echo "  ✅ Service: $fname"
    done
    
    # 3. Models
    for mdl in "$module_path"*Model.php; do
        fname=$(basename "$mdl")
        cp "$mdl" "$version_dir/models/${module_name}_${fname}"
        ((count++))
        echo "  ✅ Model: $fname"
    done
done

shopt -u nullglob  # Restore default nullglob setting

echo ""
echo "✅ Backup completed successfully."
echo "   📁 $count files copied → $version_dir"