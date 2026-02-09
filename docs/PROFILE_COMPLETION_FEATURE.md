# Profile Completion Feature

## Overview
After email verification, new users are required to complete their profile before accessing the dashboard.

## User Flow
1. User registers → Email sent with verification code
2. User verifies email → Redirected to `/complete-profile`
3. User fills profile form:
   - ✅ Full Name (English) - **Required**
   - ✅ Phone Number - **Required**
   - ✅ Address - **Required**
   - ⚪ Bio - Optional
   - ⚪ Profile Picture - Optional
4. User completes profile → Redirected to dashboard

## Technical Details

### Backend Changes

#### User Model (`src/modules/users/user.model.js`)
- Added `fullName: String` field
- Added `profileCompleted: Boolean` field (default: false)

#### API Endpoints
- **POST** `/api/v1/users/complete-profile`
  - Accepts: FormData (multipart/form-data)
  - Fields: `fullName`, `phone`, `address`, `bio`, `avatar` (file)
  - Required fields: `fullName`, `phone`, `address`
  - Optional fields: `bio`, `avatar`
  - Sets `profileCompleted: true`
  - Returns: Updated user object

#### Auth Responses Updated
All auth endpoints now include `profileCompleted` in userData:
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

#### File Upload
- Avatar images saved to: `/uploads/avatars/`
- Max file size: 5MB
- Allowed formats: JPEG, PNG, GIF, WebP
- Static files served at: `http://localhost:5000/uploads/`

### Frontend Changes

#### New Page
- `/complete-profile` - Profile completion form with:
  - Avatar upload with preview
  - Full name input (required)
  - Phone, address, bio inputs (optional)
  - Form validation
  - Loading states

#### Auth Context (`src/lib/auth-context.tsx`)
- Modified `verifyEmail()` to check `profileCompleted`
- Redirects to `/complete-profile` if false
- Redirects to `/user/dashboard` if true

#### Dashboard Layout Protection
- `UserDashboardLayout` checks `profileCompleted`
- Redirects incomplete profiles to `/complete-profile`
- Prevents access to any dashboard pages until profile is complete

#### API Types (`src/lib/api.ts`)
Updated `UserData` interface with new fields:
```typescript
interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  isSeller?: boolean;
  fullName?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  bio?: string;
  profileCompleted?: boolean;
}
```

## Security Considerations
- Profile completion can only be done once
- Subsequent profile updates use `/api/v1/users/profile` endpoint
- Avatar uploads validated for file type and size
- Files stored with unique timestamped names
- Requires authentication (JWT token)

## Testing
1. Register new account
2. Verify email
3. Should redirect to `/complete-profile`
4. Fill required field (full name)
5. Optionally upload avatar
6. Submit form
7. Should redirect to dashboard
8. Attempting to access dashboard without completing profile redirects back

## Future Enhancements
- [ ] Add phone number verification
- [ ] Add address autocomplete
- [ ] Add avatar cropping tool
- [ ] Add skip option with reminder
- [ ] Add profile completion progress indicator
