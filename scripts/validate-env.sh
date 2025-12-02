#!/bin/bash
# Pre-deployment validation script
# Checks environment variables before deploying to production

set -e

ENV_FILE="${1:-jamz-server/.env.local}"
ERRORS=0

echo "🔍 Validating environment file: $ENV_FILE"
echo "=========================================="

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File not found: $ENV_FILE"
    exit 1
fi

# Function to check for quoted values
check_quoted_values() {
    local count=$(grep -E '^[A-Z_][A-Z0-9_]*=".*"$' "$ENV_FILE" | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Found $count variables with double quotes:"
        grep -E '^[A-Z_][A-Z0-9_]*=".*"$' "$ENV_FILE" | head -10
        echo ""
        echo "💡 Run './scripts/clean-env-file.sh' to fix automatically"
        ERRORS=$((ERRORS + 1))
    fi
    
    count=$(grep -E "^[A-Z_][A-Z0-9_]*='.*'$" "$ENV_FILE" | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Found $count variables with single quotes:"
        grep -E "^[A-Z_][A-Z0-9_]*='.*'$" "$ENV_FILE" | head -10
        echo ""
        echo "💡 Run './scripts/clean-env-file.sh' to fix automatically"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to validate critical variables
validate_critical_vars() {
    local critical_vars=(
        "PORT"
        "MONGODB_URI"
        "JWT_SECRET"
        "MEDIASOUP_ANNOUNCED_IP"
    )
    
    for var in "${critical_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            echo "❌ Missing critical variable: $var"
            ERRORS=$((ERRORS + 1))
        else
            local value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
            # Check if value is empty
            if [ -z "$value" ]; then
                echo "❌ Empty value for: $var"
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
}

# Function to validate PORT value
validate_port() {
    if grep -q "^PORT=" "$ENV_FILE"; then
        local port_value=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        # Check if it's a valid number
        if ! [[ "$port_value" =~ ^[0-9]+$ ]]; then
            echo "❌ PORT is not a valid number: $port_value"
            ERRORS=$((ERRORS + 1))
        elif [ "$port_value" -lt 1 ] || [ "$port_value" -gt 65535 ]; then
            echo "❌ PORT out of range (1-65535): $port_value"
            ERRORS=$((ERRORS + 1))
        else
            echo "✅ PORT is valid: $port_value"
        fi
    fi
}

# Function to check for duplicate variables
check_duplicates() {
    local dups=$(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | cut -d'=' -f1 | sort | uniq -d)
    if [ -n "$dups" ]; then
        echo "❌ Duplicate variables found:"
        echo "$dups"
        ERRORS=$((ERRORS + 1))
    fi
}

# Run all checks
echo ""
echo "Checking for quoted values..."
check_quoted_values

echo ""
echo "Validating critical variables..."
validate_critical_vars

echo ""
echo "Validating PORT..."
validate_port

echo ""
echo "Checking for duplicates..."
check_duplicates

echo ""
echo "=========================================="
if [ "$ERRORS" -eq 0 ]; then
    echo "✅ All validation checks passed!"
    exit 0
else
    echo "❌ Validation failed with $ERRORS error(s)"
    echo ""
    echo "To fix automatically, run:"
    echo "  ./scripts/clean-env-file.sh $ENV_FILE"
    exit 1
fi
