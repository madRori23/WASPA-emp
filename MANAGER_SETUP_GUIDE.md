# Manager Dashboard Setup Guide

## What I've Added

1. **Admin Tab** - A new admin interface where you can promote users to managers
2. **User Management System** - View all users and toggle their manager status
3. **Manager Dashboard** - Automatically appears for users with manager role

## How to Set Up a Manager Account

### Method 1: Use the Admin Tab

1. Login with any account
2. Click on the "Admin" tab
3. Enter a user's email address
4. Select "Promote to Manager"
5. Click "Update User Role"

### Method 2: Manual Firebase Console Update

1. Go to Firebase Console: https://console.firebase.google.com/project/waspa-portal-77264/firestore/data
2. Navigate to the `users` collection
3. Find the user document you want to make a manager
4. Edit the document and set:
   - `role: "manager"`
   - `isManager: true`
5. Save the changes

## Important: Update Firestore Security Rules

For managers to access all users' data, you need to update your Firestore security rules:

1. Go to Firebase Console: https://console.firebase.google.com/project/waspa-portal-77264/firestore/rules
2. Replace the current rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user is a manager
    function isManager() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isManager == true;
    }

    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read their own user document
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Managers can read all user documents
      allow read: if isManager();

      // Users can update their own document (except role/isManager fields)
      allow update: if isAuthenticated() &&
                      request.auth.uid == userId &&
                      !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'isManager']);

      // Only managers can update user roles
      allow update: if isManager();

      // Allow user creation during authentication
      allow create: if isAuthenticated() && request.auth.uid == userId;
    }

    // Tests collection
    match /tests/{testId} {
      // Users can read their own tests
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;

      // Managers can read all tests
      allow read: if isManager();

      // Users can create their own tests
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

      // Users can update/delete their own tests
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // Warnings collection
    match /warnings/{warningId} {
      // Users can read their own warnings
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;

      // Managers can read all warnings
      allow read: if isManager();

      // Users can create their own warnings
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

      // Users can update/delete their own warnings
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }

    // Connection tests (for Firebase testing)
    match /connectionTests/{testId} {
      allow read, write: if isAuthenticated();
    }

    // Settings collection
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isManager();
    }
  }
}
```

3. Click "Publish" to save the rules

## Testing the Manager Dashboard

1. **Promote a User**:
   - Login with any account
   - Go to Admin tab
   - Promote yourself or another user to manager

2. **Verify Manager Dashboard Appears**:
   - Logout and login again with the manager account
   - You should see a new "Manager Dashboard" tab appear

3. **Test Manager Features**:
   - Click on "Manager Dashboard"
   - You should see:
     - Week selection options
     - Overall statistics (users, tests, warnings)
     - User performance table
     - Export all users data button

4. **Test Excel Export**:
   - Select a date range (or use "This Week" button)
   - Click "Load Week Data"
   - Click "Export All Users" button
   - An Excel file should download with all users' data

## Manager Dashboard Features

### Week Selection
- **This Week**: Shows data for current week (Monday-Sunday)
- **Last Week**: Shows data for previous week
- **This Month**: Shows data for current month
- **Custom Range**: Select specific start and end dates

### User Performance Table
- View all users and their stats
- See tests completed, warnings issued, compliance rates
- Search users by name or email
- Sort by different metrics

### Export Options
1. **Individual User Export**: Click "View" on any user, then export their report
2. **Export All Users**: Export comprehensive report for all users
3. **Filtered Export**: Export data for specific date range

### Excel Report Contents
The exported Excel file includes:
- **Overview Sheet**: Summary statistics
- **User Summary Sheet**: All users with their performance metrics
- **Top Performers**: Individual sheets for most active users

## Troubleshooting

### Manager Tab Not Appearing
- Verify the user has `isManager: true` in Firestore
- Logout and login again
- Check browser console for errors

### Cannot Access Other Users' Data
- Ensure Firestore security rules are updated (see above)
- Verify manager status is set correctly
- Check Firebase Console for permission errors

### Excel Export Not Working
- Ensure SheetJS (xlsx) library is loaded
- Check browser console for errors
- Verify you have data for the selected period

## Important Notes

1. **Security**: Only promote trusted users to managers as they can access all users' data
2. **Performance**: Loading all users' data may be slow with many users
3. **Excel Files**: Large datasets may take time to generate
4. **Permissions**: Firestore rules must be updated for full functionality

## Next Steps

1. Update Firestore security rules (critical!)
2. Promote your first manager user
3. Test the manager dashboard
4. Test Excel export functionality
5. Review exported data format

## Support

If you encounter issues:
1. Check browser console for error messages
2. Verify Firestore rules are correctly updated
3. Ensure user has manager role in Firestore
4. Check that all JavaScript files are loading correctly
