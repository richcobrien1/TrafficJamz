@echo off
echo Checking if icon is embedded in the executable...
echo.

cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo Icon file location:
dir build\icon.ico

echo.
echo Checking unpacked exe:
if exist "dist-electron\win-unpacked\TrafficJamz.exe" (
    echo File exists: dist-electron\win-unpacked\TrafficJamz.exe
    dir "dist-electron\win-unpacked\TrafficJamz.exe"
    
    echo.
    echo Trying to extract icon with rcedit...
    node_modules\.bin\rcedit "dist-electron\win-unpacked\TrafficJamz.exe" --get-icon extracted-icon.ico
    
    if exist extracted-icon.ico (
        echo SUCCESS! Icon is embedded. Size:
        dir extracted-icon.ico
        del extracted-icon.ico
    ) else (
        echo FAIL! Icon NOT embedded in exe!
    )
) else (
    echo ERROR: Unpacked exe not found!
)

echo.
echo Checking if afterPack hook exists:
if exist "scripts\afterPack.cjs" (
    echo afterPack.cjs EXISTS
) else (
    echo afterPack.cjs MISSING!
)

echo.
pause
