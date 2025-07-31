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

// Checkout Page
app.get('/checkout', (req, res) => {
  res.render('checkout', { title: 'Checkout - BND' });
});



// API Route for Creating Pending Order (before payment)
app.post('/api/create-pending-order', async (req, res) => {
  const { email, name, phone, address, cart } = req.body;
  if (!cart || !Array.isArray(cart) || cart.length === 0 || !email) {
    return res.status(400).json({ success: false, message: 'Missing required order information.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, verify stock availability
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
    
    // 1. Upsert user
    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, address=EXCLUDED.address
       RETURNING user_id`,
      [name || 'New User', email, phone || '', address || '']
    );
    const userId = userResult.rows[0].user_id;
    
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
    // 1. Upsert user
    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, address=EXCLUDED.address
       RETURNING user_id`,
      [name || 'New User', email, phone || '', address || '']
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

// ToyyibPay Checkout Endpoint
app.post('/checkout', async (req, res) => {
  try {
    const { cart, customer, orderId } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (!customer || !customer.name || !customer.email || !customer.phone) {
      return res.status(400).json({ success: false, message: 'Customer info required.' });
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

    // If stock check passes, calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
      billReturnUrl: req.protocol + '://' + req.get('host') + `/thank-you/${orderId}?status=1`,
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
    const { order_id, status, billcode } = req.body;
    console.log('ToyyibPay callback received:', { order_id, status, billcode });
    
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
  const { status } = req.query; // ToyyibPay will add status parameter
  
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
    if (status === '1' && order.status === 'pending') {
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
    
    // Handle failed payments
    if (status === '0' || status === '2') {
      return res.redirect('/products?message=Payment failed. Please try again.');
    }
    
    // Only show thank you page for paid orders
    if (order.status !== 'paid') {
      return res.redirect('/products?message=Payment pending or failed');
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