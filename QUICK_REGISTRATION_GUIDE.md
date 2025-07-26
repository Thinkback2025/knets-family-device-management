# Quick Device Registration Guide

## Current Status
✅ **Knets Jr app installed** on Chintu mobile
✅ **Device Admin enabled** (ready for control)
❌ **Device not registered** (needs connection to dashboard)

## Simple Registration Steps:

### Method 1: Register from Dashboard (Recommended)
1. **Open your web dashboard** (currently running)
2. **Login** with your account  
3. **Click "Add Device"** button
4. **Get IMEI from Chintu mobile**:
   - Dial `*#06#` on the phone
   - Or use the IMEI shown in Knets Jr app: `PERM_DENIED_unknown` or similar
5. **Fill registration form**:
   - **Child Name**: Chintu
   - **Device Name**: Chintu mobile
   - **IMEI**: (from step 4)
   - **Phone Number**: +91 [actual phone number]
   - **Age**: 12

### Method 2: Use "Register Device" Button in App
1. **In Knets Jr app**, tap "Register Device" (green button)
2. **Enter dashboard URL**: Your Replit app URL
3. **Auto-registration** should detect and connect

## What Happens After Registration:
1. **Device appears in dashboard** with real-time status
2. **Knets Jr connects automatically** and shows "Device registered"
3. **Manual control works**: Lock/Unlock buttons respond immediately
4. **Schedule enforcement**: Automatic locking based on your schedules
5. **Activity logging**: All actions tracked in dashboard

## Testing Real Device Control:
1. **Manual Test**: Use Lock button in dashboard → Phone locks immediately
2. **Schedule Test**: Create 5-minute test schedule → Auto-locks when active
3. **Location Tracking**: GPS coordinates update in dashboard

The connection is immediate once registration is complete!