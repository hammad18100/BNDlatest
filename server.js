// server.js

// Load environment variables -- THIS MUST BE AT THE TOP
require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const TOYYIBPAY_API_KEY = '92fti45i-hz4t-r0fa-nkc7-0ow0m3opscs8';
const TOYYIBPAY_CATEGORY_CODE = '7cjp6epz';
const TOYYIBPAY_API_URL = 'https://toyyibpay.com/index.php/api/createBill';

// --- Database Connection Pool ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Optional but recommended for production
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Render PostgreSQL requires SSL
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Routes ---
// (All your app.get and app.post routes are placed here)

// Home Page
app.get('/', (req, res) => {
  res.render('index', { title: 'BND - Breaking Norms Daily' });
});

// Products Page
app.get('/products', async (req, res) => {
  try {
        let query = "SELECT * FROM products ORDER BY product_id";
        let title = "The Blank Canvas";
        if (req.query.collection) {
            query = {
                text: "SELECT * FROM products WHERE category = $1 ORDER BY product_id",
                values: [req.query.collection]
            };
            title = req.query.collection;
        }
        const result = await pool.query(query);
        res.render('products', { 
            title: title, 
            products: result.rows,
            message: req.query.message || null
        });
    } catch (err) {
        console.error('Error on /products route:', err);
        res.status(500).send("Error loading products.");
    }
});

// Product Detail Page
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const productResult = await pool.query('SELECT * FROM products WHERE product_id = $1', [id]);
    if (productResult.rows.length === 0) {
      return res.status(404).send('Product not found');
    }
    const variantsResult = await pool.query('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variant_id', [id]);
    res.render('product-detail', {
      title: productResult.rows[0].name,
      product: productResult.rows[0],
      variants: variantsResult.rows
    });
  } catch (err) {
    console.error(`Error on /products/${id} route:`, err);
    res.status(500).send("Error loading product details.");
  }
});

// About Us Page
app.get('/about', (req, res) => {
    res.render('about', { 
      title: 'About Us - BND',
      pageClass: 'about-page-body'
    });
});

// Cart Page
app.get('/cart', (req, res) => {
    res.render('cart', { 
      title: 'Shopping Cart - BND'
    });
});

// Checkout Page
app.get('/checkout', (req, res) => {
  res.render('checkout', { title: 'Checkout - BND' });
});



// API Route for Stock Validation (before checkout)
app.post('/api/validate-stock', async (req, res) => {
  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid cart data.' });
  }
  
  try {
    const outOfStockItems = [];
    const validItems = [];
    
    // Check stock availability for each item in cart
    for (const item of cart) {
      const stockResult = await pool.query(
        'SELECT stock_quantity FROM product_variants WHERE variant_id = $1',
        [item.variantId]
      );
      
      if (stockResult.rows.length === 0) {
        outOfStockItems.push({
          variantId: item.variantId,
          name: item.name,
          size: item.size,
          reason: 'Product variant not found'
        });
        continue;
      }
      
      const availableStock = stockResult.rows[0].stock_quantity;
      if (availableStock < item.quantity) {
        outOfStockItems.push({
          variantId: item.variantId,
          name: item.name,
          size: item.size,
          reason: `Insufficient stock. Available: ${availableStock}, Requested: ${item.quantity}`
        });
        continue;
      }
      
      // Item is in stock
      validItems.push(item);
    }
    
    if (outOfStockItems.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some items in your cart are out of stock.',
        outOfStockItems: outOfStockItems,
        validItems: validItems
      });
    }
    
    res.json({ success: true, message: 'Stock validation passed.' });
  } catch (err) {
    console.error('Error validating stock:', err);
    res.status(500).json({ success: false, message: 'Failed to validate stock.' });
  }
});

app.post('/api/create-pending-order', async (req, res) => {
  const { email, name, phone, address, postcode, cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0 || !email) {
    return res.status(400).json({ success: false, message: 'Missing required order information.' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if user exists, if not create one
    let userId;
    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      // User exists - use existing ID
      userId = userCheck.rows[0].user_id;
      
      // Optionally update user details if needed
      await client.query(
        'UPDATE users SET name = $1, phone = $2, address = $3, postcode = $4 WHERE user_id = $5',
        [name || 'New User', phone || '', address || '', postcode || '', userId]
      );
    } else {
      // User doesn't exist - create new
      const userResult = await client.query(
        `INSERT INTO users (name, email, phone, address, postcode)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING user_id`,
        [name || 'New User', email, phone || '', address || '', postcode || '']
      );
      userId = userResult.rows[0].user_id;
    }

    // Rest of your existing code remains the same...
    // 2. Calculate total
    let totalAmount = 0;
    for (const item of cart) {
      totalAmount += item.price * item.quantity;
    }

    // 3. Insert order with 'pending' status (no stock deduction yet)
    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES ($1, NOW(), $2, $3) RETURNING order_id',
      [userId, 'pending', totalAmount]
    );
    const orderId = orderResult.rows[0].order_id;

    // 4. For each item: check stock with FOR UPDATE lock and insert order_item
    for (const item of cart) {
      // a. Check stock availability with row lock to prevent race conditions
      const stockResult = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE variant_id = $1 FOR UPDATE',
        [item.variant_id]
      );
      if (stockResult.rows.length === 0) {
        throw new Error(`Variant ${item.variant_id} not found`);
      }
      const availableStock = stockResult.rows[0].stock_quantity;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${availableStock}, Requested: ${item.quantity}`);
      }
      
      // b. Insert order_item
      await client.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [orderId, item.variant_id, item.quantity, item.price]
      );
    }
    
    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: 'Pending order created successfully!', 
      orderId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating pending order:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create pending order.' });
  } finally {
    client.release();
  }
});

// Stock Check API - Check availability before ordering
app.post('/api/check-stock', async (req, res) => {
  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is required.' });
  }
  try {
    const stockChecks = [];
    for (const item of cart) {
      const stockResult = await pool.query(
        'SELECT pv.stock_quantity, pv.variant_id, pv.size, pv.color, p.name FROM product_variants pv JOIN products p ON pv.product_id = p.product_id WHERE pv.variant_id = $1',
        [item.variant_id]
      );
      if (stockResult.rows.length === 0) {
        stockChecks.push({
          variant_id: item.variant_id,
          available: 0,
          requested: item.quantity,
          in_stock: false,
          message: 'Variant not found'
        });
      } else {
        const available = stockResult.rows[0].stock_quantity;
        const inStock = available >= item.quantity;
        stockChecks.push({
          variant_id: item.variant_id,
          product_name: stockResult.rows[0].name,
          size: stockResult.rows[0].size,
          color: stockResult.rows[0].color,
          available: available,
          requested: item.quantity,
          in_stock: inStock,
          message: inStock ? 'In stock' : `Only ${available} available`
        });
      }
    }
    const allInStock = stockChecks.every(check => check.in_stock);
    res.json({
      success: true,
      all_in_stock: allInStock,
      stock_checks: stockChecks
    });
  } catch (err) {
    console.error('Error checking stock:', err);
    res.status(500).json({ success: false, message: 'Error checking stock availability.' });
  }
});

// Real-time Stock Validation API - For immediate stock checking
app.post('/api/validate-stock', async (req, res) => {
  const { cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is required.' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const validationResults = [];
    let allValid = true;
    
    for (const item of cart) {
      // Use FOR UPDATE to lock the row and prevent race conditions
      const stockResult = await client.query(
        'SELECT pv.stock_quantity, pv.variant_id, pv.size, pv.color, p.name FROM product_variants pv JOIN products p ON pv.product_id = p.product_id WHERE pv.variant_id = $1 FOR UPDATE',
        [item.variant_id]
      );
      
      if (stockResult.rows.length === 0) {
        validationResults.push({
          variant_id: item.variant_id,
          valid: false,
          message: 'Variant not found'
        });
        allValid = false;
      } else {
        const available = stockResult.rows[0].stock_quantity;
        const valid = available >= item.quantity;
        
        validationResults.push({
          variant_id: item.variant_id,
          product_name: stockResult.rows[0].name,
          size: stockResult.rows[0].size,
          color: stockResult.rows[0].color,
          available: available,
          requested: item.quantity,
          valid: valid,
          message: valid ? 'Stock available' : `Only ${available} available`
        });
        
        if (!valid) {
          allValid = false;
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      all_valid: allValid,
      validation_results: validationResults
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error validating stock:', err);
    res.status(500).json({ success: false, message: 'Error validating stock availability.' });
  } finally {
    client.release();
  }
});

// API Route for Ordering (multi-item, robust, production-ready)
app.post('/api/orders', async (req, res) => {
  const { email, name, phone, address, cart } = req.body;
  // cart: [{ variant_id, quantity, price }]
  if (!cart || !Array.isArray(cart) || cart.length === 0 || !email) {
    return res.status(400).json({ success: false, message: 'Missing required order information.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Always create a new user for each order
    // This ensures each order has its own separate user record, even if email already exists
    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, address, postcode)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [name || 'New User', email, phone || '', address || '', postcode || '']
    );
    const userId = userResult.rows[0].user_id;

    // 2. Calculate total
    let totalAmount = 0;
    for (const item of cart) {
      totalAmount += item.price * item.quantity;
    }

    // 3. Insert order
    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES ($1, NOW(), $2, $3) RETURNING order_id',
      [userId, 'paid', totalAmount]
    );
    const orderId = orderResult.rows[0].order_id;

    // 4. For each item: check stock, insert order_item, deduct stock
    for (const item of cart) {
      // a. Check stock
      const stockResult = await client.query(
        'SELECT stock_quantity FROM product_variants WHERE variant_id = $1 FOR UPDATE',
        [item.variant_id]
      );
      if (stockResult.rows.length === 0) throw new Error('Variant not found');
      
      const availableStock = stockResult.rows[0].stock_quantity;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${availableStock}, Requested: ${item.quantity}`);
      }

      // b. Insert order_item
      await client.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [orderId, item.variant_id, item.quantity, item.price]
      );

      // c. Deduct stock
      await client.query(
        'UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
        [item.quantity, item.variant_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Order placed successfully!', orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing order:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to place order.' });
  } finally {
    client.release();
  }
});

// ToyyibPay Checkout Endpoints
app.post('/checkout', async (req, res) => {
  try {
    const { cart, customer, orderId, shippingCost, processingFee } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (!customer || !customer.name || !customer.email || !customer.phone || !customer.postcode) {
      return res.status(400).json({ success: false, message: 'Customer info required including postcode.' });
    }
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID required.' });
    }

    // First, verify stock availability
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check stock for each item
      for (const item of cart) {
        const stockResult = await client.query(
          'SELECT stock_quantity FROM product_variants WHERE variant_id = $1 FOR UPDATE',
          [item.variant_id]
        );
        
        if (stockResult.rows.length === 0) {
          throw new Error(`Product variant not found: ${item.variant_id}`);
        }
        
        const availableStock = stockResult.rows[0].stock_quantity;
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for item. Available: ${availableStock}, Requested: ${item.quantity}`);
        }
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Stock not available. Please update your cart.',
        error: err.message 
      });
    } finally {
      client.release();
    }

    // Calculate subtotal using passed fees
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + (shippingCost || 0) + (processingFee || 0);
    // Prepare bill description
    const description = cart.map(item => `Variant ${item.variant_id} (x${item.quantity})`).join(', ');
    // Prepare ToyyibPay bill data
    const billData = {
      userSecretKey: TOYYIBPAY_API_KEY,
      categoryCode: TOYYIBPAY_CATEGORY_CODE,
      billName: 'BND Order',
      billDescription: description,
      billPriceSetting: 1,
      billPayorInfo: 1,
      billAmount: (total * 100).toFixed(0), // in cents
      billReturnUrl: req.protocol + '://' + req.get('host') + `/thank-you/${orderId}`,
      billCallbackUrl: req.protocol + '://' + req.get('host') + '/toyyibpay-callback',
      billExternalReferenceNo: `BND-${orderId}-${Date.now()}`,
      billTo: customer.name,
      billEmail: customer.email,
      billPhone: customer.phone,
      billSplitPayment: 0,
      billSplitPaymentArgs: '',
      billPaymentChannel: '0',
      billDisplayMerchant: 1
    };
    // Call ToyyibPay API
    const response = await axios.post(TOYYIBPAY_API_URL, new URLSearchParams(billData));
    if (response.data && response.data[0] && response.data[0].BillCode) {
      const billCode = response.data[0].BillCode;
      const paymentUrl = `https://toyyibpay.com/${billCode}`;
      return res.json({ success: true, paymentUrl });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to create bill.' });
    }
  } catch (err) {
    console.error('ToyyibPay checkout error:', err);
    return res.status(500).json({ success: false, message: 'Checkout error.' });
  }
});

// ToyyibPay Callback Endpoint - Handle payment confirmation
app.post('/toyyibpay-callback', async (req, res) => {
  try {
    console.log('ToyyibPay callback received - Full body:', req.body);
    console.log('ToyyibPay callback received - Full query:', req.query);
    
    // ToyyibPay might send different field names, so we need to handle various possibilities
    let order_id = req.body.order_id || req.body.orderId || req.body.referenceNo || req.query.order_id;
    const status = req.body.status || req.query.status_id || req.query.status;
    const billcode = req.body.billcode || req.body.billCode || req.query.billcode;
    
    // If order_id is the external reference number (BND-{orderId}-{timestamp}), extract the orderId
    if (order_id && order_id.startsWith('BND-')) {
      const parts = order_id.split('-');
      if (parts.length >= 2) {
        order_id = parts[1]; // Extract the orderId part
      }
    }
    
    console.log('ToyyibPay callback parsed:', { order_id, status, billcode });
    
    if (!order_id) {
      console.error('No order_id found in callback:', req.body);
      return res.status(400).json({ success: false, message: 'No order_id provided' });
    }
    
    if (status === '1') { // Payment successful
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if order is still pending
        const orderCheck = await client.query(
          'SELECT status FROM orders WHERE order_id = $1 FOR UPDATE',
          [order_id]
        );
        
        if (orderCheck.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        if (orderCheck.rows[0].status === 'paid') {
          console.log(`Order ${order_id} already marked as paid`);
          await client.query('COMMIT');
          return res.json({ success: true, message: 'Order already processed' });
        }
        
        // Update order status to paid
        await client.query(
          'UPDATE orders SET status = $1, payment_date = NOW() WHERE order_id = $2',
          ['paid', order_id]
        );
        
        // Get order items for stock update
        const orderItems = await client.query(
          'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
          [order_id]
        );
        
        // Update stock for each item
        for (const item of orderItems.rows) {
          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
            [item.quantity, item.variant_id]
          );
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Payment processed successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing payment:', err);
        res.status(500).json({ success: false, message: 'Error processing payment' });
      } finally {
        client.release();
      }
    } else {
      // Payment failed or pending
      await pool.query(
        'UPDATE orders SET status = $1 WHERE order_id = $2',
        [status === '2' ? 'pending' : 'failed', order_id]
      );
      console.log(`Order ${order_id} payment status: ${status}`);
      res.json({ success: true, message: 'Payment status updated' });
    }
  } catch (err) {
    console.error('ToyyibPay callback error:', err);
    res.status(500).json({ success: false, message: 'Callback error' });
  }
});

// ToyyibPay Return URL Handler - When user returns from payment
app.get('/thank-you/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { status_id, status, order_id, billcode, msg } = req.query; // ToyyibPay parameters
  
  console.log(`Thank you page accessed for order ${orderId}`);
  console.log(`Full query parameters:`, req.query);
  
  // Use status_id if available, otherwise fall back to status
  const paymentStatus = status_id || status;
  
  console.log(`Payment status determined: ${paymentStatus}`);
  
  // ToyyibPay Status Codes:
  // status_id/status = '1' -> Payment successful
  // status_id/status = '0' -> Payment failed
  // status_id/status = '2' -> Payment pending
  // no status -> User returned without completing payment
  
  try {
    // Get order details
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).send('Order not found');
    }
    
    const order = orderResult.rows[0];
    
    // If payment was successful (status=1) but order is still pending, update it
    if (paymentStatus === '1' && order.status === 'pending') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if order is still pending (prevent double processing)
        const orderCheck = await client.query(
          'SELECT status FROM orders WHERE order_id = $1 FOR UPDATE',
          [orderId]
        );
        
        if (orderCheck.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        if (orderCheck.rows[0].status === 'paid') {
          console.log(`Order ${orderId} already processed via return URL`);
          await client.query('COMMIT');
        } else {
          // Update order status to 'paid'
          await client.query(
            'UPDATE orders SET status = $1 WHERE order_id = $2',
            ['paid', orderId]
          );
          
          // Get order items and deduct stock with validation
          const orderItemsResult = await client.query(
            'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
            [orderId]
          );
          
          // Deduct stock for each item with validation
          for (const item of orderItemsResult.rows) {
            // Check current stock before deducting
            const stockCheck = await client.query(
              'SELECT stock_quantity FROM product_variants WHERE variant_id = $1 FOR UPDATE',
              [item.variant_id]
            );
            
            if (stockCheck.rows.length === 0) {
              throw new Error(`Variant ${item.variant_id} not found during stock deduction`);
            }
            
            const currentStock = stockCheck.rows[0].stock_quantity;
            if (currentStock < item.quantity) {
              throw new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${currentStock}, Requested: ${item.quantity}`);
            }
            
            // Deduct stock
            await client.query(
              'UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
              [item.quantity, item.variant_id]
            );
            
            console.log(`Deducted ${item.quantity} from variant ${item.variant_id} via return URL`);
          }
          
          await client.query('COMMIT');
          console.log(`Order ${orderId} payment confirmed via return URL`);
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing payment confirmation via return URL:', err);
      } finally {
        client.release();
      }
      
      // Refresh order data after update
      const updatedOrderResult = await pool.query(
        'SELECT * FROM orders WHERE order_id = $1',
        [orderId]
      );
      if (updatedOrderResult.rows.length > 0) {
        order.status = updatedOrderResult.rows[0].status;
      }
    }
    
    // Handle failed payments - ALWAYS redirect for failed status
    if (paymentStatus === '0' || paymentStatus === '2') {
      console.log(`Order ${orderId} payment failed with status ${paymentStatus}, redirecting to products page`);
      return res.redirect('/products?message=Payment failed. Please try again.');
    }
    
    // Handle pending payments
    if (paymentStatus === '2') {
      console.log(`Order ${orderId} payment is pending, redirecting to products page`);
      return res.redirect('/products?message=Payment is pending. Please check your payment status.');
    }
    
    // If status is not '1' (success), redirect to products page
    if (paymentStatus && paymentStatus !== '1') {
      console.log(`Order ${orderId} has non-success status ${paymentStatus}, redirecting to products page`);
      return res.redirect('/products?message=Payment was not successful. Please try again.');
    }
    
    // If no status parameter is provided, check the order status in database
    if (!paymentStatus) {
      console.log(`No status parameter provided for order ${orderId}, checking database status`);
      if (order.status !== 'paid') {
        console.log(`Order ${orderId} status in database is ${order.status}, redirecting to products page`);
        return res.redirect('/products?message=Payment status unclear. Please contact support if payment was made.');
      }
    }
    
    // If we reach here, status is '1' (successful payment)
    // If order is still pending, try to process it
    if (order.status === 'pending') {
      console.log(`Order ${orderId} is pending but status is 1, attempting to process payment`);
      // The payment processing logic above should have already handled this
    }
    
    // Only show thank you page for paid orders
    if (order.status !== 'paid') {
      console.log(`Order ${orderId} status is ${order.status}, redirecting to products page`);
      
      // As a fallback, check if there's a payment_date set (indicating payment was processed)
      if (order.payment_date) {
        console.log(`Order ${orderId} has payment_date but status is ${order.status}, updating status to paid`);
        await pool.query(
          'UPDATE orders SET status = $1 WHERE order_id = $2',
          ['paid', orderId]
        );
        order.status = 'paid';
      } else {
        return res.redirect('/products?message=Payment pending or failed. Please contact support if payment was made.');
      }
    }
    
    // Get customer details
    const customerResult = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [order.customer_id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).send('Customer not found');
    }
    
    const customer = customerResult.rows[0];
    
    // Get order items with product details
    const orderItemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name, pv.color, pv.size
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_id = pv.variant_id
      JOIN products p ON pv.product_id = p.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.item_id
    `, [orderId]);
    
    // Convert total_amount to number before passing to template
    order.total_amount = Number(order.total_amount);
    
    res.render('thank-you', {
      title: 'Thank You - BND',
      order: order,
      customer: customer,
      orderItems: orderItemsResult.rows
    });
  } catch (err) {
    console.error('Error loading thank you page:', err);
    res.status(500).send('Error loading order details');
  }
});

// ToyyibPay Callback Endpoint - Handle payment confirmation (GET method)
app.get('/toyyibpay-callback', async (req, res) => {
  try {
    console.log('ToyyibPay GET callback received - Full query:', req.query);
    
    // ToyyibPay might send different field names, so we need to handle various possibilities
    let order_id = req.query.order_id || req.query.orderId || req.query.referenceNo;
    const status = req.query.status_id || req.query.status;
    const billcode = req.query.billcode || req.query.billCode;
    
    // If order_id is the external reference number (BND-{orderId}-{timestamp}), extract the orderId
    if (order_id && order_id.startsWith('BND-')) {
      const parts = order_id.split('-');
      if (parts.length >= 2) {
        order_id = parts[1]; // Extract the orderId part
      }
    }
    
    console.log('ToyyibPay GET callback parsed:', { order_id, status, billcode });
    
    if (!order_id) {
      console.error('No order_id found in GET callback:', req.query);
      return res.status(400).json({ success: false, message: 'No order_id provided' });
    }
    
    if (status === '1') { // Payment successful
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if order is still pending
        const orderCheck = await client.query(
          'SELECT status FROM orders WHERE order_id = $1 FOR UPDATE',
          [order_id]
        );
        
        if (orderCheck.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        if (orderCheck.rows[0].status === 'paid') {
          console.log(`Order ${order_id} already marked as paid`);
          await client.query('COMMIT');
          return res.json({ success: true, message: 'Order already processed' });
        }
        
        // Update order status to paid
        await client.query(
          'UPDATE orders SET status = $1, payment_date = NOW() WHERE order_id = $2',
          ['paid', order_id]
        );
        
        // Get order items for stock update
        const orderItems = await client.query(
          'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
          [order_id]
        );
        
        // Update stock for each item
        for (const item of orderItems.rows) {
          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
            [item.quantity, item.variant_id]
          );
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Payment processed successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing payment:', err);
        res.status(500).json({ success: false, message: 'Error processing payment' });
      } finally {
        client.release();
      }
    } else {
      // Payment failed or pending
      await pool.query(
        'UPDATE orders SET status = $1 WHERE order_id = $2',
        [status === '2' ? 'pending' : 'failed', order_id]
      );
      console.log(`Order ${order_id} payment status: ${status}`);
      res.json({ success: true, message: 'Payment status updated' });
    }
  } catch (err) {
    console.error('ToyyibPay GET callback error:', err);
    res.status(500).json({ success: false, message: 'Callback error' });
  }
});

// Manual Payment Verification Endpoint (for debugging/testing)
app.post('/api/verify-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    console.log(`Manual payment verification for order ${orderId} with status ${status}`);
    
    if (status === '1') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Check if order exists and is pending
        const orderCheck = await client.query(
          'SELECT status FROM orders WHERE order_id = $1 FOR UPDATE',
          [orderId]
        );
        
        if (orderCheck.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        if (orderCheck.rows[0].status === 'paid') {
          console.log(`Order ${orderId} already marked as paid`);
          await client.query('COMMIT');
          return res.json({ success: true, message: 'Order already processed' });
        }
        
        // Update order status to paid
        await client.query(
          'UPDATE orders SET status = $1, payment_date = NOW() WHERE order_id = $2',
          ['paid', orderId]
        );
        
        // Get order items for stock update
        const orderItems = await client.query(
          'SELECT variant_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );
        
        // Update stock for each item
        for (const item of orderItems.rows) {
          await client.query(
            'UPDATE product_variants SET stock_quantity = stock_quantity - $1 WHERE variant_id = $2',
            [item.quantity, item.variant_id]
          );
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Payment verified and processed successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing manual payment verification:', err);
        res.status(500).json({ success: false, message: 'Error processing payment verification' });
      } finally {
        client.release();
      }
    } else {
      res.json({ success: false, message: 'Invalid payment status' });
    }
  } catch (err) {
    console.error('Manual payment verification error:', err);
    res.status(500).json({ success: false, message: 'Verification error' });
  }
});

// --- Main Server Function ---
// This function will connect to the DB and then start the Express server.
async function startServer() {
  try {
    // Test the database connection
    console.log("Attempting to connect to the database...");
    const client = await pool.connect();
    console.log("Database connection test successful. Releasing client.");
    client.release();

    // Start the Express server only after a successful DB connection test
    app.listen(PORT, () => {
      console.log(`Server is running and listening on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("FATAL: Could not connect to the database. Server will not start.");
    console.error(error.stack);
    process.exit(1); // Exit the application with an error code
  }
}

// --- Run the server ---
startServer();
