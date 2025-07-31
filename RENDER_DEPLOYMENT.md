# BND E-commerce Deployment on Render

## 🚀 Quick Start Guide

### Prerequisites
1. **Render Account** (Free tier available)
2. **GitHub Repository** with your code
3. **PostgreSQL Database** (Render provides this)

## Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for Render deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/bnd-ecommerce.git
git push -u origin main
```

### 1.2 Verify Files Structure
```
bnd-ecommerce/
├── server.js
├── package.json
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── views/
│   ├── partials/
│   └── *.ejs
└── README.md
```

## Step 2: Create Render Web Service

### 2.1 Sign Up/Login to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Click "New +" → "Web Service"

### 2.2 Connect GitHub Repository
1. **Connect your GitHub repository**
2. **Name**: `bnd-ecommerce`
3. **Environment**: `Node`
4. **Region**: Choose closest to your users
5. **Branch**: `main`
6. **Root Directory**: Leave empty (if code is in root)

### 2.3 Configure Build Settings
```
Build Command: npm install
Start Command: npm start
```

### 2.4 Environment Variables
Add these environment variables in Render dashboard:

```
NODE_ENV=production
PORT=10000
DB_USER=your_db_user
DB_HOST=your_db_host
DB_DATABASE=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
```

## Step 3: Create PostgreSQL Database

### 3.1 Create Database
1. In Render dashboard, click "New +" → "PostgreSQL"
2. **Name**: `bnd-database`
3. **Database**: `bnd_ecommerce`
4. **User**: `bnd_user`
5. **Region**: Same as your web service

### 3.2 Get Database Credentials
1. Click on your database
2. Go to "Connections" tab
3. Copy the connection details:
   - **Host**: `your-db-host.render.com`
   - **Database**: `bnd_ecommerce`
   - **User**: `bnd_user`
   - **Password**: `your-password`
   - **Port**: `5432`

### 3.3 Update Environment Variables
Update your web service environment variables with the actual database credentials:

```
DB_USER=bnd_user
DB_HOST=your-db-host.render.com
DB_DATABASE=bnd_ecommerce
DB_PASSWORD=your-actual-password
DB_PORT=5432
```

## Step 4: Set Up Database Schema

### 4.1 Create Database Tables
You can either:

**Option A: Use Render's Database Console**
1. Go to your database in Render
2. Click "Connect" → "External Database"
3. Use a PostgreSQL client to connect and run your schema

**Option B: Add Schema to Your Code**
Create a `database.sql` file in your repository:

```sql
-- Create tables
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    color VARCHAR(50),
    size VARCHAR(20),
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(user_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    variant_id INTEGER REFERENCES product_variants(variant_id),
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10,2) NOT NULL
);

-- Insert sample data
INSERT INTO products (name, description, price, category) VALUES
('BND Classic T-Shirt', 'Premium cotton t-shirt with BND branding', 29.99, 'The Blank Canvas'),
('BND Hoodie', 'Comfortable hoodie with BND logo', 49.99, 'The Blank Canvas');

INSERT INTO product_variants (product_id, color, size, stock_quantity, sku) VALUES
(1, 'Black', 'S', 20, 'BND-TS-BLK-S'),
(1, 'Black', 'M', 20, 'BND-TS-BLK-M'),
(1, 'Black', 'L', 20, 'BND-TS-BLK-L'),
(2, 'Black', 'S', 15, 'BND-HD-BLK-S'),
(2, 'Black', 'M', 15, 'BND-HD-BLK-M'),
(2, 'Black', 'L', 15, 'BND-HD-BLK-L');
```

## Step 5: Deploy and Test

### 5.1 Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy your app
3. Wait for deployment to complete (usually 2-5 minutes)

### 5.2 Test Your Application
1. Click on your web service URL
2. Test all pages: Home, Products, About
3. Test cart functionality
4. Test database connections

## Step 6: Custom Domain (Optional)

### 6.1 Add Custom Domain
1. Go to your web service settings
2. Click "Custom Domains"
3. Add your domain (e.g., `yourdomain.com`)
4. Update your domain's DNS settings:
   - **Type**: CNAME
   - **Name**: @ or www
   - **Value**: `your-app-name.onrender.com`

### 6.2 SSL Certificate
Render automatically provides SSL certificates for custom domains.

## Step 7: Environment Variables Reference

### Required Variables
```
NODE_ENV=production
PORT=10000
DB_USER=bnd_user
DB_HOST=your-db-host.render.com
DB_DATABASE=bnd_ecommerce
DB_PASSWORD=your-password
DB_PORT=5432
```

### Optional Variables
```
TOYYIBPAY_API_KEY=your-toyyibpay-key
TOYYIBPAY_CATEGORY_CODE=your-category-code
```

## Step 8: Monitoring and Maintenance

### 8.1 View Logs
1. Go to your web service in Render
2. Click "Logs" tab
3. Monitor for errors and performance

### 8.2 Automatic Deployments
- Render automatically redeploys when you push to your main branch
- You can disable auto-deploy in settings if needed

### 8.3 Database Backups
- Render automatically backs up PostgreSQL databases
- You can download backups from the database dashboard

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check `package.json` has correct scripts
   - Verify all dependencies are listed
   - Check build logs for specific errors

2. **Database Connection Fails**
   - Verify environment variables are correct
   - Check database is running
   - Ensure SSL is enabled for production

3. **App Crashes**
   - Check logs for error messages
   - Verify all required files are in repository
   - Test locally first

4. **Static Files Not Loading**
   - Ensure `public/` folder is in repository
   - Check file paths in HTML/CSS

### Performance Tips:

1. **Enable Caching**
   - Render automatically caches static files
   - Add cache headers for better performance

2. **Database Optimization**
   - Use connection pooling (already configured)
   - Add indexes for frequently queried columns

3. **Image Optimization**
   - Compress images before uploading
   - Use appropriate formats (WebP for modern browsers)

## Security Best Practices

1. **Environment Variables**
   - Never commit sensitive data to repository
   - Use Render's environment variable system

2. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups

3. **Application Security**
   - Keep dependencies updated
   - Validate all user inputs
   - Use HTTPS (automatic with Render)

## Cost Optimization

### Free Tier Limits:
- **Web Services**: 750 hours/month
- **PostgreSQL**: 90 days free trial
- **Custom Domains**: Free with SSL

### Paid Plans:
- **Web Services**: $7/month for unlimited
- **PostgreSQL**: $7/month for persistent database

Your BND e-commerce site will be live at `https://your-app-name.onrender.com`! 🚀

## Next Steps

1. **Test thoroughly** on the deployed version
2. **Set up monitoring** and alerts
3. **Configure custom domain** if needed
4. **Set up payment processing** (ToyyibPay integration)
5. **Add analytics** (Google Analytics, etc.)

Need help with any specific step? Let me know! 🎯 