# PG/Hostel Property Management System (PMS)

Full-stack Property Management System tailored for PG/Hostel workflows: rooms, tenants, payments, complaints, inventory, and meal plans.

## 🚀 Features

- **Property Management**: Manage multiple properties with location details
- **Room Management**: Track room types, occupancy status, and rent details
- **Tenant Management**: Maintain tenant records with lease and payment information
- **Payment Tracking**: Record and monitor various payment types (rent, food, deposits)
- **Complaint System**: Handle maintenance and service requests with status tracking
- **Inventory Management**: Track food items and supplies with quantity adjustments
- **Meal Planning**: Plan meals and automatically adjust inventory based on usage
- **User Authentication**: JWT-based authentication with role-based access control
- **Responsive Design**: Mobile-friendly interface built with TailwindCSS

## 🛠 Technology Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose ODM
- JWT Authentication
- bcryptjs for password hashing
- express-validator for input validation

**Frontend:**
- React 18 with Hooks
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- Axios for HTTP requests

**Development:**
- Docker Compose for containerized development
- Nodemon for auto-reload

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Docker & Docker Compose (for containerized setup)

## 🚀 Quick Start

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pg-pms-full-code
   ```

2. **Setup Backend**
   ```bash
   cd server
   cp env.example .env
   # Edit .env file with your configuration
   npm install
   npm run seed  # Creates sample data
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../client
   cp env.example .env
   # Edit .env file with your configuration
   npm install
   npm run dev
   ```

4. **Access the application**
   - Visit: http://localhost:5173
   - Login with: `admin@example.com` / `admin123`

### Option 2: Docker Setup

1. **Clone and start with Docker**
   ```bash
   git clone <repository-url>
   cd pg-pms-full-code
   
   # Set JWT secret (recommended for production)
   export JWT_SECRET=your-super-secret-jwt-key-here
   
   docker compose up --build
   ```

2. **Access the application**
   - Visit: http://localhost:5173
   - Login with: `admin@example.com` / `admin123`

## ⚙️ Configuration

### Backend Environment Variables (.env)
```bash
# Database Configuration
MONGO_URI=mongodb://localhost:27017/pg_pms

# JWT Configuration (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment Variables (.env)
```bash
# API Configuration
VITE_API=http://localhost:4000/api

# Optional Configuration
VITE_APP_NAME=PG Property Management System
VITE_APP_VERSION=1.0.0
```

## 🔐 Security Features

- JWT-based authentication with automatic token refresh
- Role-based access control (SUPER_ADMIN, PROPERTY_ADMIN, STAFF, TENANT)
- Input validation and sanitization
- Protected routes on frontend
- CORS protection
- Password hashing with bcryptjs

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property

### Rooms
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create new room
- `PATCH /api/rooms/:id` - Update room

### Tenants
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create new tenant
- `PATCH /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment

### Complaints
- `GET /api/complaints` - List complaints
- `POST /api/complaints` - Submit complaint
- `PATCH /api/complaints/:id` - Update complaint status

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add inventory item
- `PATCH /api/inventory/:id/adjust` - Adjust inventory quantity

### Meals
- `GET /api/meals` - List meal plans
- `POST /api/meals` - Create meal plan
- `POST /api/meals/apply-usage` - Apply meal usage to inventory

## 🐛 Bug Fixes & Improvements

This version includes fixes for:

- ✅ Authentication bypass vulnerability
- ✅ Hardcoded JWT secrets
- ✅ Missing input validation
- ✅ Data consistency issues
- ✅ Error handling improvements
- ✅ Loading states and user feedback
- ✅ Form validation
- ✅ Payment display issues
- ✅ Room status synchronization
- ✅ Inventory underflow prevention

## 🧪 Testing

Currently, the project doesn't include automated tests. Recommended testing approach:

1. **Backend Testing**: Jest + Supertest
2. **Frontend Testing**: React Testing Library
3. **E2E Testing**: Cypress or Playwright

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**
   - Use strong, unique JWT secrets
   - Configure production database URLs
   - Set appropriate CORS origins

2. **Security**
   - Enable HTTPS
   - Add rate limiting
   - Implement proper logging
   - Regular security audits

3. **Performance**
   - Database indexing
   - API response caching
   - Image optimization
   - CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed description
3. Include error logs and reproduction steps

## 🙏 Acknowledgments

- Built with React and Node.js
- UI components styled with TailwindCSS
- Database powered by MongoDB
