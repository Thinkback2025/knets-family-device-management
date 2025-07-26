# 🚀 Knets Jr APK - Quick Start Guide

## 📱 What is Knets Jr?

Knets Jr is the companion Android app that enables **actual physical device control** from the parent dashboard. Unlike web-based solutions, this app uses Android's system-level Device Policy Manager to lock/unlock devices completely.

## 🎯 Three Ways to Get Your APK

### Option 1: GitHub Actions (Recommended - FREE)
1. Push this project to GitHub
2. Go to "Actions" tab in your repository  
3. Click "Build Knets Jr Android APK"
4. Click "Run workflow" 
5. Download the APK from the artifacts section

### Option 2: Android Studio (Local Build)
1. Download Android Studio: https://developer.android.com/studio
2. Open the `/android` folder as a project
3. Click Build → Build Bundle(s)/APK(s) → Build APK(s)
4. Find APK in `app/build/outputs/apk/debug/`

### Option 3: Online Build Services
- **CircleCI**: Free tier with Android executors
- **Bitrise**: Mobile-focused CI/CD platform
- **CodeMagic**: Flutter/Android specialized service

## 📋 Installation Steps

### For Parents:
1. Download the APK file using one of the methods above
2. Send the APK to your child's Android device (via Google Drive, email, etc.)

### For Children's Device:
1. Enable "Install from unknown sources" in Android Settings
2. Install the APK file
3. **IMPORTANT**: Grant Device Admin permissions when prompted
4. Enter child's name and parent's phone number
5. App will register with the parent dashboard

## 🔒 How Device Locking Works

- **Real System Lock**: Uses Android Device Policy Manager APIs
- **Unbypassable**: Cannot be disabled without admin permissions
- **Background Service**: Monitors schedules 24/7
- **Automatic Unlock**: Follows parent-set schedules exactly
- **Emergency Override**: Parents can unlock instantly from dashboard

## 🔧 Technical Requirements

- **Android Version**: 7.0+ (API Level 24)
- **Permissions**: Device Admin, Internet, Boot Receiver
- **Size**: ~2-3 MB
- **Network**: Requires internet for real-time sync

## 🛡️ Security Features

- **Admin Protection**: Prevents app uninstall when locked
- **Encrypted Communication**: Secure API calls to parent dashboard
- **Local Validation**: Works offline with cached schedules
- **Tamper Resistant**: Root detection and security checks

## 📞 Support

- **Dashboard**: Access parent controls at your Knets web interface
- **Registration**: Use parent's phone number for device linking
- **Troubleshooting**: Check internet connection and admin permissions

## ⚠️ Important Notes

- Child devices must grant Device Admin permissions for locking to work
- App requires internet connection for real-time schedule updates
- Parents can monitor device status from the web dashboard
- Emergency unlock available through parent dashboard

**Ready to build your APK? Choose one of the three options above!**