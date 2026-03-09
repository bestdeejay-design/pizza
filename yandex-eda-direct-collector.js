// 🍕 YANDEX EDA DIRECT COLLECTOR
// Собирает данные ПРЯМО ИЗ КАРТОЧЕК без открытия модалок
// 
// ЗАПУСК: F12 → Console → Вставить весь код → Enter

(function() {
    console.log('🍕 YANDEX EDA DIRECT DATA COLLECTOR');
    console.log('====================================\n');
    
    const collectedData = [];
    
    // Find all product cards
    const selectors = [
        '[class*="ProductCard"]',
        '[class*="product-card"]',
        '[class*="card"]'
    ];
    
    let productCards = [];
    for (const selector of selectors) {
        productCards = document.querySelectorAll(selector);
        if (productCards.length > 0) {
            console.log(`✅ Found ${productCards.length} products with selector: ${selector}\n`);
            break;
        }
    }
    
    if (productCards.length === 0) {
        console.error('❌ No products found! Make sure you are on https://eda.yandex.ru/r/pizza_napoli_bmroq');
        return;
    }
    
    // Extract data from each card
    productCards.forEach((card, index) => {
        try {
            // Title
            const titleEl = card.querySelector('h3, h4, [class*="title"], [class*="name"]');
            const title = titleEl ? titleEl.textContent.trim() : `Product ${index + 1}`;
            
            // Price
            const priceEl = card.querySelector('[class*="price"]');
            const priceText = priceEl ? priceEl.textContent : '';
            const priceMatch = priceText.match(/(\d+)\s*₽/);
            const price = priceMatch ? parseInt(priceMatch[1]) : null;
            
            // Weight - look in the card text
            const cardText = card.innerText;
            const weightMatch = cardText.match(/(\d+(?:\.\d+)?)\s*г/i);
            const weight = weightMatch ? `${weightMatch[1]} г` : null;
            
            // Description (if available in card)
            const descEl = card.querySelector('p[class*="desc"], [class*="description"]');
            const description = descEl ? descEl.textContent.trim() : '';
            
            // Try to find nutrition info
            const nutrition = {
                proteins: null,
                fats: null,
                carbs: null,
                calories: null
            };
            
            const proteinMatch = cardText.match(/белки?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
            const fatMatch = cardText.match(/жиры?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
            const carbMatch = cardText.match(/углеводы?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
            const calorieMatch = cardText.match(/калории?[:\s]*(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i);
            
            if (proteinMatch) nutrition.proteins = parseFloat(proteinMatch[1]);
            if (fatMatch) nutrition.fats = parseFloat(fatMatch[1]);
            if (carbMatch) nutrition.carbs = parseFloat(carbMatch[1]);
            if (calorieMatch) nutrition.calories = parseFloat(calorieMatch[1]);
            
            const data = {
                title: title,
                weight: weight,
                price: price,
                description: description,
                nutrition: nutrition,
                url: window.location.href,
                collectedAt: new Date().toISOString()
            };
            
            collectedData.push(data);
            
            console.log(`✅ ${index + 1}. ${title}`);
            console.log(`   Weight: ${weight || 'N/A'}`);
            console.log(`   Price: ${price || 'N/A'} ₽`);
            if (nutrition.calories) {
                console.log(`   Calories: ${nutrition.calories} kcal`);
            }
            console.log('');
            
        } catch (error) {
            console.error(`❌ Error processing product ${index + 1}:`, error.message);
        }
    });
    
    // Save to file
    console.log('\n================================');
    console.log(`💾 Collection complete!`);
    console.log(`📦 Total products: ${collectedData.length}`);
    console.log('===============================\n');
    
    const output = {
        source: 'Yandex Eda',
        restaurant: 'Pizza Napoli',
        url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
        collectionMethod: 'direct-from-cards',
        collectedAt: new Date().toISOString(),
        totalProducts: collectedData.length,
        products: collectedData
    };
    
    const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yandex-eda-direct-collect.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ File downloaded: yandex-eda-direct-collect.json');
    console.log('\n🎉 DONE! Check your downloads folder.');
    console.log('\n⚠️ NOTE: This method collects data visible on cards.');
    console.log('For full descriptions and ingredients, manual modal opening is required.');
    
})();
