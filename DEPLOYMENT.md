# BND E-commerce Deployment Guide

## Prerequisites

1. **GoDaddy VPS/Dedicated Server** (Shared hosting won't work for Node.js)
2. **Domain name** pointing to your server
3. **PostgreSQL database** (can be on same server or external)

## Step 1: Server Setup

### 1.1 Connect to Your Server
```bash
ssh root@your-server-ip
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.4 Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Step 2: Database Setup

### 2.1 Create Database
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE bnd_ecommerce;
CREATE USER bnd_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bnd_ecommerce TO bnd_user;
\q
```

### 2.2 Create Tables
```bash
psql -h localhost -U bnd_user -d bnd_ecommerce -f database_schema.sql
```

## Step 3: Application Deployment

### 3.1 Create Application Directory
```bash
mkdir -p /var/www/bnd
cd /var/www/bnd
```

### 3.2 Upload Your Code
```bash
# Option 1: Git clone (if using Git)
git clone https://github.com/your-repo/bnd-ecommerce.git .

# Option 2: Upload via SFTP/SCP
# Upload your files to /var/www/bnd/
```

### 3.3 Install Dependencies
```bash
npm install --production
```

### 3.4 Create Environment File
```bash
cp env.example .env
nano .env
```

Fill in your actual database credentials:
```env
DB_USER=bnd_user
DB_HOST=localhost
DB_NAME=bnd_ecommerce
DB_PASSWORD=your_secure_password
DB_PORT=5432
PORT=3000
NODE_ENV=production
```

### 3.5 Test Application
```bash
npm start
# Should see: "Server running on port 3000"
# Press Ctrl+C to stop
```

## Step 4: PM2 Process Management

### 4.1 Start Application with PM2
```bash
pm2 start server.js --name "bnd-ecommerce"
pm2 save
pm2 startup
```

### 4.2 Check Status
```bash
pm2 status
pm2 logs bnd-ecommerce
```

## Step 5: Nginx Reverse Proxy

### 5.1 Install Nginx
```bash
sudo apt install nginx -y
```

### 5.2 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/bnd
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files directly
    location /images/ {
        alias /var/www/bnd/public/images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /css/ {
        alias /var/www/bnd/public/css/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /var/www/bnd/public/js/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/bnd /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: SSL Certificate (Optional but Recommended)

### 6.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2 Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Firewall Setup

### 7.1 Configure UFW
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Step 8: Domain Configuration

### 8.1 GoDaddy DNS Settings
1. Log into GoDaddy
2. Go to your domain's DNS settings
3. Add/Update A record:
   - Type: A
   - Name: @ (or leave blank)
   - Value: Your server IP address
   - TTL: 600

4. Add CNAME for www:
   - Type: CNAME
   - Name: www
   - Value: yourdomain.com
   - TTL: 600

## Step 9: Monitoring and Maintenance

### 9.1 Check Application Status
```bash
pm2 status
pm2 logs bnd-ecommerce
```

### 9.2 Restart Application
```bash
pm2 restart bnd-ecommerce
```

### 9.3 Update Application
```bash
cd /var/www/bnd
git pull origin main  # if using Git
npm install --production
pm2 restart bnd-ecommerce
```

## Troubleshooting

### Common Issues:

1. **Port 3000 not accessible**
   - Check if application is running: `pm2 status`
   - Check firewall: `sudo ufw status`

2. **Database connection failed**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check credentials in `.env` file

3. **Nginx not serving content**
   - Check Nginx status: `sudo systemctl status nginx`
   - Check configuration: `sudo nginx -t`

4. **Domain not resolving**
   - Wait for DNS propagation (up to 48 hours)
   - Check DNS settings in GoDaddy

## Security Recommendations

1. **Change default SSH port**
2. **Use SSH keys instead of passwords**
3. **Regular security updates**
4. **Database backups**
5. **Application logs monitoring**

## Backup Strategy

### Database Backup
```bash
# Create backup script
sudo nano /root/backup_db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U bnd_user bnd_ecommerce > /backups/db_backup_$DATE.sql
find /backups -name "db_backup_*.sql" -mtime +7 -delete
```

### Application Backup
```bash
# Backup application files
tar -czf /backups/app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/bnd
```

Your application should now be live at `https://yourdomain.com`! 🚀 