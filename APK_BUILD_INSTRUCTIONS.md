# Knets Jr APK Build Instructions

## Quick GitHub Setup (3 minutes)

### Step 1: Upload to GitHub
1. Create new repository on GitHub called `knets-family-device-manager`
2. Upload entire project folder (including `/android` directory)
3. Ensure `.github/workflows/build-apk.yml` is included

### Step 2: Trigger APK Build
1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Build Knets Jr APK** workflow
4. Click **Run workflow** → **Run workflow**

### Step 3: Download APK
1. Wait 8-12 minutes for build completion
2. Click on completed workflow run
3. Download **knets-jr-debug-apk** artifact
4. Extract ZIP to get `app-debug.apk`

## APK Installation

### Install on Child's Device:
1. Transfer `app-debug.apk` to child's Android device
2. Enable "Install from Unknown Sources" in Settings
3. Tap APK file to install
4. Grant required permissions:
   - Location access (GPS/Network)
   - Device admin permissions
   - Background app refresh

### First Launch:
1. Child enters registered phone number
2. App connects to parent dashboard automatically
3. Real GPS tracking begins immediately
4. Schedule enforcement starts

## System Capabilities

### Real Location Tracking:
- **GPS Satellites**: 3-10 meter accuracy
- **WiFi Networks**: 50-100 meter accuracy  
- **Cell Towers**: 100-1000 meter accuracy
- **Updates**: Every 30 seconds to parent dashboard

### Device Control:
- **Remote Lock/Unlock**: Instant via parent dashboard
- **Schedule Enforcement**: Automatic bedtime/study hours
- **Background Monitoring**: Continuous status updates

### Security Features:
- **Flexible Validation**: Phone number OR IMEI matching
- **SIM Swap Protection**: Device fingerprinting
- **Activity Logging**: Complete audit trail
- **Permission Control**: User consent required

## Troubleshooting

### Build Fails:
- Check Android SDK licensing
- Verify Gradle wrapper permissions
- Review build logs in Actions tab

### APK Won't Install:
- Enable "Unknown Sources" in Android Settings
- Ensure minimum Android 7.0 (API 24)
- Check storage space (50MB required)

### Location Not Working:
- Grant precise location permissions
- Enable GPS in device settings
- Check network connectivity

## Production Ready

Your Knets family device management system is now complete:
- ✅ Web dashboard with automatic schedule enforcement
- ✅ Real GPS location tracking
- ✅ Native Android companion app
- ✅ Enterprise-level security validation
- ✅ GitHub Actions CI/CD pipeline

Ready for real-world family device management!