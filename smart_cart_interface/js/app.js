// Smart Cart Frontend Connected to Backend

function SmartCartApp() {
    this.currentUser = null;
    this.isAdmin = false;
    this.products = [];
    this.cart = [];
    this.totalAmount = 0;
    this.init();
}

SmartCartApp.prototype.init = function() {
    var user = localStorage.getItem('user');
    if (user) {
        this.currentUser = JSON.parse(user);
        this.isAdmin = this.currentUser.role === 'admin';
        this.showMainDashboard();
    } else {
        this.showAuthScreen();
    }
};

SmartCartApp.prototype.showAuthScreen = function() {
    var app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-container">
            <div class="auth-tabs">
                <button class="active" data-action="login">Login</button>
                <button data-action="register">Register</button>
            </div>
            <div id="auth-content"></div>
        </div>
    `;
    this.showLoginForm();
    this.setupAuthTabs();
};

SmartCartApp.prototype.setupAuthTabs = function() {
    var self = this;
    var tabs = document.querySelectorAll('[data-action]');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function(e) {
            document.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            if (e.target.dataset.action === 'login') {
                self.showLoginForm();
            } else {
                self.showRegisterForm();
            }
        });
    });
};

SmartCartApp.prototype.showLoginForm = function() {
    var container = document.getElementById('auth-content');
    container.innerHTML = `
        <form id="login-form" class="auth-form">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
            <div class="error-message"></div>
        </form>
    `;
    this.setupAuthFormListeners();
};

SmartCartApp.prototype.showRegisterForm = function() {
    var container = document.getElementById('auth-content');
    container.innerHTML = `
        <form id="register-form" class="auth-form">
            <input type="text" name="username" placeholder="Username" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <input type="text" name="name" placeholder="Full Name" required>
            <button type="submit">Register</button>
            <div class="error-message"></div>
        </form>
    `;
    this.setupAuthFormListeners();
};

SmartCartApp.prototype.setupAuthFormListeners = function() {
    var self = this;
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            self.handleLogin(e);
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            self.handleRegister(e);
        });
    }
};

SmartCartApp.prototype.handleRegister = function(event) {
    var self = this;
    var formData = new FormData(event.target);
    var userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        name: formData.get('name')
    };
    fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) {
            self.showError('register-error', data.error);
        } else {
            self.showSuccessMessage('Registration successful! Please login.');
            setTimeout(function() { self.showLoginForm(); }, 1500);
        }
    });
};

SmartCartApp.prototype.handleLogin = function(event) {
    var self = this;
    var formData = new FormData(event.target);
    var userData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            self.currentUser = data.user;
            self.isAdmin = data.user.role === 'admin';
            self.showSuccessMessage('Login successful! Welcome back!');
            setTimeout(function() { self.showMainDashboard(); }, 1500);
        } else {
            self.showError('login-error', data.error || 'Login failed');
        }
    });
};

SmartCartApp.prototype.logout = function() {
    localStorage.clear();
    this.currentUser = null;
    this.showAuthScreen();
};

SmartCartApp.prototype.showMainDashboard = function() {
    var app = document.getElementById('app');
    app.innerHTML = `
        <div class="dashboard">
            <header>
                <h1>Welcome, ${this.currentUser ? this.currentUser.name : 'Guest'}!</h1>
                <button onclick="smartCart.logout()">Logout</button>
            </header>
            <nav>
                <button onclick="smartCart.showProducts()">Products</button>
                <button onclick="smartCart.showCart()">Cart</button>
                ${this.isAdmin ? '<button onclick="smartCart.showAdminPanel()">Admin</button>' : ''}
            </nav>
            <div id="content"></div>
        </div>
    `;
    this.showProducts();
};

SmartCartApp.prototype.renderProducts = function() {
    var container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = this.products.map(function(product) {
        return `
            <div class="product-card">
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button onclick="smartCart.addToCart(${product.id})">Add to Cart</button>
            </div>
        `;
    }).join('');
};

SmartCartApp.prototype.loadProducts = function(callback) {
    var self = this;
    fetch('http://localhost:3000/api/products')
        .then(function(res) { return res.json(); })
        .then(function(products) {
            self.products = products;
            if (callback) callback();
        });
};

SmartCartApp.prototype.showProducts = function() {
    var content = document.getElementById('content');
    content.innerHTML = '<div id="products-container"></div>';
    this.loadProducts(function() { this.renderProducts(); }.bind(this));
};

SmartCartApp.prototype.renderCart = function() {
    var container = document.getElementById('cart-container');
    if (!container) return;
    container.innerHTML = `
        <h2>Your Cart (${this.cart.length} items)</h2>
        ${this.cart.map(function(item) {
            return `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>Qty: ${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `;
        }).join('')}
        <div class="cart-total">
            <h3>Total: $${this.totalAmount.toFixed(2)}</h3>
            <button onclick="smartCart.checkout()">Checkout</button>
        </div>
    `;
};

SmartCartApp.prototype.loadCart = function(callback) {
    var self = this;
    var userId = this.currentUser ? this.currentUser.id : null;
    if (!userId) return;

    fetch(`http://localhost:3000/api/cart/${userId}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
    .then(function(res) { return res.json(); })
    .then(function(cart) {
        self.cart = cart;
        self.updateCartTotal();
        if (callback) callback();
    });
};

SmartCartApp.prototype.showCart = function() {
    var content = document.getElementById('content');
    content.innerHTML = '<div id="cart-container"></div>';
    this.loadCart(function() { this.renderCart(); }.bind(this));
};

SmartCartApp.prototype.addToCart = function(productId) {
    var self = this;
    var userId = this.currentUser ? this.currentUser.id : null;
    if (!userId) return;

    fetch(`http://localhost:3000/api/cart/${userId}/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ productId: productId, quantity: 1 })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) {
            self.showError('cart-error', data.error);
        } else {
            self.cart = data.cart;
            self.updateCartTotal();
            self.updateCartDisplay();
            self.showAddToCartFeedback('Product added to cart!');
        }
    });
};

SmartCartApp.prototype.checkout = function() {
    var self = this;
    var userId = this.currentUser ? this.currentUser.id : null;
    if (!userId) return;

    fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
            userId: userId,
            items: self.cart,
            total: self.totalAmount,
            paymentMethod: 'Quick Checkout'
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.error) {
            alert(data.error);
        } else {
            self.cart = [];
            self.totalAmount = 0;
            self.showSuccessMessage('Order placed! Order ID: ' + data.id);
            self.showMainDashboard();
        }
    });
};

SmartCartApp.prototype.showAdminPanel = function() {
    var content = document.getElementById('content');
    content.innerHTML = '<div class="admin-panel"><h2>Admin Panel</h2><p>Admin features coming soon!</p></div>';
};

SmartCartApp.prototype.updateCartTotal = function() {
    this.totalAmount = this.cart.reduce(function(sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
};

SmartCartApp.prototype.updateCartDisplay = function() {
    this.renderCart();
};

SmartCartApp.prototype.showError = function(id, message) {
    var element = document.getElementById(id) || document.getElementById('error-message');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 5000);
    } else {
        alert(message);
    }
};

SmartCartApp.prototype.showSuccessMessage = function(message) {
    var element = document.getElementById('success-message');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 3000);
    } else {
        alert(message);
    }
};

SmartCartApp.prototype.showAddToCartFeedback = function(message) {
    var element = document.getElementById('add-to-cart-feedback');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 2000);
    } else {
        alert(message);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    window.smartCart = new SmartCartApp();
});
