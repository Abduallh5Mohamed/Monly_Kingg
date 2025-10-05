# Monly King - Gaming Marketplace

A full-stack gaming marketplace application with integrated frontend and backend services.

## 🚀 Features

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Express.js with MongoDB
- **Authentication**: JWT-based authentication with email verification
- **Security**: Rate limiting, CSRF protection, and security headers
- **UI Components**: Modern UI with Radix UI components

## 🛠️ Technology Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Radix UI Components
- Lucide React Icons

### Backend
- Express.js 5
- Node.js (ES Modules)
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt password hashing
- Nodemailer for emails
- Socket.io for real-time features

### Security & Middleware
- Helmet.js for security headers
- CORS configuration
- Rate limiting with express-rate-limit
- CSRF protection
- Input sanitization

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or connection string)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Monly_Kingg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update the environment variables:
   ```bash
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/accountsstore
   JWT_SECRET=your-super-secret-jwt-key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM="Your App <your-email@gmail.com>"
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:3000/api/v1

## 📁 Project Structure

```
Monly_Kingg/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── register/
│   │   └── ...
│   ├── components/             # React components
│   │   ├── ui/                # UI components (Radix UI)
│   │   ├── layout/            # Layout components
│   │   └── sections/          # Section components
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── modules/               # Backend modules
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   └── ...
│   ├── middlewares/           # Express middlewares
│   └── utils/                 # Utility functions
├── public/                    # Static assets
├── server-integrated.js       # Main server file (integrated)
├── package.json
└── README.md
```

## 🔧 Available Scripts

- `npm run dev` - Start the integrated development server
- `npm run dev:server` - Start only the Express server (port 5000)
- `npm run dev:next` - Start only the Next.js server (port 3000)
- `npm run dev:separate` - Start both servers separately (concurrent)
- `npm run build` - Build the Next.js application
- `npm start` - Build and start the production server

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify-email` - Email verification
- `POST /api/v1/auth/resend-code` - Resend verification code
- `GET /api/v1/auth/csrf-token` - Get CSRF token

### Users
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/:id` - Update user profile
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Health Check
- `GET /api/health` - Server health status

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Protection against abuse
- **CSRF Protection**: Cross-site request forgery protection
- **Input Sanitization**: NoSQL injection prevention
- **Password Hashing**: Bcrypt with salt rounds
- **JWT**: Secure token-based authentication

## 🎨 UI Components

The application uses a modern design system with:
- Responsive design
- Dark mode support
- Animated UI components
- Accessibility features
- Gaming-themed styling

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Configure production MongoDB URI
3. Set proper CORS origins
4. Use HTTPS in production
5. Configure email service properly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (when available)
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the PORT in `.env` file
   - Kill existing Node.js processes

2. **MongoDB connection issues**
   - Ensure MongoDB is running
   - Check connection string in `.env`

3. **Email service issues**
   - Verify SMTP credentials
   - Enable "Less secure apps" for Gmail or use App Password

4. **Build errors**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript/ESLint configuration

For more help, check the logs or create an issue in the repository.