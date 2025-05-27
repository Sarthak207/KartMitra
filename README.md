# 🛒 KartMitra: Smart Cart System

KartMitra is a Raspberry Pi-powered Smart Cart solution for supermarkets and retail stores. It combines hardware (Raspberry Pi, touch display, sensors) and software (Node.js, MariaDB, REST API, modern frontend) to deliver a seamless, automated, and interactive shopping experience.

---

## 🚀 Features

- **User Authentication:** Secure registration and login with JWT.
- **Touchscreen Interface:** User-friendly shopping cart UI for Raspberry Pi display.
- **Product Catalog:** Browse, search, and filter products by category.
- **Cart Management:** Add, remove, and update items in the cart with real-time total calculation.
- **Checkout & Payment:** Simulated checkout with multiple payment options (PayPal, Credit Card, Cash on Delivery).
- **Interactive Store Map:** Visual map with product locations and navigation guidance.
- **Admin Dashboard:** Manage users, products, orders, and view analytics (admin only).
- **Hardware Integration:** Ready for RFID/barcode scanners and weight sensors (expandable).
- **RESTful API Backend:** Node.js + Express + MariaDB for scalable data management.
- **Responsive Design:** Works on Raspberry Pi touchscreen and desktop browsers.
- **GitHub Integration:** Easily deploy and collaborate on the project.

---

## 🖥️ Screenshots

![Dashboard](docs/screens/dashboard.png)
![Product Catalog](docs/screens/products.png)
![Cart](docs/screens/cart.png)
![Admin Panel](docs/screens/admin.png)

---

## 🛠️ Hardware Requirements

- Raspberry Pi 4 (or 3/400)
- 7-inch HDMI touchscreen display
- (Optional) RFID/barcode scanner, weight sensor (HX711 + load cell)
- MicroSD card (16GB+), power supply

---

## ⚙️ Software Stack

- **Frontend:** HTML, CSS, JavaScript (ES5/ES6), touch-optimized UI
- **Backend:** Node.js, Express.js, MariaDB (or MySQL), REST API
- **Authentication:** JWT, bcryptjs
- **Admin:** Advanced dashboard for store management
- **Hardware Integration:** Python scripts for sensor input (future expansion)

---

## 📦 Project Structure

smartCart/
│
├── smart_cart_backend/
│ ├── server.js
│ ├── db.js
│ ├── routes/
│ │ ├── auth.js
│ │ ├── products.js
│ │ ├── cart.js
│ │ └── orders.js
│ ├── .env
│ └── package.json
│
├── smart_cart_interface/
│ ├── index.html
│ ├── css/
│ │ └── style.css
│ └── js/
│ └── app.js
│
└── README.md


text

---

## 📝 Setup Instructions

### 1. **Clone the repository**

git clone git@github.com:Sarthak207/KartMitra.git
cd KartMitra


text

### 2. **Backend Setup**

cd smart_cart_backend

Install dependencies
npm install

Configure environment
cp .env.example .env

Edit .env with your MariaDB credentials
Start backend server
npm run dev


text

### 3. **Database Setup (MariaDB)**

-- In MariaDB shell:
CREATE DATABASE smart_cart;
CREATE USER 'Sarthak'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON smart_cart.* TO 'Sarthak'@'localhost';
FLUSH PRIVILEGES;


text
*(See backend SQL scripts for table creation.)*

### 4. **Frontend Setup**

Simply open `smart_cart_interface/index.html` in your browser or configure your Raspberry Pi to auto-launch it on boot.

---

## 🛡️ Security Notes

- Do **not** commit `.env` or credentials to public repositories.
- Use strong passwords and change the JWT secret for production.
- For HTTPS, use a Personal Access Token (PAT) for GitHub pushes.

---

## 🤖 Hardware Integration (Expandability)

- **RFID/barcode scanning:** Integrate with Python scripts and connect to backend API.
- **Weight sensors:** Use HX711 and Python to detect item weight changes.
- **Real-time updates:** Use WebSockets for live cart synchronization.

---

## 👩‍💻 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/awesome`)
3. Commit your changes (`git commit -am 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome`)
5. Create a new Pull Request

---

## 📄 License

MIT License

---

## 📫 Contact

For questions, suggestions, or collaboration:
- GitHub: [Sarthak207](https://github.com/Sarthak207)
- Email: your-email@example.com

---

**Happy Shopping! 🛒**
