# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider

## 3. Enable Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for now (you can secure it later)
4. Select a location for your database

## 4. Get Your Firebase Config

1. Go to "Project settings" (gear icon in left sidebar)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a name
5. Copy the Firebase configuration object

## 5. Update Your App

Replace the placeholder config in `constants/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

## 6. Test Your Setup

1. Try creating a new account in your app
2. Check the Firebase Console:
   - Authentication > Users (should show your new user)
   - Firestore Database > Data (should show collections when you create workouts)

## 6. Fix Security Rules (REQUIRED)

**IMPORTANT**: You need to update your Firestore security rules or you'll get permission denied errors.

1. Go to Firestore Database > Rules in Firebase Console
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /workouts/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /exerciseSessions/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Click "Publish" to save the rules

## 7. Create Required Indexes

Firebase will show you links to create indexes when you get errors. You need these indexes:

1. **For workouts collection**:
   - Fields: `userId` (Ascending), `startedAt` (Descending)
   - Go to: Firestore Database > Indexes > Create Index
   - Collection ID: `workouts`
   - Add fields: `userId` (Ascending), `startedAt` (Descending)

2. **For exerciseSessions collection**:
   - Fields: `userId` (Ascending), `startedAt` (Descending)
   - Collection ID: `exerciseSessions`
   - Add fields: `userId` (Ascending), `startedAt` (Descending)

**OR** click the links in the error messages to auto-create the indexes.

## What's Now Working

✅ **Real Authentication**: Users can create accounts and sign in with email/password
✅ **Data Persistence**: All workout data is saved to Firestore and syncs across devices
✅ **User Isolation**: Each user only sees their own data
✅ **Offline Support**: Firebase handles offline caching automatically
✅ **Real-time Sync**: Data updates in real-time across devices (when online)

## What Still Needs Work

❌ **NFC Integration**: Still mocked (requires native development outside Expo Go)
❌ **Advanced Features**: Push notifications, advanced analytics, etc.

The app now has production-ready authentication and data persistence!