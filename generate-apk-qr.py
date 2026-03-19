import qrcode
import datetime
import shutil
import os

# APK filename with today's date for version history
date_str = datetime.datetime.now().strftime('%Y%m%d')
versioned_apk = f'TrafficJamz-LogoutFix-{date_str}.apk'
static_apk = 'TrafficJamz.apk'

# Copy versioned APK to static filename (for consistent QR code)
if os.path.exists(versioned_apk):
    shutil.copy2(versioned_apk, static_apk)
    print('Android APK built successfully!')
    print('')
    print('APK Files Created:')
    print(f'   Versioned: {versioned_apk} (for history)')
    print(f'   Static:    {static_apk} (for QR code)')
else:
    print('ERROR: Versioned APK not found!')
    print(f'Expected: {versioned_apk}')
    exit(1)

# Generate QR code for STATIC filename (always works)
url = f'https://trafficjamz.v2u.us/downloads/{static_apk}'

img = qrcode.make(url)
qr_filename = 'apk-qr-code.png'
img.save(qr_filename)

print('')
print('QR Code Generated!')
print(f'   File: {qr_filename}')
print(f'   URL:  {url}')
print('')
print('Next Steps:')
print(f'   1. Copy {static_apk} to your server at jamz-server/downloads/')
print(f'   2. Keep {versioned_apk} for version history')
print('   3. Scan apk-qr-code.png - it will ALWAYS work!')
print('   4. Test the logout fix!')
