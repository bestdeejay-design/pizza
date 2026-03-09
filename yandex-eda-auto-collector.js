// 🍕 YANDEX EDA AUTO COLLECTOR
// Автоматически открывает ВСЕ модалки и собирает полные данные
// 
// ЗАПУСК: F12 → Console → Вставить весь код → Enter
// 
// ЧТО БУДЕТ:
// 1. Найдёт все карточки товаров
// 2. Откроет каждую модалку
// 3. Соберёт: название, вес, цену, состав, КБЖУ, описание
// 4. Закроет модалку
// 5. Перейдёт к следующей
// 6. Сохранит JSON файл

(function() {
   console.log('🍕 YANDEX EDA AUTOMATED COLLECTOR');
   console.log('===================================\n');
    
   const collectedData = [];
   let totalProducts = 0;
   let successCount = 0;
   let failCount = 0;
    
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
           console.log(`✅ Found ${productCards.length} products with: ${selector}\n`);
            break;
        }
    }
    
    if (productCards.length === 0) {
       console.error('❌ No products found! Make sure you are on https://eda.yandex.ru/r/pizza_napoli_bmroq');
        return;
    }
    
    totalProducts = productCards.length;
    
    // Extract data from modal
    function extractData() {
       const modal = document.querySelector('[role="dialog"]');
        if (!modal) return null;
        
       const text = modal.innerText;
        
        // Title
       const titleEl = modal.querySelector('h1, h2');
       const title = titleEl ? titleEl.textContent.trim() : '';
        
        // Weight
       const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*г/i);
       const weight = weightMatch ? `${weightMatch[1]} г` : null;
        
        // Price
       const priceMatch = text.match(/(\d+)\s*₽/);
       const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        // Description
       let description = '';
       const descPatterns = [
            /([А-Яа-яЁё0-9\s,]+(?:вкус|текстур|сочетани|гармоничн|нежн|хрустящ)[^]+?)(?:Состав|На \d+|Пищевая)/i,
            /([А-Яа-яЁё0-9\s,]{50,200})(?:Состав|На \d+)/i
        ];
        for (const pattern of descPatterns) {
           const match = text.match(pattern);
            if (match) {
                description = match[1].trim();
                break;
            }
        }
        
        // Ingredients/Composition
       let ingredients = [];
       const ingredientPatterns = [
            /состав[:\s]*([^]+?)(?:на \d+|пищевая ценност|белки|жиры|углеводы|калории)/i,
            /ингредиенты[:\s]*([^]+?)(?:на \d+|пищевая ценност|белки|жиры|углеводы|калории)/i
        ];
        
        for (const pattern of ingredientPatterns) {
           const match = text.match(pattern);
            if (match) {
               const ingText = match[1].trim();
               ingredients = ingText.split(/[,,\n]/)
                    .map(i => i.trim())
                    .filter(i => i.length > 2 && i.length < 50);
                break;
            }
        }
        
        // Nutrition (КБЖУ)
       const nutrition = {
            proteins: null,
            fats: null,
            carbs: null,
            calories: null
        };
        
       const proteinMatch = text.match(/белки?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
       const fatMatch = text.match(/жиры?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
       const carbMatch = text.match(/углеводы?[:\s]*(\d+(?:\.\д+)?)\s*г/i);
       const calorieMatch = text.match(/калории?[:\s]*(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i);
        
        if (proteinMatch) nutrition.proteins = parseFloat(proteinMatch[1]);
        if (fatMatch) nutrition.fats = parseFloat(fatMatch[1]);
        if (carbMatch) nutrition.carbs = parseFloat(carbMatch[1]);
        if (calorieMatch) nutrition.calories = parseFloat(calorieMatch[1]);
        
        return {
            title,
           weight,
            price,
            description,
           ingredients,
            nutrition,
            url: window.location.href,
           collectedAt: new Date().toISOString()
        };
    }
    
    // Open modal by clicking on card
    async function openModal(card) {
        return new Promise((resolve) => {
            // Try different click methods
           const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            card.dispatchEvent(clickEvent);
            
            // Wait for modal to open
            setTimeout(() => {
               const modal = document.querySelector('[role="dialog"]');
                resolve(!!modal);
            }, 3000);
        });
    }
    
    // Close modal
    async function closeModal() {
       const closeBtn = document.querySelector('[role="dialog"] button[class*="close"], [role="dialog"] [class*="Close"]');
        if (closeBtn) {
            closeBtn.click();
            await new Promise(r => setTimeout(r, 800));
        }
    }
    
    // Main collection loop
   console.log('🚀 Starting automated collection...\n');
    
    (async () => {
        for (let i = 0; i < productCards.length; i++) {
           const card = productCards[i];
            
           console.log(`▶️  Product ${i +1}/${totalProducts}`);
            
            try {
                // Scroll to card
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 500));
                
                // Open modal
               const opened = await openModal(card);
                
                if (opened) {
                    // Extract data
                   const data = extractData();
                    
                    if (data) {
                       collectedData.push(data);
                        successCount++;
                        
                       console.log(`   ✅ SUCCESS: ${data.title.substring(0, 40)}...`);
                       console.log(`      Weight: ${data.weight || 'N/A'}`);
                       console.log(`      Price: ${data.price || 'N/A'} ₽`);
                       console.log(`      Ingredients: ${data.ingredients.length} items`);
                        if (data.nutrition.calories) {
                           console.log(`      Calories: ${data.nutrition.calories} kcal`);
                        }
                    } else {
                        failCount++;
                       console.log(`   ❌ Failed to extract data`);
                    }
                    
                    // Close modal
                    await closeModal();
                } else {
                    failCount++;
                   console.log(`   ❌ Modal did not open`);
                }
                
            } catch (error) {
                failCount++;
               console.error(`   ❌ Error: ${error.message}`);
            }
            
           console.log('');
            
            // Delay between products
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Save results
       console.log('\n================================');
       console.log('💾 Collection complete!');
       console.log(`📦 Total: ${totalProducts}`);
       console.log(`✅ Success: ${successCount}`);
       console.log(`❌ Failed: ${failCount}`);
       console.log(`📊 Success rate: ${((successCount/totalProducts)*100).toFixed(1)}%`);
       console.log('===============================\n');
        
       const output = {
            source: 'Yandex Eda',
            restaurant: 'Pizza Napoli',
            url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
            method: 'automated-modal-collection',
            stats: {
                total: totalProducts,
                success: successCount,
                failed: failCount,
                successRate: ((successCount/totalProducts)*100).toFixed(1) + '%'
            },
           collectedAt: new Date().toISOString(),
            products: collectedData
        };
        
       const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
        a.href = url;
        a.download = 'yandex-eda-auto-collect.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
       console.log('✅ File downloaded: yandex-eda-auto-collect.json');
       console.log('\n🎉 DONE! Check your Downloads folder.');
        
    })();
    
})();
