// 🔍 YANDEX EDA SELECTOR FINDER
// Найти все продукты на странице и показать какие селекторы работают
// 
// ЗАПУСК: F12 → Console → Вставить → Enter

(function() {
    console.log('🔍 YANDEX EDA SELECTOR DIAGNOSTICS');
    console.log('==================================\n');
    
    // Все возможные селекторы
    const allSelectors = [
        // ID based
        '[id*="product"]',
        '[id*="card"]',
        '[id*="item"]',
        
        // Class based
        '[class*="product"]',
        '[class*="Product"]',
        '[class*="card"]',
        '[class*="Card"]',
        '[class*="item"]',
        '[class*="Item"]',
        '[class*="menu-item"]',
        '[class*="catalog-item"]',
        
        // Data attributes
        '[data-testid]',
        '[data-id]',
        '[data-product]',
        
        // Generic
        'article',
        'section[class*="card"]',
        'div[class*="card"]'
    ];
    
    const results = [];
    
    for (const selector of allSelectors) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                results.push({
                    selector: selector,
                    count: elements.length,
                    sample: elements[0].outerHTML.substring(0, 200)
                });
                console.log(`✅ FOUND: ${selector}`);
                console.log(`   Count: ${elements.length}`);
                
                // Показать первый элемент
                const firstEl = elements[0];
                console.log(`   Sample:`, firstEl);
                
                // Проверить есть ли текст
                const text = firstEl.innerText?.substring(0, 100);
                if (text && text.length > 10) {
                    console.log(`   Text: "${text}..."`);
                }
                
                console.log('');
            }
        } catch (error) {
            // Ignore invalid selectors
        }
    }
    
    // Также проверить общие контейнеры
    console.log('\n📦 CHECKING GENERIC CONTAINERS:');
    const containers = document.querySelectorAll('main, .container, #root, .app');
    containers.forEach(container => {
        const products = container.querySelectorAll('[class*="card"], [class*="item"], article, section');
        if (products.length > 0) {
            console.log(`✅ Container ${container.tagName || container.className}: ${products.length} items`);
        }
    });
    
    // Сохранить результат
    if (results.length === 0) {
        console.warn('\n❌ NO PRODUCTS FOUND!');
        console.warn('Possible reasons:');
        console.warn('  1. Page not fully loaded');
        console.warn('  2. Not authorized on Yandex Eda');
        console.warn('  3. Website structure changed');
    } else {
        console.log('\n✅ SUMMARY:');
        console.log(`Total working selectors: ${results.length}`);
        console.log('Best selector:', results.sort((a, b) => b.count - a.count)[0]?.selector);
    }
    
    return results;
})();
