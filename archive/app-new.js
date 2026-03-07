// Реальные данные с pizzanapolirsc.ru
const menuData = [
    {
        id: 1,
        title: 'Маргарита',
        description: 'Томатный соус, моцарелла, базилик — классика неаполитанской пиццы',
        price: 450,
        image: 'https://static.tildacdn.com/tild3738-3363-4566-a137-303836336662/_1.jpg',
        category: 'pizza'
    },
    {
        id: 2,
        title: 'Пепперони',
        description: 'Томатный соус, моцарелла, пикантная колбаса пепперони',
        price: 550,
        image: 'https://static.tildacdn.com/tild3063-3137-4464-b134-623164326237/_.jpg',
        category: 'pizza'
    },
    {
        id: 3,
        title: 'Четыре сыра',
        description: 'Моцарелла, пармезан, горгонзола, рикотта — насыщенный сливочный вкус',
        price: 600,
        image: 'https://static.tildacdn.com/tild3739-3130-4837-a566-653734303832/__.jpg',
        category: 'pizza'
    },
    {
        id: 4,
        title: 'Диабло',
        description: 'Томатный соус, моцарелла, халапеньо, острая чоризо — для любителей острого',
        price: 590,
        image: 'https://static.tildacdn.com/tild3462-3164-4566-b862-316438396430/_.jpg',
        category: 'pizza'
    },
    {
        id: 5,
        title: 'BBQ Чикен',
        description: 'Куриная грудка, соус BBQ, красный лук, моцарелла',
        price: 570,
        image: 'https://static.tildacdn.com/tild3437-3836-4264-a238-643734393364/_Chicken_BBQ.jpg',
        category: 'pizza'
    },
    {
        id: 6,
        title: 'Морепродукты',
        description: 'Креветки, мидии, кальмары, томатный соус, моцарелла',
        price: 690,
        image: 'https://static.tildacdn.com/tild3739-3334-4165-a463-633662326532/_seafood_mix.png',
        category: 'pizza'
    },
    {
        id: 7,
        title: 'Кальцоне с ветчиной и грибами',
        description: 'Закрытая пицца с ветчиной, шампиньонами, моцареллой и томатным соусом',
        price: 520,
        image: 'https://static.tildacdn.com/tild3466-3536-4838-a238-326238313131/_1.jpg',
        category: 'calzone'
    },
    {
        id: 8,
        title: 'Кальцоне с рикоттой',
        description: 'Рикотта, моцарелла, шпинат, кедровые орешки',
        price: 540,
        image: 'https://static.tildacdn.com/tild6162-3361-4262-a661-376664633965/_1.jpg',
        category: 'calzone'
    },
    {
        id: 9,
        title: 'Фокачча классическая',
        description: 'Итальянский хлеб с оливковым маслом, розмарином и морской солью',
        price: 250,
        image: 'https://static.tildacdn.com/tild3139-6136-4561-b138-623336656165/8B744C66-0140-444F-8.JPG',
        category: 'sides'
    },
    {
        id: 10,
        title: 'Фокачча с томатами',
        description: 'Фокачча с вялеными томатами, оливками и прованскими травами',
        price: 280,
        image: 'https://static.tildacdn.com/tild6132-3534-4434-a439-376137323161/04Y7o57-s9g.jpg',
        category: 'sides'
    },
    {
        id: 11,
        title: 'Соус Маринара',
        description: 'Фирменный томатный соус с чесноком и орегано',
        price: 90,
        image: 'https://static.tildacdn.com/tild3833-3439-4331-b733-653363643933/___.jpg',
        category: 'sides'
    },
    {
        id: 12,
        title: 'Соус Альфредо',
        description: 'Сливочный соус с пармезаном и чесноком',
        price: 100,
        image: 'https://static.tildacdn.com/tild6335-6433-4762-b238-336566306233/photo.jpeg',
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
