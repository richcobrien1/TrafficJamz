#!/bin/bash
set -e

SOURCE="jamz-client-vite/public/icon-512.png"
DEST_BASE="mobile/Android/app/src/main/res"

echo "Generating Android icons from $SOURCE..."

# Create mipmap directories if they don't exist
mkdir -p "$DEST_BASE/mipmap-hdpi"
mkdir -p "$DEST_BASE/mipmap-mdpi"
mkdir -p "$DEST_BASE/mipmap-xhdpi"
mkdir -p "$DEST_BASE/mipmap-xxhdpi"
mkdir -p "$DEST_BASE/mipmap-xxxhdpi"

# Generate launcher icons
sharp resize 72 72 < "$SOURCE" > "$DEST_BASE/mipmap-hdpi/ic_launcher.png"
sharp resize 48 48 < "$SOURCE" > "$DEST_BASE/mipmap-mdpi/ic_launcher.png"
sharp resize 96 96 < "$SOURCE" > "$DEST_BASE/mipmap-xhdpi/ic_launcher.png"
sharp resize 144 144 < "$SOURCE" > "$DEST_BASE/mipmap-xxhdpi/ic_launcher.png"
sharp resize 192 192 < "$DEST_BASE/mipmap-xxxhdpi/ic_launcher.png" < "$SOURCE"

# Generate foreground icons
sharp resize 72 72 < "$SOURCE" > "$DEST_BASE/mipmap-hdpi/ic_launcher_foreground.png"
sharp resize 48 48 < "$SOURCE" > "$DEST_BASE/mipmap-mdpi/ic_launcher_foreground.png"
sharp resize 96 96 < "$SOURCE" > "$DEST_BASE/mipmap-xhdpi/ic_launcher_foreground.png"
sharp resize 144 144 < "$SOURCE" > "$DEST_BASE/mipmap-xxhdpi/ic_launcher_foreground.png"
sharp resize 192 192 < "$SOURCE" > "$DEST_BASE/mipmap-xxxhdpi/ic_launcher_foreground.png"

# Generate round icons
sharp resize 72 72 < "$SOURCE" > "$DEST_BASE/mipmap-hdpi/ic_launcher_round.png"
sharp resize 48 48 < "$SOURCE" > "$DEST_BASE/mipmap-mdpi/ic_launcher_round.png"
sharp resize 96 96 < "$SOURCE" > "$DEST_BASE/mipmap-xhdpi/ic_launcher_round.png"
sharp resize 144 144 < "$SOURCE" > "$DEST_BASE/mipmap-xxhdpi/ic_launcher_round.png"
sharp resize 192 192 < "$SOURCE" > "$DEST_BASE/mipmap-xxxhdpi/ic_launcher_round.png"

echo "✅ All Android icons generated!"
