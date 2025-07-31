// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    
    // Show mobile nav toggle on mobile
    function checkMobile() {
        if (window.innerWidth <= 768) {
            mobileNavToggle.style.display = 'flex';
            // Hide header actions on mobile
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.style.display = 'none';
            }
            // Hide desktop navigation on mobile
            const desktopNav = document.querySelector('.desktop-nav');
            if (desktopNav) {
                desktopNav.style.display = 'none';
            }
        } else {
            mobileNavToggle.style.display = 'none';
            mobileNav.classList.remove('active');
            // Show header actions on desktop
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.style.display = 'flex';
            }
            // Show desktop navigation on desktop
            const desktopNav = document.querySelector('.desktop-nav');
            if (desktopNav) {
                desktopNav.style.display = 'flex';
            }
        }
    }
    
    // Check on load and resize
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Simplified mobile navigation handling
    function setupMobileNavigation() {
        if (window.innerWidth <= 768) {
            // Only hide desktop navigation elements
            const desktopNav = document.querySelector('.desktop-nav');
            if (desktopNav) {
                desktopNav.style.display = 'none';
            }
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.style.display = 'none';
            }
        }
    }
    
    // Run on page load
    setupMobileNavigation();
    
    // Initialize mobile nav properly
    function initializeMobileNav() {
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) {
            mobileNav.classList.remove('active');
        }
    }
    
    // Run mobile nav initialization on page load
    initializeMobileNav();
    
    // Close mobile nav when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileNav.classList.contains('active') && 
            !mobileNav.contains(e.target) && 
            !mobileNavToggle.contains(e.target)) {
            mobileNav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });
    
    // Toggle mobile nav
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', () => {
            mobileNav.classList.add('active');
            mobileNav.style.display = 'flex';
            mobileNavToggle.setAttribute('aria-expanded', 'true');
            // Prevent body scroll when menu is open
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Close mobile nav when clicking close button
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    }

    // Close mobile nav when clicking on a link
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileNavToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });
    
    // Collections dropdown functionality
    const collectionsContainer = document.querySelector('.collections-menu-container');
    const collectionsDropdown = document.querySelector('.collections-dropdown');
    const collectionsMenuButton = document.getElementById('collectionsMenuButton');
    
    if (collectionsContainer && collectionsDropdown && collectionsMenuButton) {
        // Show dropdown on hover
        collectionsContainer.addEventListener('mouseenter', () => {
            collectionsDropdown.classList.add('active');
            collectionsMenuButton.setAttribute('aria-expanded', 'true');
        });
        
        // Hide dropdown when mouse leaves the entire container (only if not clicked)
        collectionsContainer.addEventListener('mouseleave', () => {
            if (!collectionsContainer.classList.contains('clicked')) {
                collectionsDropdown.classList.remove('active');
                collectionsMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Prevent dropdown from closing when hovering over the dropdown itself
        collectionsDropdown.addEventListener('mouseenter', () => {
            collectionsDropdown.classList.add('active');
            collectionsMenuButton.setAttribute('aria-expanded', 'true');
        });
        
        // Toggle dropdown on click
        const collectionsLink = collectionsContainer.querySelector('.nav-link');
        if (collectionsLink) {
            collectionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Toggle clicked state
                collectionsContainer.classList.toggle('clicked');
                // Toggle dropdown visibility
                if (collectionsContainer.classList.contains('clicked')) {
                    collectionsDropdown.classList.add('active');
                    collectionsMenuButton.setAttribute('aria-expanded', 'true');
                } else {
                    collectionsDropdown.classList.remove('active');
                    collectionsMenuButton.setAttribute('aria-expanded', 'false');
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!collectionsContainer.contains(e.target)) {
                collectionsDropdown.classList.remove('active');
                collectionsContainer.classList.remove('clicked');
                collectionsMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Coming Soon shake effect and sound
    const comingSoonBoxes = document.querySelectorAll('.collection-box');
    comingSoonBoxes.forEach(box => {
        const title = box.querySelector('.collection-title');
        if (title && title.textContent.includes('COMING SOON')) {
            box.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Add shake animation
                box.classList.add('shake');
                
                // Play error sound (using Web Audio API)
                playErrorSound();
                
                // Remove shake class after animation completes
                setTimeout(() => {
                    box.classList.remove('shake');
                }, 500);
            });
        }
    });

    // Function to play error sound
    function playErrorSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio not supported or blocked');
        }
    }

// ...existing code...
});


// Cart functionality
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('cart')) || [];
    this.isOpen = false; // Track cart open state
    this.init();  
    
    // Ensure cart starts closed
    const cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) {
      cartDropdown.classList.remove('active');
      cartDropdown.style.display = 'none';
    }
  }

  init() {
    this.updateCartCount();
    this.setupEventListeners();
    this.renderCart();
  }

  setupEventListeners() {
    const cartIcon = document.getElementById('cartIcon');
    const mobileCartIcon = document.getElementById('mobileCartIcon');
    const cartDropdown = document.getElementById('cartDropdown');
    const closeCart = document.getElementById('closeCart');
    const checkoutBtn = document.getElementById('checkoutBtn');
    // Remove customerInfoForm logic

    if (cartIcon) {
      cartIcon.addEventListener('click', () => {
        this.toggleCart();
      });
    }

    if (mobileCartIcon) {
      console.log('Mobile cart icon found, adding click listener');
      mobileCartIcon.addEventListener('click', (e) => {
        console.log('Mobile cart clicked!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleCart();
      });
      
      // Add touch event for better mobile support
      mobileCartIcon.addEventListener('touchstart', (e) => {
        console.log('Mobile cart touched!');
        e.preventDefault();
        this.toggleCart();
      });
    }

    if (closeCart) {
      closeCart.addEventListener('click', () => {
        this.closeCart();
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/checkout';
      });
    }

    // Close cart when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.cart-container') && !e.target.closest('.mobile-cart-container')) {
        this.closeCart();
      }
    });
  }

  toggleCart() {
    this.isOpen = !this.isOpen;
    const cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) {
      if (this.isOpen) {
        cartDropdown.classList.add('active');
      } else {
        cartDropdown.classList.remove('active');
      }
    }
  }

  openCart() {
    this.isOpen = true;
    const cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) {
      cartDropdown.classList.add('active');
    }
  }

  closeCart() {
    this.isOpen = false;
    const cartDropdown = document.getElementById('cartDropdown');
    if (cartDropdown) {
      cartDropdown.classList.remove('active');
    }
  }

  addItem(product) {
    // Enforce strict stock limit
    const stockQuantity = parseInt(document.querySelector(`[data-variant-id="${product.variantId}"]`).dataset.stockQuantity || 0);
    const existingItem = this.items.find(item => 
      item.variantId === product.variantId && item.size === product.size
    );
    const currentCartQty = existingItem ? existingItem.quantity : 0;
    const totalRequested = currentCartQty + product.quantity;
    if (totalRequested > stockQuantity) {
      this.showErrorMessage('Cannot add more than available stock.');
      return;
    }
    if (existingItem) {
      existingItem.quantity += product.quantity;
    } else {
      this.items.push(product);
    }
    this.saveCart();
    this.updateCartCount();
    this.renderCart();
    this.showAddToCartMessage();
    // Refresh stock validation on product detail pages
    if (typeof initializeStockValidation === 'function') {
      initializeStockValidation();
    }
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.saveCart();
    this.updateCartCount();
    this.renderCart();
    
    // Refresh stock validation on product detail pages
    if (typeof initializeStockValidation === 'function') {
      initializeStockValidation();
    }
  }

  updateQuantity(index, newQuantity) {
    const item = this.items[index];
    const stockQuantity = parseInt(document.querySelector(`[data-variant-id="${item.variantId}"]`).dataset.stockQuantity || 0);
    if (newQuantity > stockQuantity) {
      this.showErrorMessage('Cannot add more than available stock.');
      return;
    }
    if (newQuantity > 0) {
      this.items[index].quantity = newQuantity;
    } else {
      this.removeItem(index);
      return;
    }
    this.saveCart();
    this.updateCartCount();
    this.renderCart();
    // Refresh stock validation on product detail pages
    if (typeof initializeStockValidation === 'function') {
      initializeStockValidation();
    }
  }
  showErrorMessage(msg) {
    // Pop-up removed as requested. Optionally, use alert for debugging only:
    // alert(msg);
  }

  getTotal() {
    return this.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    const mobileCartCount = document.getElementById('mobileCartCount');
    
    const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cartCount) {
      cartCount.textContent = totalItems;
      cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    if (mobileCartCount) {
      mobileCartCount.textContent = totalItems;
      mobileCartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
  }

  renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (!cartItems) return;

    if (this.items.length === 0) {
      cartItems.innerHTML = '<div class="cart-empty"><p>Your cart is empty</p></div>';
      if (cartTotal) cartTotal.textContent = 'RM 0.00';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    cartItems.innerHTML = this.items.map((item, index) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-size">Size: ${item.size}</div>
          <div class="cart-item-price">RM ${item.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-quantity">
          <button class="quantity-btn" onclick="cart.updateQuantity(${index}, ${item.quantity - 1})">-</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn" onclick="cart.updateQuantity(${index}, ${item.quantity + 1})">+</button>
        </div>
        <button class="remove-item" onclick="cart.removeItem(${index})">&times;</button>
      </div>
    `).join('');

    if (cartTotal) cartTotal.textContent = `RM ${this.getTotal().toFixed(2)}`;
    if (checkoutBtn) checkoutBtn.disabled = false;

    // Hide customer info form and show cart footer on render
    const customerInfoForm = document.getElementById('customerInfoForm');
    const cartFooter = document.querySelector('.cart-footer');
    if (customerInfoForm) customerInfoForm.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'block';
  }

  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  showAddToCartMessage() {
    // Pop-up removed as requested. Optionally, use alert for debugging only:
    // alert('Added to cart!');
  }

  checkout() {
    if (this.items.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    
    // For now, just show an alert with the total
    const total = this.getTotal().toFixed(2);
    alert(`Checkout functionality coming soon! Total: RM ${total}`);
    
    // In a real implementation, this would redirect to a checkout page
    // or open a payment modal
  }

  clear() {
    this.items = [];
    this.saveCart();
    this.updateCartCount();
    this.renderCart();
  }
}

// Initialize cart
let cart;
document.addEventListener('DOMContentLoaded', () => {
  // Initialize cart if cart elements exist (desktop or mobile)
  const cartIcon = document.getElementById('cartIcon');
  const mobileCartIcon = document.getElementById('mobileCartIcon');
  const cartDropdown = document.getElementById('cartDropdown');
  
  // Debug logging
  console.log('Cart elements found:', {
    cartIcon: !!cartIcon,
    mobileCartIcon: !!mobileCartIcon,
    cartDropdown: !!cartDropdown
  });
  
  // Visual debug indicator for mobile cart
  if (mobileCartIcon) {
    mobileCartIcon.style.border = '2px solid red';
    console.log('Mobile cart icon styled for debugging');
  }
  
  if ((cartIcon || mobileCartIcon) && cartDropdown) {
    cart = new Cart();
    
    // Ensure cart starts closed
    cartDropdown.classList.remove('active');
    cartDropdown.style.display = 'none';
    
    // Force update cart count on initialization
    setTimeout(() => {
      cart.updateCartCount();
    }, 100);
  }
});

// Add to cart function for product pages
function addToCart(productData) {
  if (!cart) {
    cart = new Cart();
  }
  const selectedSize = document.querySelector('.size-btn.active');
  if (!selectedSize) {
    alert('Please select a size');
    return;
  }
  const quantityInput = document.getElementById('quantity-number');
  const quantity = parseInt(quantityInput.textContent);
  const stockQuantity = parseInt(selectedSize.dataset.stockQuantity || 0);
  // Check cart for this variant
  const cartItem = cart.items.find(item => item.variantId === selectedSize.dataset.variantId);
  const cartQty = cartItem ? cartItem.quantity : 0;
  if (quantity + cartQty > stockQuantity) {
    cart.showErrorMessage('Cannot add more than available stock.');
    return;
  }
  const product = {
    id: productData.id,
    name: productData.name,
    price: productData.price,
    image: productData.image,
    size: selectedSize.dataset.size,
    variantId: selectedSize.dataset.variantId,
    quantity: quantity
  };
  cart.addItem(product);
  // After adding, set quantity to cartQty+1 (if stock allows), else to max available
  let newQty = cartQty + 1;
  if (newQty > stockQuantity) newQty = stockQuantity;
  if (quantityInput) {
    quantityInput.textContent = newQty;
    updateQuantityButtonsState(newQty, stockQuantity - cartQty);
  }
}

// Buy Now function for product pages
function buyNow(productData) {
  const selectedSize = document.querySelector('.size-btn.active');
  if (!selectedSize) {
    alert('Please select a size');
    return;
  }
  const quantity = parseInt(document.getElementById('quantity-number').textContent);
  const stockQuantity = parseInt(selectedSize.dataset.stockQuantity || 0);
  if (quantity > stockQuantity) {
    cart && cart.showErrorMessage ? cart.showErrorMessage('Cannot add more than available stock.') : alert('Cannot add more than available stock.');
    return;
  }
  const product = {
    id: productData.id,
    name: productData.name,
    price: productData.price,
    image: productData.image,
    size: selectedSize.dataset.size,
    variantId: selectedSize.dataset.variantId,
    quantity: quantity
  };
  // Overwrite cart with just this product
  localStorage.setItem('cart', JSON.stringify([product]));
  window.location.href = '/checkout';
}

// Stock validation for product detail pages
function initializeStockValidation() {
  const sizeBtns = document.querySelectorAll('.size-btn');
  const quantityInput = document.getElementById('quantity-number');
  const quantityMinus = document.getElementById('quantity-minus');
  const quantityPlus = document.getElementById('quantity-plus');
  
  if (sizeBtns.length > 0 && quantityInput) {
    let currentVariantId = null;
    let maxStock = 0;
    
    // Get cart instance
    const cart = window.cart || new Cart();
    
    // Function to get available stock considering cart
    function getAvailableStock(variantId) {
      const cartItem = cart.items.find(item => item.variantId === variantId);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const stockQuantity = parseInt(document.querySelector(`[data-variant-id="${variantId}"]`).dataset.stockQuantity || 0);
      return Math.max(0, stockQuantity - cartQuantity);
    }
    
    // Get stock data for all variants
    const variants = [];
    sizeBtns.forEach(btn => {
      const variantId = btn.dataset.variantId;
      const availableStock = getAvailableStock(variantId);
      variants.push({ variantId, availableStock });
    });
    
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const variantId = this.dataset.variantId;
        const availableStock = getAvailableStock(variantId);
        
        currentVariantId = variantId;
        maxStock = availableStock;
        
        // Always reset quantity to 1 when size changes
        quantityInput.textContent = '1';
        
        // Update quantity buttons state immediately
        updateQuantityButtonsState(1, availableStock);
        
        // Show stock info with cart consideration
        showStockInfoWithCart(availableStock, variantId);
      });
    });
    
    // Quantity button handlers
    if (quantityMinus && quantityPlus) {
      quantityMinus.addEventListener('click', () => {
        const currentQty = parseInt(quantityInput.textContent);
        if (currentQty > 1) {
          const newQty = currentQty - 1;
          quantityInput.textContent = newQty;
          updateQuantityButtonsState(newQty, maxStock);
        }
      });
      
      quantityPlus.addEventListener('click', () => {
        const currentQty = parseInt(quantityInput.textContent);
        if (currentQty < maxStock) {
          const newQty = currentQty + 1;
          quantityInput.textContent = newQty;
          updateQuantityButtonsState(newQty, maxStock);
        }
      });
    }
    
    // Initialize with first size selected (if any)
    const firstSizeBtn = sizeBtns[0];
    if (firstSizeBtn) {
      const variantId = firstSizeBtn.dataset.variantId;
      const availableStock = getAvailableStock(variantId);
      maxStock = availableStock;
      updateQuantityButtonsState(1, availableStock);
      showStockInfoWithCart(availableStock, variantId);
    }
  }
}

function updateQuantityButtonsState(currentQty, maxStock) {
  const quantityMinus = document.getElementById('quantity-minus');
  const quantityPlus = document.getElementById('quantity-plus');
  const addToCartBtn = document.getElementById('orderBtn');
  if (quantityMinus) {
    quantityMinus.disabled = currentQty <= 1 || maxStock === 0;
    quantityMinus.style.opacity = (currentQty <= 1 || maxStock === 0) ? '0.5' : '1';
  }
  if (quantityPlus) {
    quantityPlus.disabled = currentQty >= maxStock || maxStock === 0;
    quantityPlus.style.opacity = (currentQty >= maxStock || maxStock === 0) ? '0.5' : '1';
  }
  if (addToCartBtn) {
    addToCartBtn.disabled = maxStock === 0;
    addToCartBtn.style.opacity = maxStock === 0 ? '0.5' : '1';
    addToCartBtn.style.cursor = maxStock === 0 ? 'not-allowed' : '';
  }
}

function showStockInfo(stockQuantity) {
  // Remove existing stock info
  const existingInfo = document.querySelector('.stock-info');
  if (existingInfo) {
    existingInfo.remove();
  }
  
  // Create stock info element
  const stockInfo = document.createElement('div');
  stockInfo.className = 'stock-info';
  stockInfo.style.cssText = `
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
  `;
  
  if (stockQuantity > 10) {
    stockInfo.style.background = '#1a3a1a';
    stockInfo.style.color = '#4ade80';
    stockInfo.textContent = `In Stock (${stockQuantity} available)`;
  } else if (stockQuantity > 0) {
    stockInfo.style.background = '#3a2a1a';
    stockInfo.style.color = '#fbbf24';
    stockInfo.textContent = `Low Stock (${stockQuantity} available)`;
  } else {
    stockInfo.style.background = '#3a1a1a';
    stockInfo.style.color = '#f87171';
    stockInfo.textContent = 'Out of Stock';
  }
  
  // Insert after quantity box
  const quantityBox = document.querySelector('.quantity-box');
  if (quantityBox) {
    quantityBox.parentNode.insertBefore(stockInfo, quantityBox.nextSibling);
  }
}

function showStockInfoWithCart(availableStock, variantId) {
  // Remove existing stock info
  const existingInfo = document.querySelector('.stock-info');
  if (existingInfo) {
    existingInfo.remove();
  }
  // Get cart instance
  const cart = window.cart || new Cart();
  const cartItem = cart.items.find(item => item.variantId === variantId);
  const cartQuantity = cartItem ? cartItem.quantity : 0;
  const totalStock = parseInt(document.querySelector(`[data-variant-id="${variantId}"]`).dataset.stockQuantity || 0);
  // Create stock info element
  const stockInfo = document.createElement('div');
  stockInfo.className = 'stock-info';
  stockInfo.style.cssText = `
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
  `;
  if (availableStock > 0 && availableStock < 3) {
    stockInfo.style.background = '#3a2a1a';
    stockInfo.style.color = '#fbbf24';
    stockInfo.textContent = `Low Stock`;
  } else if (availableStock === 0) {
    stockInfo.style.background = '#3a1a1a';
    stockInfo.style.color = '#f87171';
    stockInfo.textContent = `Out of Stock (0 available)`;
  } else {
    // No message for in stock
    stockInfo.textContent = '';
    stockInfo.style.background = 'transparent';
    stockInfo.style.padding = '0';
  }
  // Add cart info if items are in cart
  if (cartQuantity > 0) {
    const cartInfo = document.createElement('div');
    cartInfo.style.cssText = `
      margin-top: 5px;
      font-size: 0.8rem;
      color: #888;
    `;
    cartInfo.textContent = `(${cartQuantity} already in cart)`;
    stockInfo.appendChild(cartInfo);
  }
  // Insert after quantity box
  const quantityBox = document.querySelector('.quantity-box');
  if (quantityBox) {
    quantityBox.parentNode.insertBefore(stockInfo, quantityBox.nextSibling);
  }
  // Also update button states for out of stock
  updateQuantityButtonsState(1, availableStock);
}