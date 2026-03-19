import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image
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

# Create QR code with higher error correction to allow for logo overlay
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # Highest error correction (30%)
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

# Generate QR code image with rounded corners
img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(),
    fill_color="black",
    back_color="white"
)

# Add TrafficJamz logo in the center
icon_paths = [
    'jamz-client-vite/public/icon-512.png',
    'resources/icon.png',
    'jamz-client-vite/resources/icon.png'
]

logo = None
for icon_path in icon_paths:
    if os.path.exists(icon_path):
        logo = Image.open(icon_path)
        print(f'Using icon: {icon_path}')
        break

if logo:
    # Calculate logo size (about 1/4 of QR code size)
    qr_width, qr_height = img.size
    logo_size = qr_width // 4
    
    # Resize logo to fit
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Create a white background for the logo (makes it stand out)
    logo_bg_size = int(logo_size * 1.2)
    logo_bg = Image.new('RGB', (logo_bg_size, logo_bg_size), 'white')
    
    # Calculate position to center the logo
    logo_pos = ((logo_bg_size - logo_size) // 2, (logo_bg_size - logo_size) // 2)
    
    # Paste logo on white background
    if logo.mode == 'RGBA':
        logo_bg.paste(logo, logo_pos, logo)
    else:
        logo_bg.paste(logo, logo_pos)
    
    # Calculate position to center the logo background on QR code
    bg_pos = ((qr_width - logo_bg_size) // 2, (qr_height - logo_bg_size) // 2)
    
    # Paste logo background with logo onto QR code
    img.paste(logo_bg, bg_pos)
    print('Logo embedded in QR code!')
else:
    print('Warning: No icon found, generating QR without logo')

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
