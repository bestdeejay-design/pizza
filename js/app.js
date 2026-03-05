// Данные пицц
const pizzas = [
    {
        id: 1,
        title: 'Маргарита',
        description: 'Томатный соус, моцарелла, базилик',
        price: 450,
        image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500'
    },
    {
        id: 2,
        title: 'Пепперони',
        description: 'Томатный соус, моцарелла, пепперони',
        price: 550,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500'
    },
    {
        id: 3,
        title: 'Четыре сыра',
        description: 'Моцарелла, пармезан, горгонзола, рикотта',
        price: 600,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500'
    },
    {
        id: 4,
        title: 'Гавайская',
        description: 'Томатный соус, моцарелла, ветчина, ананасы',
        price: 520,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500'
    },
    {
        id: 5,
        title: 'Мясная',
        description: 'Томатный соус, моцарелла, бекон, ветчина, пепперони',
        price: 650,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476d?w=500'
    },
    {
        id: 6,
        title: 'Овощная',
        description: 'Томатный соус, моцарелла, болгарский перец, шампиньоны, лук',
        price: 480,
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500'
    }
];

// Рендеринг пицц
function renderPizzas() {
    const pizzaGrid = document.querySelector('.pizza-grid');
    
    pizzas.forEach(pizza => {
        const pizzaCard = document.createElement('div');
        pizzaCard.className = 'pizza-card';
        
        pizzaCard.innerHTML = `
            <img src="${pizza.image}" alt="${pizza.title}" class="pizza-img">
            <div class="pizza-info">
                <h3 class="pizza-title">${pizza.title}</h3>
                <p class="pizza-description">${pizza.description}</p>
                <div class="pizza-footer">
                    <span class="pizza-price">${pizza.price} ₽</span>
                    <button class="btn-add" onclick="addToCart(${pizza.id})">В корзину</button>
                </div>
            </div>
        `;
        
        pizzaGrid.appendChild(pizzaCard);
    });
}

// Добавление в корзину
function addToCart(pizzaId) {
    const pizza = pizzas.find(p => p.id === pizzaId);
    alert(`"${pizza.title}" добавлена в корзину!`);
    console.log('Добавлено в корзину:', pizza);
}

// Плавная прокрутка
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    renderPizzas();
    
    // Анимация кнопки заказа
    const orderBtn = document.querySelector('.btn-primary');
    orderBtn.addEventListener('click', () => {
        document.querySelector('#menu').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
});
