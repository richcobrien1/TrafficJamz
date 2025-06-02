#!/bin/bash
set -e  # Exit on errors

# Define script path
SCRIPT_NAME="kubernetes-cluster-ubuntu-calico.sh"

# Ensure we're in the correct directory
if [[ ! -f "$SCRIPT_NAME" ]]; then
  echo "❌ Error: $SCRIPT_NAME not found in the current directory!"
  exit 1
fi

# Set execution permissions
echo "🔧 Setting executable permissions..."
chmod +x "$SCRIPT_NAME"

# Run the Kubernetes setup script
echo "🚀 Running $SCRIPT_NAME..."
./"$SCRIPT_NAME"

echo "✅ Kubernetes setup complete!"