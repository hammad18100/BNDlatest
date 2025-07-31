# BND E-commerce Platform

Breaking Norms Daily (BND) - A modern e-commerce platform built with Node.js, Express, and PostgreSQL.

## 🚀 Features

- **Mobile Responsive Design** - Works perfectly on all devices
- **Product Catalog** - Browse and search products
- **Shopping Cart** - Add, remove, and manage items
- **Stock Management** - Real-time inventory tracking
- **Order Processing** - Secure order placement with database transactions
- **Payment Integration** - ToyyibPay payment gateway
- **User Management** - Customer registration and order history
- **Admin Features** - Product and inventory management

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: EJS templates, CSS3, JavaScript
- **Payment**: ToyyibPay integration
- **Deployment**: Render (recommended)

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bnd-ecommerce.git
   cd bnd-ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_DATABASE=bnd_ecommerce
   DB_PASSWORD=your_password
   DB_PORT=5432
   NODE_ENV=development
   ```

4. **Set up database**
   ```bash
   # Create database and run schema
   psql -U your_db_user -d bnd_ecommerce -f database.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit the application**
   Open [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment on Render

### Quick Deploy Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Set environment variables (see `RENDER_DEPLOYMENT.md`)

4. **Create PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Use the same region as your web service

5. **Deploy**
   - Render will automatically build and deploy
   - Your app will be live at `https://your-app-name.onrender.com`

### Detailed Deployment Guide
See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete deployment instructions.

## 📁 Project Structure

```
bnd-ecommerce/
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── database.sql           # Database schema
├── public/                # Static files
│   ├── css/
│   │   └── style.css      # Main stylesheet
│   ├── js/
│   │   └── main.js        # Frontend JavaScript
│   └── images/            # Product images
├── views/                 # EJS templates
│   ├── partials/
│   │   ├── header.ejs     # Site header
│   │   └── footer.ejs     # Site footer
│   ├── index.ejs          # Homepage
│   ├── products.ejs       # Product listing
│   ├── product-detail.ejs # Product detail page
│   └── about.ejs          # About page
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_USER` | Database username | Yes |
| `DB_HOST` | Database host | Yes |
| `DB_DATABASE` | Database name | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `DB_PORT` | Database port (default: 5432) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port (default: 3000) | No |

### Database Schema

The application uses the following tables:
- `users` - Customer information
- `products` - Product catalog
- `product_variants` - Product sizes and colors
- `orders` - Order records
- `order_items` - Individual items in orders

## 🎨 Customization

### Adding Products
1. Insert into `products` table
2. Add variants to `product_variants` table
3. Upload product images to `public/images/`

### Styling
- Main styles: `public/css/style.css`
- Mobile responsive design included
- Customize colors, fonts, and layout

### Payment Integration
- Currently integrated with ToyyibPay
- Can be extended to other payment gateways
- Update API keys in `server.js`

## 🔒 Security Features

- **SQL Injection Protection** - Parameterized queries
- **XSS Protection** - Input validation and sanitization
- **CSRF Protection** - Built into Express
- **SSL/HTTPS** - Automatic with Render deployment
- **Database Transactions** - Atomic operations for orders

## 📱 Mobile Features

- **Responsive Design** - Works on all screen sizes
- **Touch-Friendly** - Optimized for mobile interaction
- **Mobile Navigation** - Hamburger menu for mobile
- **Mobile Cart** - Full-screen cart on mobile devices

## 🚀 Performance

- **Static File Caching** - Images, CSS, JS cached
- **Database Indexing** - Optimized queries
- **Connection Pooling** - Efficient database connections
- **CDN Ready** - Can be integrated with CDN

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check environment variables
   - Verify database is running
   - Test connection manually

2. **Build Errors**
   - Check Node.js version (v16+)
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

3. **Static Files Not Loading**
   - Verify file paths
   - Check file permissions
   - Clear browser cache

### Getting Help

1. Check the logs in Render dashboard
2. Test locally first
3. Verify all environment variables are set
4. Check database connectivity

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support or questions:
- Check the deployment guide
- Review the troubleshooting section
- Test locally before deploying

---

**Built with ❤️ for Breaking Norms Daily**

Your e-commerce site will be live and ready for customers! 🚀 