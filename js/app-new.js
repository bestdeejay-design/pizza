// Данные меню с сайта pizzanapolirsc.ru
const menuData = [
    {
        id: 1,
        title: 'Маргарита',
        description: 'Томатный соус сан-марцано, моцарелла фиор ди латте, базилик, оливковое масло',
        price: 590,
        image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600',
        category: 'pizza'
    },
    {
        id: 2,
        title: 'Пепперони',
        description: 'Томатный соус, моцарелла, пепперони, острый перец',
        price: 690,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600',
        category: 'pizza'
    },
    {
        id: 3,
        title: 'Четыре сыра',
        description: 'Моцарелла, пармезан, горгонзола, рикотта, мед',
        price: 750,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        category: 'pizza'
    },
    {
        id: 4,
        title: 'Диабло',
        description: 'Томатный соус, моцарелла, халапеньо, чоризо, лук красный',
        price: 720,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
        category: 'pizza'
    },
    {
        id: 5,
        title: 'Кальцоне классический',
        description: 'Томатный соус, моцарелла, ветчина, грибы, запечённый в конверте',
        price: 650,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?w=600',
        category: 'calzone'
    },
    {
        id: 6,
        title: 'Цезарь',
        description: 'Салат романо, куриная грудка, пармезан, томаты, соус цезарь',
        price: 450,
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
        category: 'sides'
    }
];

let cart = [];

// Рендеринг меню
function renderMenu(filter = 'all') {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = '';
    
    const filteredItems = filter === 'all' 
        ? menuData 
        : menuData.filter(item => item.category === filter);
    
    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="menu-item-image">
            <div class="menu-item-info">
                <h3 class="menu-item-title">${item.title}</h3>
                <p class="menu-item-description">${item.description}</p>
                <div class="menu-item-footer">
                    <span class="menu-item-price">${item.price} ₽</span>
                    <button class="btn-add-cart" onclick="addToCart(${item.id})">В корзину</button>
                </div>
            </div>
        `;
        menuGrid.appendChild(card);
    });
}

// Фильтрация меню
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMenu(btn.dataset.filter);
    });
});

// Добавление в корзину
function addToCart(id) {
    const item = menuData.find(p => p.id === id);
    if (item) {
        cart.push(item);
        updateCart();
        
        // Анимация кнопки корзины
        const cartBtn = document.querySelector('.cart-btn');
        cartBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartBtn.style.transform = 'scale(1)';
        }, 200);
        
        // Уведомление
        showNotification(`"${item.title}" добавлена в корзину`);
    }
}

// Обновление корзины
function updateCart() {
    const countEl = document.querySelector('.cart-count');
    if (countEl) {
        countEl.textContent = cart.length;
    }
}

// Показ уведомления
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2ed573;
        color: white;
        padding: 1rem 2rem;
        border-radius: 1rem;
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Изменение навбара при скролле
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
    } else {
        navbar.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    
    // Анимации при скролле
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(section);
    });
});

// Добавляем CSS для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('🍕 Pizza Napoli — сайт загружен!');
console.log('📦 Меню:', menuData.length, 'позиций');
