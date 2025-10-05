# 🔒 Security Guide - Accounts Store API

## 🚨 Critical Security Measures Implemented

### 1. Authentication & Authorization
- **JWT Tokens**: Short-lived access tokens (15 minutes) with secure signing
- **Refresh Token Rotation**: Automatic rotation with reuse detection
- **Account Lockout**: 5 failed attempts = 30-minute lockout
- **Role-Based Access**: Admin roles can only be set via direct database access

### 2. Input Validation & Sanitization
- **NoSQL Injection Protection**: Removes `$` and `.` keys from requests
- **XSS Prevention**: Input sanitization and CSP headers
- **Joi Validation**: Strict schema validation for all endpoints

### 3. Rate Limiting
- **Global Rate Limit**: 100 requests per 15 minutes per IP
- **Auth Rate Limit**: 5 requests per 15 minutes for sensitive endpoints
- **Resend Code Limit**: Special limiting for verification codes

### 4. Security Headers
- **Helmet.js**: Security headers including XSS protection
- **HSTS**: HTTPS enforcement in production
- **CSRF Protection**: Double-submit cookie pattern

### 5. Data Protection
- **Password Hashing**: bcrypt with 12 rounds
- **HttpOnly Cookies**: Prevent XSS token theft
- **Secure Cookies**: HTTPS-only in production
- **SameSite Cookies**: CSRF protection

## 🔧 Security Configuration

### Environment Variables
```env
JWT_SECRET=your-super-long-random-secret-key-here
NODE_ENV=production
MONGO_URI=mongodb://your-secure-mongo-connection
ALLOWED_ORIGINS=https://yourdomain.com
```

### CORS Configuration
```javascript
// Production CORS settings
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 🛡️ Security Best Practices

### 1. JWT Secret
- **Must** be at least 256 bits (64 characters)
- Generated using cryptographically secure random generator
- Different secret for each environment
- Never commit to version control

### 2. Database Security
- Use MongoDB connection with authentication
- Enable MongoDB access control
- Use connection string with credentials
- Regular database backups

### 3. HTTPS Only (Production)
- SSL/TLS certificates properly configured
- All cookies marked as `Secure`
- HSTS headers enabled
- HTTP redirects to HTTPS

### 4. Monitoring & Logging
- Security events logged to `app.log`
- Failed authentication attempts tracked
- Rate limiting violations logged
- Regular security audit logs

## 🚫 Security Don'ts

- ❌ Never expose JWT tokens in response bodies
- ❌ Never log sensitive information (tokens, passwords)
- ❌ Never use weak JWT secrets
- ❌ Never allow role modification via API
- ❌ Never disable CSRF protection on state-changing operations

## 🔍 Security Testing Checklist

- [ ] Test JWT token expiration
- [ ] Test refresh token rotation
- [ ] Test account lockout after failed attempts
- [ ] Test CSRF protection
- [ ] Test rate limiting
- [ ] Test input sanitization
- [ ] Test XSS prevention
- [ ] Test NoSQL injection prevention
- [ ] Test unauthorized role escalation
- [ ] Test CORS policy

## 🆘 Incident Response

If you suspect a security breach:
1. Immediately revoke all refresh tokens
2. Force password reset for affected users
3. Review access logs
4. Update JWT secret
5. Notify users of potential breach

## 📞 Security Contacts

For security vulnerabilities, please contact:
- Email: security@yourdomain.com
- Create issue with "Security" label (for non-critical issues)

---
**Last Updated**: September 2025
**Security Review**: Quarterly