#!/bin/bash

set -e

echo "🔄 Starting TrafficJamz page structure refactor..."

# Create new domain folders
mkdir -p auth dashboard groups sessions location profile misc __legacy__

# Move files to their respective domains
mv -v Login.js auth/
mv -v Register.js auth/
mv -v ForgotPassword.js auth/

mv -v Dashboard.js dashboard/

mv -v GroupDetail.js groups/
mv -v InvitationAccept.js groups/

mv -v AudioSession.js sessions/

mv -v LocationTracking.js location/

mv -v Profile.js profile/

mv -v NotFound.js misc/
mv -v SubscriptionPlans.js misc/

# Archive legacy/dev-only files
mv -v TestIntegration.js __legacy__/

echo "✅ Refactor complete."
echo "🧊 New layout ready under /pages/"
