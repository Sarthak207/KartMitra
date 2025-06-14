// Smart Cart Frontend - Enhanced with Admin Redirect

function SmartCartApp() {
    this.currentUser = null;
    this.isAdmin = false;
    this.products = [];
    this.cart = [];
    this.totalAmount = 0;
    this.isLoading = false;
    this.currentScreen = 'home';
    this.selectedCategory = 'all';
    this.API_BASE_URL = 'http://localhost:3000/api';
    this.aisleMapping = {
        'fruits': 1,
        'bakery': 2,
        'dairy': 3,
        'beverages': 4,
        'meat': 5
    };
    this.init();
}

SmartCartApp.prototype.init = function() {
    var self = this;
    setTimeout(function() {
        var loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        self.checkAuthStatus();
    }, 1500);
};

SmartCartApp.prototype.checkAuthStatus = function() {
    var user = localStorage.getItem('user');
    var token = localStorage.getItem('token');
    
    if (user && token) {
        this.currentUser = JSON.parse(user);
        this.isAdmin = this.currentUser.role === 'admin';
        
        // ADMIN REDIRECT LOGIC
        if (this.isAdmin) {
            window.location.href = 'admin_dashboard.html';
            return;
        }
        
        this.showMainDashboard();
    } else {
        this.showAuthScreen();
    }
};

SmartCartApp.prototype.showAuthScreen = function() {
    var authScreen = document.getElementById('auth-screen');
    var mainDashboard = document.getElementById('main-dashboard');
    
    if (authScreen) authScreen.style.display = 'flex';
    if (mainDashboard) mainDashboard.style.display = 'none';
    
    this.setupAuthTabs();
    this.setupAuthForms();
};

SmartCartApp.prototype.setupAuthTabs = function() {
    var self = this;
    var tabs = document.querySelectorAll('.auth-tab');
    
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function(e) {
            // Remove active class from all tabs
            tabs.forEach(function(t) { t.classList.remove('active'); });
            e.target.classList.add('active');
            
            // Show corresponding form
            var targetTab = e.target.dataset.tab;
            document.querySelectorAll('.auth-form').forEach(function(form) {
                form.classList.remove('active');
            });
            document.getElementById(targetTab + '-form').classList.add('active');
        });
    });
};

SmartCartApp.prototype.setupAuthForms = function() {
    var self = this;
    
    // Login form
    var loginForm = document.getElementById('login-form-element');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            self.handleLogin(e);
        });
    }
    
    // Register form
    var registerForm = document.getElementById('register-form-element');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            self.handleRegister(e);
        });
    }
};

SmartCartApp.prototype.handleLogin = function(event) {
    var self = this;
    var button = event.target.querySelector('button[type="submit"]');
    var originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = 'Logging in...';
    
    var formData = new FormData(event.target);
    var userData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    fetch(this.API_BASE_URL + '/auth/login', {
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
            
            if (self.isAdmin) {
                setTimeout(function() { 
                    window.location.href = 'admin_dashboard.html';
                }, 1000);
            } else {
                setTimeout(function() { 
                    self.showMainDashboard(); 
                }, 1500);
            }
        } else {
            self.showErrorMessage(data.error || 'Login failed');
        }
    })
    .catch(function(error) {
        console.error('Login error:', error);
        self.showErrorMessage('Login failed. Please check your connection.');
    })
    .finally(function() {
        button.disabled = false;
        button.textContent = originalText;
    });
};

SmartCartApp.prototype.handleRegister = function(event) {
    var self = this;
    var button = event.target.querySelector('button[type="submit"]');
    var originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = 'Registering...';
    
    var formData = new FormData(event.target);
    var userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        name: formData.get('name'),
        password: formData.get('password')
    };
    
    fetch(this.API_BASE_URL + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            self.showSuccessMessage('Registration successful! Please login.');
            // Switch to login tab
            document.querySelector('.auth-tab[data-tab="login"]').click();
        } else {
            self.showErrorMessage(data.error || 'Registration failed');
        }
    })
    .catch(function(error) {
        console.error('Registration error:', error);
        self.showErrorMessage('Registration failed. Please try again.');
    })
    .finally(function() {
        button.disabled = false;
        button.textContent = originalText;
    });
};

SmartCartApp.prototype.showMainDashboard = function() {
    var authScreen = document.getElementById('auth-screen');
    var mainDashboard = document.getElementById('main-dashboard');
    
    if (authScreen) authScreen.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'flex';
    
    // Update user display
    var usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && this.currentUser) {
        usernameDisplay.textContent = this.currentUser.name || this.currentUser.username;
    }
    
    // Load initial data
    this.loadProducts();
    this.loadCart();
    this.showHome();
};

// Navigation Functions
SmartCartApp.prototype.showHome = function() {
    this.switchScreen('home');
};

SmartCartApp.prototype.showProducts = function() {
    this.switchScreen('products');
    this.loadProducts();
};

SmartCartApp.prototype.showCart = function() {
    this.switchScreen('cart');
    this.loadCart();
};

SmartCartApp.prototype.showMap = function() {
    this.switchScreen('map');
    this.renderStoreMap();
};

SmartCartApp.prototype.showSettings = function() {
    this.switchScreen('settings');
    this.loadUserSettings();
};

SmartCartApp.prototype.switchScreen = function(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(function(screen) {
        screen.classList.remove('active');
    });
    
    // Show target screen
    var targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    this.currentScreen = screenName;
};

// Products Functions
SmartCartApp.prototype.loadProducts = function() {
    var self = this;
    var container = document.getElementById('products-container');
    if (container) {
        container.innerHTML = '<div class="loading-products">Loading products...</div>';
    }
    
    fetch(this.API_BASE_URL + '/products')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            self.products = data.products || data;
            self.renderProducts();
            self.setupCategoryFilters();
        })
        .catch(function(error) {
            console.error('Error loading products:', error);
            if (container) {
                container.innerHTML = '<div class="loading-products">Failed to load products. Please check if the server is running.</div>';
            }
        });
};

SmartCartApp.prototype.renderProducts = function() {
    var container = document.getElementById('products-container');
    if (!container) return;
    
    var filteredProducts = this.selectedCategory === 'all' 
        ? this.products 
        : this.products.filter(function(product) {
            return product.category && product.category.toLowerCase() === this.selectedCategory;
        }.bind(this));
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="loading-products">No products found in this category.</div>';
        return;
    }
    
    var productsHTML = filteredProducts.map(function(product) {
        var emoji = this.getProductEmoji(product.category);
        var aisle = this.aisleMapping[product.category?.toLowerCase()] || 1;
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">${emoji}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-category">${product.category || 'General'}</div>
                <div class="product-location">Aisle ${aisle} • Shelf ${product.location || 'A'}</div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" onclick="smartCart.addToCart(${product.id})" 
                            ${(product.stock || 0) <= 0 ? 'disabled' : ''}>
                        ${(product.stock || 0) <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button class="find-on-map-btn" onclick="smartCart.findOnMap(${product.id})">
                        Find on Map
                    </button>
                </div>
            </div>
        `;
    }.bind(this)).join('');
    
    container.innerHTML = productsHTML;
    this.updateCartSummary();
};

SmartCartApp.prototype.setupCategoryFilters = function() {
    var self = this;
    var filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            // Remove active class from all buttons
            filterButtons.forEach(function(btn) { btn.classList.remove('active'); });
            e.target.classList.add('active');
            
            // Update selected category and re-render
            self.selectedCategory = e.target.dataset.category;
            self.renderProducts();
        });
    });
};

SmartCartApp.prototype.getProductEmoji = function(category) {
    var emojis = {
        'fruits': '🍎',
        'bakery': '🍞',
        'dairy': '🥛',
        'beverages': '🥤',
        'meat': '🥩',
        'vegetables': '🥕',
        'snacks': '🍿',
        'frozen': '🧊'
    };
    return emojis[category?.toLowerCase()] || '📦';
};

// Cart Functions
SmartCartApp.prototype.loadCart = function() {
    var self = this;
    var userId = this.currentUser ? this.currentUser.id : null;
    if (!userId) return;

    fetch(this.API_BASE_URL + '/cart/' + userId)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            self.cart = data.items || data || [];
            self.updateCartTotal();
            self.updateCartCount();
            self.renderCart();
        })
        .catch(function(error) {
            console.error('Error loading cart:', error);
            self.cart = [];
            self.updateCartCount();
        });
};

SmartCartApp.prototype.renderCart = function() {
    var container = document.getElementById('cart-container');
    if (!container) return;
    
    if (this.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Add some products to get started!</p>
                <button class="shop-now-btn" onclick="smartCart.showProducts()">Shop Now</button>
            </div>
        `;
        return;
    }
    
    var self = this;
    var cartItemsHTML = this.cart.map(function(item) {
        var subtotal = parseFloat(item.subtotal || (item.price * item.quantity));
        var emoji = self.getProductEmoji(item.category);
        
        return `
            <div class="cart-item">
                <div class="product-image">${emoji}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${parseFloat(item.price).toFixed(2)} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="smartCart.updateCartQuantity(${item.cart_item_id}, ${item.quantity - 1})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="smartCart.updateCartQuantity(${item.cart_item_id}, ${item.quantity + 1})">+</button>
                </div>
                <div class="cart-item-total">₹${subtotal.toFixed(2)}</div>
                <button class="remove-btn" onclick="smartCart.removeFromCart(${item.cart_item_id})">Remove</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        ${cartItemsHTML}
        <div class="cart-total">
            <h3>Total: ₹${this.totalAmount.toFixed(2)}</h3>
            <button class="checkout-btn" onclick="smartCart.checkout()">Checkout</button>
        </div>
    `;
};

SmartCartApp.prototype.addToCart = function(productId) {
    var self = this;
    var userId = this.currentUser ? this.currentUser.id : null;
    if (!userId) {
        this.showErrorMessage('Please login to add items to cart');
        return;
    }

    fetch(this.API_BASE_URL + '/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            product_id: productId,
            quantity: 1
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            self.loadCart();
            self.showAddToCartFeedback('Product added to cart!');
        } else {
            self.showErrorMessage(data.error || 'Failed to add to cart');
        }
    })
    .catch(function(error) {
        console.error('Add to cart error:', error);
        self.showErrorMessage('Failed to add item to cart');
    });
};

SmartCartApp.prototype.updateCartQuantity = function(cartItemId, newQuantity) {
    if (newQuantity <= 0) {
        this.removeFromCart(cartItemId);
        return;
    }

    var self = this;
    fetch(this.API_BASE_URL + '/cart/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cart_item_id: cartItemId,
            quantity: newQuantity
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            self.loadCart();
        } else {
            self.showErrorMessage('Failed to update quantity');
        }
    })
    .catch(function(error) {
        console.error('Update quantity error:', error);
        self.showErrorMessage('Failed to update quantity');
    });
};

SmartCartApp.prototype.removeFromCart = function(cartItemId) {
    var self = this;
    fetch(this.API_BASE_URL + '/cart/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_item_id: cartItemId })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            self.loadCart();
            self.showAddToCartFeedback('Item removed from cart');
        } else {
            self.showErrorMessage('Failed to remove item');
        }
    })
    .catch(function(error) {
        console.error('Remove from cart error:', error);
        self.showErrorMessage('Failed to remove item');
    });
};

SmartCartApp.prototype.clearCart = function() {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    
    var self = this;
    var clearPromises = this.cart.map(function(item) {
        return fetch(self.API_BASE_URL + '/cart/remove', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_item_id: item.cart_item_id })
        });
    });
    
    Promise.all(clearPromises)
        .then(function() {
            self.cart = [];
            self.totalAmount = 0;
            self.updateCartCount();
            self.renderCart();
            self.showSuccessMessage('Cart cleared');
        })
        .catch(function(error) {
            self.showErrorMessage('Failed to clear cart');
        });
};

// Store Map Functions
SmartCartApp.prototype.renderStoreMap = function() {
    var self = this;
    
    // Clear existing products from aisles
    for (var i = 1; i <= 5; i++) {
        var aisleProducts = document.getElementById('aisle-' + i + '-products');
        if (aisleProducts) {
            aisleProducts.innerHTML = '';
        }
    }
    
    // Place products on map
    this.products.forEach(function(product) {
        var aisle = self.aisleMapping[product.category?.toLowerCase()] || 1;
        var aisleContainer = document.getElementById('aisle-' + aisle + '-products');
        
        if (aisleContainer) {
            var productDot = document.createElement('div');
            productDot.className = 'product-dot';
            productDot.innerHTML = `<div class="product-tooltip">${product.name}</div>`;
            productDot.onclick = function() {
                self.showProductModal(product);
            };
            aisleContainer.appendChild(productDot);
        }
    });
};

SmartCartApp.prototype.findOnMap = function(productId) {
    var product = this.products.find(function(p) { return p.id === productId; });
    if (!product) return;
    
    this.showMap();
    
    // Highlight the product on map
    setTimeout(function() {
        var aisle = this.aisleMapping[product.category?.toLowerCase()] || 1;
        var aisleElement = document.querySelector('[data-aisle="' + aisle + '"]');
        if (aisleElement) {
            aisleElement.style.border = '3px solid #ff4757';
            aisleElement.style.animation = 'pulse 1s infinite';
            
            setTimeout(function() {
                aisleElement.style.border = '2px solid #ddd';
                aisleElement.style.animation = 'none';
            }, 3000);
        }
    }.bind(this), 500);
};

// Settings Functions
SmartCartApp.prototype.loadUserSettings = function() {
    var usernameEl = document.getElementById('settings-username');
    var emailEl = document.getElementById('settings-email');
    var memberSinceEl = document.getElementById('settings-member-since');
    
    if (this.currentUser) {
        if (usernameEl) usernameEl.textContent = this.currentUser.username;
        if (emailEl) emailEl.textContent = this.currentUser.email;
        if (memberSinceEl) {
            var date = new Date(this.currentUser.createdAt);
            memberSinceEl.textContent = date.toLocaleDateString();
        }
    }
};

// Utility Functions
SmartCartApp.prototype.updateCartTotal = function() {
    this.totalAmount = this.cart.reduce(function(sum, item) {
        return sum + (parseFloat(item.subtotal || (item.price * item.quantity)));
    }, 0);
};

SmartCartApp.prototype.updateCartCount = function() {
    var totalItems = this.cart.reduce(function(sum, item) {
        return sum + parseInt(item.quantity);
    }, 0);
    
    var cartCountElements = document.querySelectorAll('#cart-count, #cart-items-count');
    cartCountElements.forEach(function(el) {
        if (el) el.textContent = totalItems;
    });
    
    var cartTotalElements = document.querySelectorAll('#cart-total, #cart-total-display');
    cartTotalElements.forEach(function(el) {
        if (el) el.textContent = this.totalAmount.toFixed(2);
    }.bind(this));
};

SmartCartApp.prototype.updateCartSummary = function() {
    this.updateCartCount();
};

SmartCartApp.prototype.checkout = function() {
    if (this.cart.length === 0) {
        this.showErrorMessage('Your cart is empty');
        return;
    }
    
    var self = this;
    this.showSuccessMessage('Order placed successfully! Total: ₹' + this.totalAmount.toFixed(2));
    
    // Clear cart after successful checkout
    setTimeout(function() {
        self.clearCart();
    }, 2000);
};

SmartCartApp.prototype.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        this.currentUser = null;
        this.cart = [];
        this.totalAmount = 0;
        window.location.href = 'index.html';
    }
};

// Message Functions
SmartCartApp.prototype.showSuccessMessage = function(message) {
    var element = document.getElementById('success-message');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 3000);
    }
};

SmartCartApp.prototype.showErrorMessage = function(message) {
    var element = document.getElementById('error-message');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 5000);
    }
};

SmartCartApp.prototype.showAddToCartFeedback = function(message) {
    var element = document.getElementById('add-to-cart-feedback');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(function() { element.style.display = 'none'; }, 2000);
    }
};

// Additional Functions for Settings
SmartCartApp.prototype.exportData = function() {
    var data = {
        user: this.currentUser,
        cart: this.cart,
        exportDate: new Date().toISOString()
    };
    
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'smart-cart-data.json';
    a.click();
    URL.revokeObjectURL(url);
    
    this.showSuccessMessage('Data exported successfully!');
};

SmartCartApp.prototype.deleteAccount = function() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        this.showErrorMessage('Account deletion feature coming soon');
    }
};

SmartCartApp.prototype.showProductModal = function(product) {
    var modal = document.getElementById('product-modal');
    if (modal) {
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-price').textContent = '₹' + parseFloat(product.price).toFixed(2);
        document.getElementById('modal-product-category').textContent = product.category || 'General';
        document.getElementById('modal-product-location').textContent = product.location || 'Store';
        document.getElementById('modal-product-stock').textContent = 'Stock: ' + (product.stock || 0);
        document.getElementById('modal-product-image').textContent = this.getProductEmoji(product.category);
        
        modal.style.display = 'block';
    }
};

SmartCartApp.prototype.closeProductModal = function() {
    var modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    window.smartCart = new SmartCartApp();
});
