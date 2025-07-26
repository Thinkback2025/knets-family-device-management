# Copy XML Files to Your Computer

## Files to Copy from Replit to Your Computer:

### 1. Copy these 3 XML files:

**From Replit:** `android/app/src/main/res/xml/data_extraction_rules.xml`
**To Computer:** `[Your Android Project]/app/src/main/res/xml/data_extraction_rules.xml`

**From Replit:** `android/app/src/main/res/xml/backup_rules.xml`  
**To Computer:** `[Your Android Project]/app/src/main/res/xml/backup_rules.xml`

**From Replit:** Updated `android/app/src/main/AndroidManifest.xml`
**To Computer:** `[Your Android Project]/app/src/main/AndroidManifest.xml` (replace existing)

### 2. Steps to Copy:

1. **In Replit:** Click on each file and copy the contents
2. **On Computer:** Navigate to your Android project folder
3. **Create xml folder:** If `res/xml/` doesn't exist, create it
4. **Paste files:** Create the new XML files and paste contents
5. **Replace manifest:** Update AndroidManifest.xml with the fixed version

### 3. After Copying Files:

1. **Refresh Android Studio project**
2. **Sync Project with Gradle Files**
3. **Clean Project** 
4. **Build APK** - should work without errors now

The missing XML resources were causing the build failures. Once you copy these files, the APK build should complete successfully.