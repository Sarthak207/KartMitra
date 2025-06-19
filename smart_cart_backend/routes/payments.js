const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('./auth');

// Initialize Razorpay with enhanced error handling
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Log Razorpay initialization status
console.log("Razorpay initialized with key:", process.env.RAZORPAY_KEY_ID ? "✅ Success" : "❌ Failed");

// Create Razorpay Order with validation
router.post('/create-order', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  
  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      error: 'Invalid amount',
      uiHint: 'Please provide a valid positive amount in INR'
    });
  }

  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: "receipt_" + Date.now(),
    payment_capture: 1
  };

  try {
    const order = await razorpay.orders.create(options);
    console.log(`? Order created: ${order.id}`);
    
    // Add key to response for frontend
    res.json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('? Order creation failed:', {
      error: err.error?.description || err.message,
      amount: amount
    });
    
    res.status(500).json({
      error: 'Payment gateway error',
      uiHint: 'Payment initialization failed. Please try again.',
      code: 'RAZORPAY_ORDER_FAILED'
    });
  }
});
  

// Enhanced payment verification
router.post('/verify-payment', authenticateToken, (req, res) => {
  const { order_id, payment_id, signature } = req.body;
  
  if (!order_id || !payment_id || !signature) {
    return res.status(400).json({
      error: 'Missing verification parameters',
      uiHint: 'Invalid payment verification request'
    });
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest('hex');

    if (expectedSignature === signature) {
      console.log(`✅ Payment verified for order ${order_id}`);
      res.json({
        success: true,
        order_id,
        payment_id,
        signature_valid: true
      });
    } else {
      console.warn('⚠️ Signature mismatch for order:', order_id);
      res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
        uiHint: 'Payment verification failed. Please contact support.'
      });
    }
  } catch (err) {
    console.error('❌ Verification error:', err);
    res.status(500).json({
      success: false,
      error: 'Verification process failed',
      uiHint: 'Payment verification error. Please try again.'
    });
  }
});

module.exports = router;
