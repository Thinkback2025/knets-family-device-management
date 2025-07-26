# Android Studio Export Guide

## Files and Folders to Export

### Complete Android Project Structure
Export the entire `android` folder from your Replit project, which contains:

```
android/
├── app/                          # Main application module
│   ├── src/main/                 # Source code
│   │   ├── java/com/knets/jr/    # Kotlin source files
│   │   │   ├── MainActivity.kt
│   │   │   ├── admin/KnetsDeviceAdminReceiver.kt
│   │   │   ├── service/ScheduleMonitorService.kt
│   │   │   ├── api/KnetsApiService.kt
│   │   │   └── model/DeviceRegistration.kt
│   │   ├── res/                  # Resources (layouts, strings, etc.)
│   │   └── AndroidManifest.xml   # App permissions and components
│   ├── build.gradle              # App-level build configuration
│   └── proguard-rules.pro        # Code obfuscation rules
├── gradle/                       # Gradle wrapper files
├── build.gradle                  # Project-level build configuration
├── gradle.properties             # Gradle properties
├── settings.gradle               # Project settings
└── local.properties              # Local SDK paths (will be generated)
```

## Export Steps

### Method 1: Download ZIP from Replit
1. Right-click on `android` folder in Replit file panel
2. Select "Download as ZIP"
3. Extract on your local machine
4. Open in Android Studio

### Method 2: Git Clone (if using version control)
1. Clone your repository locally
2. Navigate to the `android` folder
3. Open in Android Studio

### Method 3: Manual File Copy
1. Create new folder on your computer called `knets-android`
2. Copy all files and folders from the `android` directory
3. Maintain the exact folder structure shown above

## Android Studio Setup

### 1. Import Project
- Open Android Studio
- Select "Open an existing Android Studio project"
- Navigate to your exported `android` folder
- Click "OK"

### 2. Sync Project
- Android Studio will automatically sync Gradle
- Wait for "Gradle sync finished" message
- Resolve any SDK version prompts

### 3. Build APK
- Go to **Build → Generate Signed Bundle / APK**
- Select **APK**
- Choose **debug** build type for testing
- Click **Create** to generate APK

### 4. Install APK
- Transfer generated APK to child's Android device
- Enable "Install from unknown sources" in device settings
- Install and grant Device Administrator permissions

## Required Components
Your exported project includes all necessary:
- ✅ Device Policy Manager integration
- ✅ Background service monitoring
- ✅ API communication with parent dashboard
- ✅ Device registration system
- ✅ Admin permission management

The APK will provide full device locking capabilities when installed on children's devices.