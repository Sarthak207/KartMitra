// server.js
BigInt.prototype.toJSON = function () { return this.toString(); };
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Smart Cart API Server Running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
