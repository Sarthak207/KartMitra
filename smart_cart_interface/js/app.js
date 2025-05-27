// Smart Cart Interface Application - Complete Final Version
function SmartCartApp() {
    this.currentView = 'loading';
    this.cart = [];
    this.products = [];
    this.totalAmount = 0;
    this.selectedCategory = 'all';
    this.userLocation = { x: 50, y: 400 };
    this.currentUser = null;
    this.users = [];
    this.orders = [];
    this.isAdmin = false;
    
    // Initialize the app
    this.init();
}

SmartCartApp.prototype.init = function() {
    var self = this;
    console.log('Smart Cart Interface Starting...');
    
    this.checkAuthStatus();
    
    setTimeout(function() {
        self.hideLoadingScreen();
        if (self.currentUser) {
            self.showMainDashboard();
        } else {
            self.showAuthScreen();
        }
    }, 2000);
    
    this.loadProducts();
    this.loadSampleUsers();
    this.loadSampleOrders();
};

SmartCartApp.prototype.loadSampleUsers = function() {
    this.users = [
        { id: 1, username: 'demo', email: 'demo@smartcart.com', password: 'demo123', name: 'Demo User', role: 'customer' },
        { id: 2, username: 'admin', email: 'admin@smartcart.com', password: 'admin123', name: 'Admin User', role: 'admin' }
    ];
};

SmartCartApp.prototype.loadSampleOrders = function() {
    this.orders = [
        { 
            id: 1001, 
            userId: 1, 
            userName: 'Demo User',
            items: [
                { name: 'Red Apples', price: 2.99, quantity: 2 },
                { name: 'Fresh Milk', price: 3.49, quantity: 1 }
            ],
            total: 9.47,
            status: 'completed',
            paymentMethod: 'PayPal',
            date: new Date('2025-05-25'),
            address: '123 Main St, City, State 12345'
        },
        { 
            id: 1002, 
            userId: 2, 
            userName: 'Admin User',
            items: [
                { name: 'Chicken Breast', price: 7.99, quantity: 1 }
            ],
            total: 7.99,
            status: 'pending',
            paymentMethod: 'Credit Card',
            date: new Date('2025-05-26'),
            address: '456 Oak Ave, City, State 67890'
        }
    ];
};

SmartCartApp.prototype.loadProducts = function() {
    this.products = [
        { id: 1, name: 'Red Apples', price: 2.99, category: 'Fruits', image: '🍎', location: 'Aisle 1, Shelf A', mapX: 150, mapY: 200, stock: 50 },
        { id: 2, name: 'Whole Wheat Bread', price: 1.99, category: 'Bakery', image: '🍞', location: 'Aisle 3, Shelf B', mapX: 350, mapY: 150, stock: 25 },
        { id: 3, name: 'Fresh Milk', price: 3.49, category: 'Dairy', image: '🥛', location: 'Aisle 2, Shelf C', mapX: 250, mapY: 300, stock: 30 },
        { id: 4, name: 'Bananas', price: 1.29, category: 'Fruits', image: '🍌', location: 'Aisle 1, Shelf A', mapX: 150, mapY: 220, stock: 40 },
        { id: 5, name: 'Cheddar Cheese', price: 4.99, category: 'Dairy', image: '🧀', location: 'Aisle 2, Shelf D', mapX: 250, mapY: 320, stock: 15 },
        { id: 6, name: 'Croissants', price: 3.99, category: 'Bakery', image: '🥐', location: 'Aisle 3, Shelf A', mapX: 350, mapY: 130, stock: 20 },
        { id: 7, name: 'Orange Juice', price: 2.79, category: 'Beverages', image: '🧃', location: 'Aisle 4, Shelf B', mapX: 450, mapY: 250, stock: 35 },
        { id: 8, name: 'Chicken Breast', price: 7.99, category: 'Meat', image: '🍗', location: 'Aisle 5, Shelf A', mapX: 550, mapY: 180, stock: 12 }
    ];
};

SmartCartApp.prototype.checkAuthStatus = function() {
    var savedUser = localStorage.getItem('smartCartUser');
    if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.isAdmin = this.currentUser.role === 'admin';
    }
};

SmartCartApp.prototype.hideLoadingScreen = function() {
    var loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
};

SmartCartApp.prototype.showAuthScreen = function() {
    var app = document.getElementById('app');
    
    var authHTML = '<div id="auth-view">' +
        '<div class="auth-container">' +
            '<div class="auth-header">' +
                '<h1>🛒 Smart Cart</h1>' +
                '<p>Your intelligent shopping companion</p>' +
            '</div>' +
            '<div class="auth-tabs">' +
                '<button type="button" class="auth-tab active" data-action="showLoginForm">Login</button>' +
                '<button type="button" class="auth-tab" data-action="showRegisterForm">Register</button>' +
            '</div>' +
            '<div id="auth-form-container">' +
                this.renderLoginForm() +
            '</div>' +
            '<div class="demo-credentials">' +
                '<p><strong>Demo Credentials:</strong></p>' +
                '<p>Customer: demo / demo123</p>' +
                '<p>Admin: admin / admin123</p>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = authHTML;
    this.currentView = 'auth';
    this.setupAuthEventListeners();
};

SmartCartApp.prototype.renderLoginForm = function() {
    return '<form id="login-form" class="auth-form">' +
        '<h2>Welcome Back!</h2>' +
        '<div class="form-group">' +
            '<label for="login-username">Username or Email</label>' +
            '<input type="text" id="login-username" name="username" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label for="login-password">Password</label>' +
            '<input type="password" id="login-password" name="password" required>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary auth-btn">Login</button>' +
        '<div id="login-error" class="error-message"></div>' +
    '</form>';
};

SmartCartApp.prototype.renderRegisterForm = function() {
    return '<form id="register-form" class="auth-form">' +
        '<h2>Create Account</h2>' +
        '<div class="form-group">' +
            '<label for="register-name">Full Name</label>' +
            '<input type="text" id="register-name" name="name" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label for="register-username">Username</label>' +
            '<input type="text" id="register-username" name="username" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label for="register-email">Email</label>' +
            '<input type="email" id="register-email" name="email" required>' +
        '</div>' +
        '<div class="form-group">' +
            '<label for="register-password">Password</label>' +
            '<input type="password" id="register-password" name="password" required minlength="6">' +
        '</div>' +
        '<div class="form-group">' +
            '<label for="register-confirm">Confirm Password</label>' +
            '<input type="password" id="register-confirm" name="confirmPassword" required>' +
        '</div>' +
        '<button type="submit" class="btn btn-primary auth-btn">Register</button>' +
        '<div id="register-error" class="error-message"></div>' +
    '</form>';
};

SmartCartApp.prototype.setupAuthEventListeners = function() {
    var self = this;
    
    var tabs = document.querySelectorAll('.auth-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            if (action === 'showLoginForm') {
                self.showLoginForm();
            } else if (action === 'showRegisterForm') {
                self.showRegisterForm();
            }
        });
    }
    
    this.setupFormListeners();
};

SmartCartApp.prototype.showLoginForm = function() {
    document.getElementById('auth-form-container').innerHTML = this.renderLoginForm();
    this.updateActiveTab(0);
    this.setupFormListeners();
};

SmartCartApp.prototype.showRegisterForm = function() {
    document.getElementById('auth-form-container').innerHTML = this.renderRegisterForm();
    this.updateActiveTab(1);
    this.setupFormListeners();
};

SmartCartApp.prototype.updateActiveTab = function(activeIndex) {
    var tabs = document.querySelectorAll('.auth-tab');
    for (var i = 0; i < tabs.length; i++) {
        if (i === activeIndex) {
            tabs[i].classList.add('active');
        } else {
            tabs[i].classList.remove('active');
        }
    }
};

SmartCartApp.prototype.setupFormListeners = function() {
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

SmartCartApp.prototype.handleLogin = function(event) {
    var formData = new FormData(event.target);
    var username = formData.get('username');
    var password = formData.get('password');
    
    var user = null;
    for (var i = 0; i < this.users.length; i++) {
        if (this.users[i].username === username || this.users[i].email === username) {
            user = this.users[i];
            break;
        }
    }
    
    if (!user) {
        this.showError('login-error', 'User not found');
        return;
    }
    
    if (user.password !== password) {
        this.showError('login-error', 'Invalid password');
        return;
    }
    
    this.currentUser = JSON.parse(JSON.stringify(user));
    delete this.currentUser.password;
    this.isAdmin = this.currentUser.role === 'admin';
    localStorage.setItem('smartCartUser', JSON.stringify(this.currentUser));
    
    this.showSuccessMessage('Login successful! Welcome back!');
    var self = this;
    setTimeout(function() {
        self.showMainDashboard();
    }, 1500);
};

SmartCartApp.prototype.handleRegister = function(event) {
    var formData = new FormData(event.target);
    var name = formData.get('name');
    var username = formData.get('username');
    var email = formData.get('email');
    var password = formData.get('password');
    var confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        this.showError('register-error', 'Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        this.showError('register-error', 'Password must be at least 6 characters');
        return;
    }
    
    var existingUser = null;
    for (var i = 0; i < this.users.length; i++) {
        if (this.users[i].username === username || this.users[i].email === email) {
            existingUser = this.users[i];
            break;
        }
    }
    
    if (existingUser) {
        this.showError('register-error', 'Username or email already exists');
        return;
    }
    
    var newUser = {
        id: this.users.length + 1,
        name: name,
        username: username,
        email: email,
        password: password,
        role: 'customer'
    };
    
    this.users.push(newUser);
    
    this.showSuccessMessage('Registration successful! Please login.');
    var self = this;
    setTimeout(function() {
        self.showLoginForm();
    }, 1500);
};

SmartCartApp.prototype.showError = function(elementId, message) {
    var errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(function() {
            errorElement.style.display = 'none';
        }, 5000);
    }
};

SmartCartApp.prototype.showSuccessMessage = function(message) {
    var successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(function() {
        successDiv.remove();
    }, 3000);
};

SmartCartApp.prototype.logout = function() {
    this.currentUser = null;
    this.cart = [];
    this.totalAmount = 0;
    this.isAdmin = false;
    localStorage.removeItem('smartCartUser');
    this.showAuthScreen();
};

SmartCartApp.prototype.showMainDashboard = function() {
    var app = document.getElementById('app');
    
    var dashboardHTML = '<div id="main-dashboard">' +
        '<header class="dashboard-header">' +
            '<h1>Smart Cart</h1>' +
            '<div class="user-info">' +
                '<span>Welcome, ' + this.currentUser.name + '!</span>' +
                (this.isAdmin ? '<span class="admin-badge">Admin</span>' : '') +
                '<button type="button" class="btn btn-secondary logout-btn" data-action="logout">Logout</button>' +
            '</div>' +
            '<div class="cart-status">' +
                '<span id="cart-count">' + this.cart.length + '</span> items | $<span id="cart-total">' + this.totalAmount.toFixed(2) + '</span>' +
            '</div>' +
        '</header>' +
        '<div class="dashboard-content">' +
            '<div class="navigation-buttons">' +
                '<button type="button" class="btn btn-primary nav-btn" data-action="showProducts">🛍️ Shop Products</button>' +
                '<button type="button" class="btn btn-primary nav-btn" data-action="showCart">🛒 View Cart</button>' +
                '<button type="button" class="btn btn-primary nav-btn" data-action="showMap">🗺️ Store Map</button>' +
                (this.isAdmin ? '<button type="button" class="btn btn-warning nav-btn" data-action="showAdminDashboard">👨‍💼 Admin Panel</button>' : '') +
                '<button type="button" class="btn btn-secondary nav-btn" data-action="showSettings">⚙️ Settings</button>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = dashboardHTML;
    this.currentView = 'dashboard';
    this.setupDashboardEventListeners();
};

SmartCartApp.prototype.setupDashboardEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            switch(action) {
                case 'showProducts':
                    self.showProducts();
                    break;
                case 'showCart':
                    self.showCart();
                    break;
                case 'showMap':
                    self.showMap();
                    break;
                case 'showSettings':
                    self.showSettings();
                    break;
                case 'showAdminDashboard':
                    self.showAdminDashboard();
                    break;
                case 'logout':
                    self.logout();
                    break;
            }
        });
    }
};

SmartCartApp.prototype.showProducts = function() {
    if (!this.currentUser) {
        this.showAuthScreen();
        return;
    }
    
    var app = document.getElementById('app');
    var categories = ['all'];
    
    // Get unique categories
    for (var i = 0; i < this.products.length; i++) {
        if (categories.indexOf(this.products[i].category) === -1) {
            categories.push(this.products[i].category);
        }
    }
    
    var categoryButtons = '';
    for (var j = 0; j < categories.length; j++) {
        var cat = categories[j];
        var activeClass = this.selectedCategory === cat ? ' active' : '';
        categoryButtons += '<button type="button" class="btn category-btn' + activeClass + '" data-action="filterByCategory" data-category="' + cat + '">' +
            cat.charAt(0).toUpperCase() + cat.slice(1) + '</button>';
    }
    
    var productsHTML = '<div id="products-view">' +
        '<header class="products-header">' +
            '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
            '<h2>Shop Products</h2>' +
            '<div class="cart-status">' +
                '<span id="cart-count">' + this.cart.length + '</span> items | $<span id="cart-total">' + this.totalAmount.toFixed(2) + '</span>' +
            '</div>' +
        '</header>' +
        '<div class="category-filters">' + categoryButtons + '</div>' +
        '<div class="products-grid" id="products-grid">' + this.renderProducts() + '</div>' +
    '</div>';
    
    app.innerHTML = productsHTML;
    this.currentView = 'products';
    this.setupProductsEventListeners();
};

SmartCartApp.prototype.renderProducts = function() {
    var filteredProducts = [];
    
    if (this.selectedCategory === 'all') {
        filteredProducts = this.products;
    } else {
        for (var i = 0; i < this.products.length; i++) {
            if (this.products[i].category === this.selectedCategory) {
                filteredProducts.push(this.products[i]);
            }
        }
    }
    
    var productsHTML = '';
    for (var j = 0; j < filteredProducts.length; j++) {
        var product = filteredProducts[j];
        productsHTML += '<div class="product-card">' +
            '<div class="product-image">' + product.image + '</div>' +
            '<div class="product-info">' +
                '<h3>' + product.name + '</h3>' +
                '<p class="product-price">$' + product.price.toFixed(2) + '</p>' +
                '<p class="product-location">📍 ' + product.location + '</p>' +
                '<button type="button" class="btn btn-primary add-to-cart-btn" data-action="addToCart" data-product-id="' + product.id + '">Add to Cart</button>' +
                '<button type="button" class="btn btn-secondary find-on-map-btn" data-action="findOnMap" data-product-id="' + product.id + '">📍 Find on Map</button>' +
            '</div>' +
        '</div>';
    }
    
    return productsHTML;
};

SmartCartApp.prototype.setupProductsEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            var productId = parseInt(e.target.getAttribute('data-product-id'));
            var category = e.target.getAttribute('data-category');
            
            switch(action) {
                case 'showMainDashboard':
                    self.showMainDashboard();
                    break;
                case 'filterByCategory':
                    self.filterByCategory(category, e.target);
                    break;
                case 'addToCart':
                    self.addToCart(productId);
                    break;
                case 'findOnMap':
                    self.findOnMap(productId);
                    break;
            }
        });
    }
};

SmartCartApp.prototype.filterByCategory = function(category, buttonElement) {
    this.selectedCategory = category;
    document.getElementById('products-grid').innerHTML = this.renderProducts();
    
    var categoryBtns = document.querySelectorAll('.category-btn');
    for (var i = 0; i < categoryBtns.length; i++) {
        categoryBtns[i].classList.remove('active');
    }
    buttonElement.classList.add('active');
    
    this.setupProductsEventListeners();
};

SmartCartApp.prototype.addToCart = function(productId) {
    var product = null;
    for (var i = 0; i < this.products.length; i++) {
        if (this.products[i].id === productId) {
            product = this.products[i];
            break;
        }
    }
    
    if (product) {
        var existingItem = null;
        for (var j = 0; j < this.cart.length; j++) {
            if (this.cart[j].id === productId) {
                existingItem = this.cart[j];
                break;
            }
        }
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            var cartItem = JSON.parse(JSON.stringify(product));
            cartItem.quantity = 1;
            this.cart.push(cartItem);
        }
        
        this.updateCartTotal();
        this.updateCartDisplay();
        this.showAddToCartFeedback(product.name);
    }
};

SmartCartApp.prototype.findOnMap = function(productId) {
    this.showMap(productId);
};

SmartCartApp.prototype.updateCartTotal = function() {
    this.totalAmount = 0;
    for (var i = 0; i < this.cart.length; i++) {
        this.totalAmount += this.cart[i].price * this.cart[i].quantity;
    }
};

SmartCartApp.prototype.updateCartDisplay = function() {
    var cartCount = document.getElementById('cart-count');
    var cartTotal = document.getElementById('cart-total');
    
    if (cartCount) cartCount.textContent = this.cart.length;
    if (cartTotal) cartTotal.textContent = this.totalAmount.toFixed(2);
};

SmartCartApp.prototype.showAddToCartFeedback = function(productName) {
    var feedback = document.createElement('div');
    feedback.className = 'add-to-cart-feedback';
    feedback.textContent = '✓ ' + productName + ' added to cart!';
    document.body.appendChild(feedback);
    
    setTimeout(function() {
        feedback.remove();
    }, 2000);
};

SmartCartApp.prototype.showCart = function() {
    var app = document.getElementById('app');
    
    if (this.cart.length === 0) {
        app.innerHTML = '<div id="cart-view">' +
            '<header class="cart-header">' +
                '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
                '<h2>Your Cart is Empty</h2>' +
            '</header>' +
            '<div class="empty-cart-message">' +
                '<p>Add some products to your cart to see them here.</p>' +
            '</div>' +
        '</div>';
        this.currentView = 'cart';
        this.setupCartEventListeners();
        return;
    }
    
    var cartItemsHTML = '';
    for (var i = 0; i < this.cart.length; i++) {
        var item = this.cart[i];
        cartItemsHTML += '<div class="cart-item">' +
            '<div class="cart-item-info">' +
                '<span class="cart-item-name">' + item.name + '</span>' +
                '<span class="cart-item-price">$' + item.price.toFixed(2) + '</span>' +
            '</div>' +
            '<div class="cart-item-quantity">' +
                '<button type="button" class="btn quantity-btn" data-action="changeQuantity" data-product-id="' + item.id + '" data-delta="-1">-</button>' +
                '<span>' + item.quantity + '</span>' +
                '<button type="button" class="btn quantity-btn" data-action="changeQuantity" data-product-id="' + item.id + '" data-delta="1">+</button>' +
            '</div>' +
            '<div class="cart-item-total">$' + (item.price * item.quantity).toFixed(2) + '</div>' +
            '<button type="button" class="btn btn-danger remove-btn" data-action="removeFromCart" data-product-id="' + item.id + '">Remove</button>' +
        '</div>';
    }
    
    var cartHTML = '<div id="cart-view">' +
        '<header class="cart-header">' +
            '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
            '<h2>Your Shopping Cart</h2>' +
        '</header>' +
        '<div class="cart-items">' + cartItemsHTML + '</div>' +
        '<div class="cart-summary">' +
            '<div class="total-label">Total:</div>' +
            '<div class="total-amount">$' + this.totalAmount.toFixed(2) + '</div>' +
        '</div>' +
        '<div class="checkout-section">' +
            '<button type="button" class="btn btn-primary checkout-btn" data-action="checkout">Proceed to Checkout</button>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = cartHTML;
    this.currentView = 'cart';
    this.setupCartEventListeners();
};

SmartCartApp.prototype.setupCartEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            var productId = parseInt(e.target.getAttribute('data-product-id'));
            var delta = parseInt(e.target.getAttribute('data-delta'));
            
            switch(action) {
                case 'showMainDashboard':
                    self.showMainDashboard();
                    break;
                case 'changeQuantity':
                    self.changeQuantity(productId, delta);
                    break;
                case 'removeFromCart':
                    self.removeFromCart(productId);
                    break;
                case 'checkout':
                    self.checkout();
                    break;
            }
        });
    }
};

SmartCartApp.prototype.changeQuantity = function(productId, delta) {
    var item = null;
    for (var i = 0; i < this.cart.length; i++) {
        if (this.cart[i].id === productId) {
            item = this.cart[i];
            break;
        }
    }
    
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            this.removeFromCart(productId);
        } else {
            this.updateCartTotal();
            this.showCart();
        }
    }
};

SmartCartApp.prototype.removeFromCart = function(productId) {
    var newCart = [];
    for (var i = 0; i < this.cart.length; i++) {
        if (this.cart[i].id !== productId) {
            newCart.push(this.cart[i]);
        }
    }
    this.cart = newCart;
    this.updateCartTotal();
    this.showCart();
};

SmartCartApp.prototype.checkout = function() {
    if (this.cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Create new order
    var newOrder = {
        id: this.orders.length + 1001,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        items: JSON.parse(JSON.stringify(this.cart)),
        total: this.totalAmount,
        status: 'completed',
        paymentMethod: 'Quick Checkout',
        date: new Date(),
        address: 'Default Address'
    };
    
    this.orders.push(newOrder);
    
    alert('Thank you for your purchase! Order #' + newOrder.id + ' - Total: $' + this.totalAmount.toFixed(2));
    this.cart = [];
    this.totalAmount = 0;
    this.showMainDashboard();
};

SmartCartApp.prototype.showMap = function(highlightProductId) {
    var app = document.getElementById('app');
    
    var productLocations = '';
    for (var i = 0; i < this.products.length; i++) {
        var product = this.products[i];
        var isHighlighted = product.id === highlightProductId;
        var color = isHighlighted ? '#dc3545' : '#28a745';
        var strokeColor = isHighlighted ? '#c82333' : '#1e7e34';
        
        productLocations += '<circle cx="' + (product.mapX || 150) + '" cy="' + (product.mapY || 200) + '" r="6" fill="' + color + '" stroke="' + strokeColor + '" stroke-width="2"/>' +
            '<text x="' + (product.mapX || 150) + '" y="' + ((product.mapY || 200) - 12) + '" text-anchor="middle" font-size="10" fill="' + color + '" font-weight="bold">' + product.image + '</text>';
    }
    
    var navigationPath = '';
    if (highlightProductId) {
        var targetProduct = null;
        for (var j = 0; j < this.products.length; j++) {
            if (this.products[j].id === highlightProductId) {
                targetProduct = this.products[j];
                break;
            }
        }
        
        if (targetProduct) {
            navigationPath = '<line x1="' + this.userLocation.x + '" y1="' + this.userLocation.y + '" x2="' + (targetProduct.mapX || 150) + '" y2="' + (targetProduct.mapY || 200) + '" stroke="#007bff" stroke-width="3" stroke-dasharray="5,5" opacity="0.7"/>' +
                '<text x="' + ((this.userLocation.x + (targetProduct.mapX || 150)) / 2) + '" y="' + ((this.userLocation.y + (targetProduct.mapY || 200)) / 2 - 10) + '" text-anchor="middle" font-size="12" fill="#007bff" font-weight="bold">→ ' + targetProduct.name + '</text>';
        }
    }
    
    var mapHTML = '<div id="map-view">' +
        '<header class="map-header">' +
            '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
            '<h2>Store Map</h2>' +
            '<div class="cart-status">' +
                '<span id="cart-count">' + this.cart.length + '</span> items | $<span id="cart-total">' + this.totalAmount.toFixed(2) + '</span>' +
            '</div>' +
        '</header>' +
        '<div class="map-container">' +
            '<svg id="store-map" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="0" y="0" width="600" height="500" fill="#f8f9fa" stroke="#ddd" stroke-width="2"/>' +
                '<rect x="100" y="100" width="80" height="300" fill="#e9ecef" stroke="#6c757d" stroke-width="1"/>' +
                '<text x="140" y="260" text-anchor="middle" font-size="14" fill="#495057">Aisle 1</text>' +
                '<rect x="200" y="100" width="80" height="300" fill="#e9ecef" stroke="#6c757d" stroke-width="1"/>' +
                '<text x="240" y="260" text-anchor="middle" font-size="14" fill="#495057">Aisle 2</text>' +
                '<rect x="300" y="100" width="80" height="300" fill="#e9ecef" stroke="#6c757d" stroke-width="1"/>' +
                '<text x="340" y="260" text-anchor="middle" font-size="14" fill="#495057">Aisle 3</text>' +
                '<rect x="400" y="100" width="80" height="300" fill="#e9ecef" stroke="#6c757d" stroke-width="1"/>' +
                '<text x="440" y="260" text-anchor="middle" font-size="14" fill="#495057">Aisle 4</text>' +
                '<rect x="500" y="100" width="80" height="300" fill="#e9ecef" stroke="#6c757d" stroke-width="1"/>' +
                '<text x="540" y="260" text-anchor="middle" font-size="14" fill="#495057">Aisle 5</text>' +
                '<rect x="250" y="450" width="100" height="50" fill="#28a745" stroke="#1e7e34" stroke-width="2"/>' +
                '<text x="300" y="480" text-anchor="middle" font-size="16" fill="white" font-weight="bold">ENTRANCE</text>' +
                '<circle cx="' + this.userLocation.x + '" cy="' + this.userLocation.y + '" r="8" fill="#007bff" stroke="white" stroke-width="2"/>' +
                '<text x="' + this.userLocation.x + '" y="' + (this.userLocation.y - 15) + '" text-anchor="middle" font-size="12" fill="#007bff" font-weight="bold">YOU</text>' +
                productLocations + navigationPath +
            '</svg>' +
        '</div>' +
        '<div class="map-legend">' +
            '<div class="legend-item"><div class="legend-color" style="background: #007bff;"></div><span>Your Location</span></div>' +
            '<div class="legend-item"><div class="legend-color" style="background: #28a745;"></div><span>Products</span></div>' +
            '<div class="legend-item"><div class="legend-color" style="background: #dc3545;"></div><span>Highlighted Item</span></div>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = mapHTML;
    this.currentView = 'map';
    this.setupMapEventListeners();
};

SmartCartApp.prototype.setupMapEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            if (action === 'showMainDashboard') {
                self.showMainDashboard();
            }
        });
    }
};

SmartCartApp.prototype.showSettings = function() {
    var app = document.getElementById('app');
    
    var settingsHTML = '<div id="settings-view">' +
        '<header class="settings-header">' +
            '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
            '<h2>Settings</h2>' +
        '</header>' +
        '<div class="settings-content">' +
            '<div class="setting-group">' +
                '<h3>Display Settings</h3>' +
                '<div class="setting-item">' +
                    '<label>Theme:</label>' +
                    '<select class="setting-select">' +
                        '<option value="light">Light Mode</option>' +
                        '<option value="dark">Dark Mode</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div class="setting-group">' +
                '<h3>About</h3>' +
                '<p>Smart Cart Interface v1.0</p>' +
                '<p>Developed for enhanced shopping experience</p>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = settingsHTML;
    this.currentView = 'settings';
    this.setupSettingsEventListeners();
};

SmartCartApp.prototype.setupSettingsEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            if (action === 'showMainDashboard') {
                self.showMainDashboard();
            }
        });
    }
};

// Admin Dashboard Methods
SmartCartApp.prototype.showAdminDashboard = function() {
    if (!this.isAdmin) {
        alert('Access denied. Admin privileges required.');
        return;
    }
    
    var app = document.getElementById('app');
    
    var adminHTML = '<div id="admin-dashboard">' +
        '<header class="admin-header">' +
            '<button type="button" class="btn btn-secondary back-btn" data-action="showMainDashboard">← Back</button>' +
            '<h2>Admin Dashboard</h2>' +
            '<div class="admin-user-info">' +
                '<span class="admin-badge">Admin Panel</span>' +
                '<span>' + this.currentUser.name + '</span>' +
            '</div>' +
        '</header>' +
        '<div class="admin-content">' +
            '<div class="admin-stats">' +
                '<div class="stat-card">' +
                    '<div class="stat-icon">👥</div>' +
                    '<div class="stat-info">' +
                        '<h3>' + this.users.length + '</h3>' +
                        '<p>Total Users</p>' +
                    '</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-icon">📦</div>' +
                    '<div class="stat-info">' +
                        '<h3>' + this.products.length + '</h3>' +
                        '<p>Products</p>' +
                    '</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-icon">🛒</div>' +
                    '<div class="stat-info">' +
                        '<h3>' + this.orders.length + '</h3>' +
                        '<p>Total Orders</p>' +
                    '</div>' +
                '</div>' +
                '<div class="stat-card">' +
                    '<div class="stat-icon">💰</div>' +
                    '<div class="stat-info">' +
                        '<h3>$' + this.calculateTotalRevenue().toFixed(2) + '</h3>' +
                        '<p>Revenue</p>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="admin-tabs">' +
                '<button type="button" class="admin-tab active" data-action="showUsersTab">Users</button>' +
                '<button type="button" class="admin-tab" data-action="showProductsTab">Products</button>' +
                '<button type="button" class="admin-tab" data-action="showOrdersTab">Orders</button>' +
                '<button type="button" class="admin-tab" data-action="showAnalyticsTab">Analytics</button>' +
            '</div>' +
            '<div id="admin-tab-content">' +
                this.renderUsersTab() +
            '</div>' +
        '</div>' +
    '</div>';
    
    app.innerHTML = adminHTML;
    this.currentView = 'admin';
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.calculateTotalRevenue = function() {
    var total = 0;
    for (var i = 0; i < this.orders.length; i++) {
        if (this.orders[i].status === 'completed') {
            total += this.orders[i].total;
        }
    }
    return total;
};

SmartCartApp.prototype.setupAdminEventListeners = function() {
    var self = this;
    var buttons = document.querySelectorAll('[data-action]');
    
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener('click', function(e) {
            var action = e.target.getAttribute('data-action');
            var userId = e.target.getAttribute('data-user-id');
            var productId = e.target.getAttribute('data-product-id');
            var orderId = e.target.getAttribute('data-order-id');
            
            switch(action) {
                case 'showMainDashboard':
                    self.showMainDashboard();
                    break;
                case 'showUsersTab':
                    self.showUsersTab();
                    break;
                case 'showProductsTab':
                    self.showProductsTab();
                    break;
                case 'showOrdersTab':
                    self.showOrdersTab();
                    break;
                case 'showAnalyticsTab':
                    self.showAnalyticsTab();
                    break;
                case 'deleteUser':
                    self.deleteUser(parseInt(userId));
                    break;
                case 'editProduct':
                    self.editProduct(parseInt(productId));
                    break;
                case 'deleteProduct':
                    self.deleteProduct(parseInt(productId));
                    break;
                case 'updateOrderStatus':
                    self.updateOrderStatus(parseInt(orderId));
                    break;
                case 'addNewProduct':
                    self.showAddProductForm();
                    break;
                case 'saveProduct':
                    self.saveProduct();
                    break;
                case 'cancelEdit':
                    self.showProductsTab();
                    break;
            }
        });
    }
};

SmartCartApp.prototype.showUsersTab = function() {
    document.getElementById('admin-tab-content').innerHTML = this.renderUsersTab();
    this.updateActiveAdminTab(0);
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.renderUsersTab = function() {
    var usersHTML = '<div class="admin-section">' +
        '<div class="section-header">' +
            '<h3>User Management</h3>' +
            '<p>Manage registered users and their accounts</p>' +
        '</div>' +
        '<div class="users-table">' +
            '<table class="admin-table">' +
                '<thead>' +
                    '<tr>' +
                        '<th>ID</th>' +
                        '<th>Name</th>' +
                        '<th>Username</th>' +
                        '<th>Email</th>' +
                        '<th>Role</th>' +
                        '<th>Actions</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>';
    
    for (var i = 0; i < this.users.length; i++) {
        var user = this.users[i];
        usersHTML += '<tr>' +
            '<td>' + user.id + '</td>' +
            '<td>' + user.name + '</td>' +
            '<td>' + user.username + '</td>' +
            '<td>' + user.email + '</td>' +
            '<td><span class="role-badge role-' + user.role + '">' + user.role + '</span></td>' +
            '<td>' +
                (user.id !== this.currentUser.id ? 
                    '<button type="button" class="btn btn-danger btn-sm" data-action="deleteUser" data-user-id="' + user.id + '">Delete</button>' :
                    '<span class="text-muted">Current User</span>'
                ) +
            '</td>' +
        '</tr>';
    }
    
    usersHTML += '</tbody></table></div></div>';
    return usersHTML;
};

SmartCartApp.prototype.showProductsTab = function() {
    document.getElementById('admin-tab-content').innerHTML = this.renderProductsTab();
    this.updateActiveAdminTab(1);
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.renderProductsTab = function() {
    var productsHTML = '<div class="admin-section">' +
        '<div class="section-header">' +
            '<h3>Product Management</h3>' +
            '<button type="button" class="btn btn-primary" data-action="addNewProduct">Add New Product</button>' +
        '</div>' +
        '<div class="products-grid-admin">';
    
    for (var i = 0; i < this.products.length; i++) {
        var product = this.products[i];
        productsHTML += '<div class="admin-product-card">' +
            '<div class="product-image-admin">' + product.image + '</div>' +
            '<div class="product-details-admin">' +
                '<h4>' + product.name + '</h4>' +
                '<p class="price">$' + product.price.toFixed(2) + '</p>' +
                '<p class="category">' + product.category + '</p>' +
                '<p class="stock">Stock: ' + (product.stock || 0) + '</p>' +
                '<p class="location">' + product.location + '</p>' +
            '</div>' +
            '<div class="product-actions">' +
                '<button type="button" class="btn btn-secondary btn-sm" data-action="editProduct" data-product-id="' + product.id + '">Edit</button>' +
                '<button type="button" class="btn btn-danger btn-sm" data-action="deleteProduct" data-product-id="' + product.id + '">Delete</button>' +
            '</div>' +
        '</div>';
    }
    
    productsHTML += '</div></div>';
    return productsHTML;
};

SmartCartApp.prototype.showOrdersTab = function() {
    document.getElementById('admin-tab-content').innerHTML = this.renderOrdersTab();
    this.updateActiveAdminTab(2);
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.renderOrdersTab = function() {
    var ordersHTML = '<div class="admin-section">' +
        '<div class="section-header">' +
            '<h3>Order Management</h3>' +
            '<p>Track and manage customer orders</p>' +
        '</div>' +
        '<div class="orders-table">' +
            '<table class="admin-table">' +
                '<thead>' +
                    '<tr>' +
                        '<th>Order ID</th>' +
                        '<th>Customer</th>' +
                        '<th>Items</th>' +
                        '<th>Total</th>' +
                        '<th>Status</th>' +
                        '<th>Date</th>' +
                        '<th>Actions</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>';
    
    for (var i = 0; i < this.orders.length; i++) {
        var order = this.orders[i];
        var itemsCount = order.items.length;
        var statusClass = order.status === 'completed' ? 'status-completed' : 'status-pending';
        
        ordersHTML += '<tr>' +
            '<td>#' + order.id + '</td>' +
            '<td>' + order.userName + '</td>' +
            '<td>' + itemsCount + ' items</td>' +
            '<td>$' + order.total.toFixed(2) + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + order.status + '</span></td>' +
            '<td>' + order.date.toLocaleDateString() + '</td>' +
            '<td>' +
                '<button type="button" class="btn btn-primary btn-sm" data-action="updateOrderStatus" data-order-id="' + order.id + '">' +
                    (order.status === 'pending' ? 'Complete' : 'Reopen') +
                '</button>' +
            '</td>' +
        '</tr>';
    }
    
    ordersHTML += '</tbody></table></div></div>';
    return ordersHTML;
};

SmartCartApp.prototype.showAnalyticsTab = function() {
    document.getElementById('admin-tab-content').innerHTML = this.renderAnalyticsTab();
    this.updateActiveAdminTab(3);
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.renderAnalyticsTab = function() {
    var totalRevenue = this.calculateTotalRevenue();
    var completedOrders = 0;
    var pendingOrders = 0;
    
    for (var i = 0; i < this.orders.length; i++) {
        if (this.orders[i].status === 'completed') {
            completedOrders++;
        } else {
            pendingOrders++;
        }
    }
    
    var categoryStats = this.getCategoryStats();
    
    var analyticsHTML = '<div class="admin-section">' +
        '<div class="section-header">' +
            '<h3>Analytics & Reports</h3>' +
            '<p>Business insights and performance metrics</p>' +
        '</div>' +
        '<div class="analytics-grid">' +
            '<div class="analytics-card">' +
                '<h4>Revenue Overview</h4>' +
                '<div class="revenue-chart">' +
                    '<div class="chart-bar">' +
                        '<div class="bar completed" style="height: ' + (completedOrders * 10) + 'px;"></div>' +
                        '<span>Completed: $' + totalRevenue.toFixed(2) + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="analytics-card">' +
                '<h4>Order Status</h4>' +
                '<div class="status-breakdown">' +
                    '<div class="status-item">' +
                        '<span class="status-dot completed"></span>' +
                        '<span>Completed: ' + completedOrders + '</span>' +
                    '</div>' +
                    '<div class="status-item">' +
                        '<span class="status-dot pending"></span>' +
                        '<span>Pending: ' + pendingOrders + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="analytics-card">' +
                '<h4>Popular Categories</h4>' +
                '<div class="category-stats">' +
                    categoryStats +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
    
    return analyticsHTML;
};

SmartCartApp.prototype.getCategoryStats = function() {
    var categories = {};
    
    for (var i = 0; i < this.products.length; i++) {
        var category = this.products[i].category;
        if (categories[category]) {
            categories[category]++;
        } else {
            categories[category] = 1;
        }
    }
    
    var statsHTML = '';
    for (var cat in categories) {
        statsHTML += '<div class="category-item">' +
            '<span>' + cat + '</span>' +
            '<span class="count">' + categories[cat] + '</span>' +
        '</div>';
    }
    
    return statsHTML;
};

SmartCartApp.prototype.updateActiveAdminTab = function(activeIndex) {
    var tabs = document.querySelectorAll('.admin-tab');
    for (var i = 0; i < tabs.length; i++) {
        if (i === activeIndex) {
            tabs[i].classList.add('active');
        } else {
            tabs[i].classList.remove('active');
        }
    }
};

SmartCartApp.prototype.deleteUser = function(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        var newUsers = [];
        for (var i = 0; i < this.users.length; i++) {
            if (this.users[i].id !== userId) {
                newUsers.push(this.users[i]);
            }
        }
        this.users = newUsers;
        this.showUsersTab();
        this.showSuccessMessage('User deleted successfully');
    }
};

SmartCartApp.prototype.deleteProduct = function(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        var newProducts = [];
        for (var i = 0; i < this.products.length; i++) {
            if (this.products[i].id !== productId) {
                newProducts.push(this.products[i]);
            }
        }
        this.products = newProducts;
        this.showProductsTab();
        this.showSuccessMessage('Product deleted successfully');
    }
};

SmartCartApp.prototype.updateOrderStatus = function(orderId) {
    for (var i = 0; i < this.orders.length; i++) {
        if (this.orders[i].id === orderId) {
            this.orders[i].status = this.orders[i].status === 'pending' ? 'completed' : 'pending';
            break;
        }
    }
    this.showOrdersTab();
    this.showSuccessMessage('Order status updated');
};

SmartCartApp.prototype.showAddProductForm = function() {
    var formHTML = '<div class="admin-section">' +
        '<div class="section-header">' +
            '<h3>Add New Product</h3>' +
            '<button type="button" class="btn btn-secondary" data-action="cancelEdit">Cancel</button>' +
        '</div>' +
        '<div class="product-form">' +
            '<form id="product-form">' +
                '<div class="form-row">' +
                    '<div class="form-group">' +
                        '<label>Product Name</label>' +
                        '<input type="text" name="name" required>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Price</label>' +
                        '<input type="number" name="price" step="0.01" required>' +
                    '</div>' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group">' +
                        '<label>Category</label>' +
                        '<select name="category" required>' +
                            '<option value="">Select Category</option>' +
                            '<option value="Fruits">Fruits</option>' +
                            '<option value="Vegetables">Vegetables</option>' +
                            '<option value="Dairy">Dairy</option>' +
                            '<option value="Bakery">Bakery</option>' +
                            '<option value="Meat">Meat</option>' +
                            '<option value="Beverages">Beverages</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Stock</label>' +
                        '<input type="number" name="stock" required>' +
                    '</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Location</label>' +
                    '<input type="text" name="location" placeholder="Aisle 1, Shelf A" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Emoji Icon</label>' +
                    '<input type="text" name="image" placeholder="🍎" required>' +
                '</div>' +
                '<button type="button" class="btn btn-primary" data-action="saveProduct">Save Product</button>' +
            '</form>' +
        '</div>' +
    '</div>';
    
    document.getElementById('admin-tab-content').innerHTML = formHTML;
    this.setupAdminEventListeners();
};

SmartCartApp.prototype.saveProduct = function() {
    var form = document.getElementById('product-form');
    var formData = new FormData(form);
    
    if (!form.checkValidity()) {
        alert('Please fill in all required fields');
        return;
    }
    
    var newProduct = {
        id: this.products.length + 1,
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        stock: parseInt(formData.get('stock')),
        location: formData.get('location'),
        image: formData.get('image'),
        mapX: 150 + Math.random() * 400,
        mapY: 150 + Math.random() * 200
    };
    
    this.products.push(newProduct);
    this.showProductsTab();
    this.showSuccessMessage('Product added successfully');
};

SmartCartApp.prototype.editProduct = function(productId) {
    alert('Edit functionality - Coming soon!');
};

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.smartCart = new SmartCartApp();
});
