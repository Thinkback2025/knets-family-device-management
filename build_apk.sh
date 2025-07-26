#!/bin/bash

# Knets Jr APK Build Script
# Alternative build method for environments with local build issues

echo "Starting Knets Jr APK build process..."

# Check if Android SDK is available
if ! command -v gradle &> /dev/null; then
    echo "Gradle not found. Please install Android SDK."
    exit 1
fi

# Navigate to Android project
cd android || { echo "Android directory not found"; exit 1; }

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean || { echo "Clean failed"; exit 1; }

# Build debug APK
echo "Building debug APK..."
./gradlew assembleDebug || { echo "Build failed"; exit 1; }

# Check if APK was created
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo "✅ APK built successfully!"
    echo "APK location: $APK_PATH"
    echo "File size: $(du -h "$APK_PATH" | cut -f1)"
else
    echo "❌ APK build failed - file not found"
    exit 1
fi

echo "Build complete. You can now install the APK on Android devices."