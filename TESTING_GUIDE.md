# Real-time Testing: Install Knets Jr on Chintu Mobile

## Current System Status

Your dashboard shows "Chintu mobile" is already registered:
- **Device ID**: 7
- **Child**: Chintu (age 12)  
- **IMEI**: 123456789012345
- **Phone**: +91 9876543210
- **Current Status**: Being monitored by Bed Time schedule (04:44 - still active until 06:00)

## Step 1: Download APK from GitHub

1. **Go to your GitHub repository**
2. **Navigate to Actions tab**
3. **Click the successful "Build Android APK" workflow**
4. **Download "knets-jr-debug-apk" from Artifacts section**
5. **Extract the zip** to get `app-debug.apk`

## Step 2: Transfer APK to Chintu Mobile

Choose one method:
- **USB Cable**: Connect phone to computer, copy APK to Downloads folder
- **Email**: Send APK as attachment to yourself, download on phone
- **Cloud Storage**: Upload to Google Drive/Dropbox, download on phone
- **Direct Link**: If GitHub repository is public, download directly

## Step 3: Install APK on Chintu Mobile

1. **Enable Unknown Sources**:
   - Settings → Security → Unknown Sources (Enable)
   - Or Settings → Apps → Special Access → Install Unknown Apps → Chrome/Files (Enable)

2. **Install APK**:
   - Open Downloads folder or email attachment
   - Tap `app-debug.apk`
   - Tap "Install" when prompted
   - App will appear as "Knets Jr"

## Step 4: Configure Device Admin Permissions

1. **Open Knets Jr app** on Chintu mobile
2. **Grant Device Admin when prompted**:
   - App will automatically open Device Admin settings
   - Find "Knets Jr Device Admin" in the list
   - Tap to enable it
   - Confirm activation

3. **Grant additional permissions**:
   - Location access: "Allow all the time"
   - Usage stats: Enable in Special App Access
   - Camera: Allow for device verification

## Step 5: Test Real Device Control

### Immediate Test (Bed Time Active):
Since Bed Time schedule is currently active (04:44, ends at 06:00):
1. **Check if device locks automatically** when Knets Jr connects
2. **Verify lock screen shows**: "Device locked by parent"
3. **Try manual unlock from dashboard** - use Unlock button for device 7

### Manual Control Test:
1. **In your dashboard**: Find "Chintu mobile" device card
2. **Click Lock button**: Device should lock immediately
3. **Click Unlock button**: Device should unlock immediately
4. **Check Activity Logs**: Verify all actions are logged

### Schedule Test (After 06:00):
1. **Wait for Bed Time to end** at 06:00 (device auto-unlocks)
2. **Create test schedule**: 5-minute lock starting in 2 minutes
3. **Watch automatic locking** when schedule activates
4. **Monitor real-time enforcement** in dashboard

## Expected Behavior

### When Knets Jr is Active:
- **Lock Screen**: Custom message "Device locked by parent"
- **Emergency Calls**: Still available (Home + Power button)
- **Notifications**: Visible but device remains locked
- **Location**: Updates every few minutes in dashboard

### Dashboard Updates:
- **Device Status**: Real-time lock/unlock status
- **Activity Logs**: All actions with timestamps
- **Location Tracking**: GPS coordinates from actual device
- **Schedule Status**: "Active Now" indicators

## Troubleshooting

If device doesn't lock:
1. **Check Device Admin**: Ensure Knets Jr admin is enabled
2. **Check Permissions**: Location and usage stats granted
3. **Check Network**: Device needs internet connection
4. **Check Dashboard**: Verify device shows as "connected"

Your system is ready for real-world testing with actual device control!