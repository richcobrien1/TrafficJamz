import qrcode
import os

# Generate QR code for APK download
# Using production URL instead of local network
url = 'https://trafficjamz.v2u.us/downloads/TrafficJamz.apk'
img = qrcode.make(url)
img.save('apk-qr-code.png')

print('✅ QR code saved to apk-qr-code.png')
print(f'📱 Scan this QR code to download: {url}')
print('')
print('⚡ DEPLOYMENT:')
print('1. APK file is located at: jamz-server/downloads/TrafficJamz.apk')
print('2. After deploying backend, the APK will be available at the URL above')
print('3. Users can scan the QR code to download and install the app')
print('')

# Try to open the QR code
try:
    os.system('start apk-qr-code.png')
except:
    print('(Could not auto-open QR code - please open apk-qr-code.png manually)')
