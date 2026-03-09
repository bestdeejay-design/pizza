// 🍕 YANDEX EDA HYBRID COLLECTOR
// Пытается открыть модалки ЧЕРЕЗ внутренние события Yandex Eda
// Если не получается - собирает данные из карточек
//
// ЗАПУСК: F12 → Console → Вставить весь код → Enter

(function() {
   console.log('🍕 YANDEX EDA HYBRID COLLECTOR');
   console.log('================================\n');
    
   const collectedData = [];
    let modalOpenAttempts = 0;
    let modalOpenSuccess = 0;
    
    // Find all product cards
   const selectors = [
        '[class*="ProductCard"]',
        '[class*="product-card"]'
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
       console.error('❌ No products found!');
        return;
    }
    
    // Try to open modal by simulating real user click
    function tryOpenModal(card) {
        return new Promise((resolve) => {
            modalOpenAttempts++;
            
            // Method 1: Click on card
           const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            card.dispatchEvent(clickEvent);
            
            // Wait and check if modal opened
            setTimeout(() => {
               const modal = document.querySelector('[role="dialog"]');
                if (modal) {
                    modalOpenSuccess++;
                   console.log(`✅ Modal opened (attempt ${modalOpenAttempts})`);
                    resolve(true);
                } else {
                   console.log(`⚠️ Modal did not open (attempt ${modalOpenAttempts})`);
                    resolve(false);
                }
            }, 3000);
        });
    }
    
    // Extract data from modal
    function extractFromModal() {
       const modal = document.querySelector('[role="dialog"]');
        if (!modal) return null;
        
       const modalText = modal.innerText;
        
        // Title
       const titleEl = modal.querySelector('h1, h2');
       const title = titleEl ? titleEl.textContent.trim() : '';
        
        // Weight
       const weightMatch = modalText.match(/(\d+(?:\.\d+)?)\s*г/i);
       const weight = weightMatch ? `${weightMatch[1]} г` : null;
        
        // Price
       const priceMatch = modalText.match(/(\d+)\s*₽/);
       const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        // Ingredients/Composition
        let ingredients = [];
       const ingredientPatterns = [
            /состав[:\s]*([^]+?)(?:на \d+|пищевая|белки)/i,
            /ингредиенты[:\s]*([^]+?)(?:на \d+|пищевая|белки)/i
        ];
        
        for (const pattern of ingredientPatterns) {
           const match = modalText.match(pattern);
            if (match) {
               const text = match[1].trim();
                // Split by commas or newlines
               ingredients = text.split(/[,,\n]/)
                    .map(i => i.trim())
                    .filter(i => i.length > 2 && i.length < 50);
                break;
            }
        }
        
        // If no ingredients found, try alternative selectors
        if (ingredients.length === 0) {
           const compositionEl = modal.querySelector('[class*="composition"], [class*="ingredient"], [class*="состав"]');
            if (compositionEl) {
               ingredients = compositionEl.textContent
                    .split(/[,,\n]/)
                    .map(i => i.trim())
                    .filter(i => i.length > 2 && i.length < 50);
            }
        }
        
        // Nutrition
       const nutrition = {
            proteins: null,
            fats: null,
            carbs: null,
            calories: null
        };
        
       const proteinMatch = modalText.match(/белки?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
       const fatMatch = modalText.match(/жиры?[:\s]*(\d+(?:\.\d+)?)\s*г/i);
       const carbMatch = modalText.match(/углеводы?[:\s]*(\d+(?:\.\д+)?)\s*г/i);
       const calorieMatch = modalText.match(/калории?[:\s]*(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i);
        
        if (proteinMatch) nutrition.proteins = parseFloat(proteinMatch[1]);
        if (fatMatch) nutrition.fats = parseFloat(fatMatch[1]);
        if (carbMatch) nutrition.carbs = parseFloat(carbMatch[1]);
        if (calorieMatch) nutrition.calories = parseFloat(calorieMatch[1]);
        
        return {
            title,
           weight,
            price,
           ingredients,
            nutrition,
            source: 'modal'
        };
    }
    
    // Extract from card (fallback)
    function extractFromCard(card) {
       const cardText = card.innerText;
        
        // Title
       const titleEl = card.querySelector('h3, h4, [class*="title"]');
       const title= titleEl ? titleEl.textContent.trim() : '';
        
        // Price
       const priceEl = card.querySelector('[class*="price"]');
       const priceText = priceEl ? priceEl.textContent : '';
       const priceMatch = priceText.match(/(\d+)\s*₽/);
       const price = priceMatch ? parseInt(priceMatch[1]) : null;
        
        // Weight
       const weightMatch = cardText.match(/(\d+(?:\.\d+)?)\s*г/i);
       const weight = weightMatch ? `${weightMatch[1]} г` : null;
        
        return {
            title,
           weight,
            price,
           ingredients: [],
            nutrition: { proteins: null, fats: null, carbs: null, calories: null },
            source: 'card'
        };
    }
    
    // Close modal
    async function closeModal() {
       const closeBtn = document.querySelector('[role="dialog"] button[class*="close"], [role="dialog"] [class*="Close"]');
        if (closeBtn) {
            closeBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }
    }
    
    // Main collection
   console.log('🚀 Starting hybrid collection...\n');
    
    (async () => {
        for (let i = 0; i < productCards.length; i++) {
           const card = productCards[i];
            
           console.log(`▶️  Product ${i + 1}/${productCards.length}`);
            
            // Try to open modal
           const modalOpened = await tryOpenModal(card);
            
            let data;
            if (modalOpened) {
                // Extract from modal
                data = extractFromModal();
                if (data) {
                   console.log(`   ✅ From MODAL: ${data.title}`);
                   console.log(`      Weight: ${data.weight || 'N/A'}`);
                   console.log(`      Price: ${data.price || 'N/A'} ₽`);
                   console.log(`      Ingredients: ${data.ingredients.length} items`);
                    
                    // Close modal
                    await closeModal();
                }
            } else {
                // Fallback: extract from card
                data = extractFromCard(card);
               console.log(`   ⚠️ From CARD: ${data.title}`);
               console.log(`      Weight: ${data.weight || 'N/A'}`);
               console.log(`      Price: ${data.price || 'N/A'} ₽`);
            }
            
            if (data) {
                data.url = window.location.href;
                data.collectedAt = new Date().toISOString();
               collectedData.push(data);
            }
            
           console.log('');
            
            // Small delay
            await new Promise(r => setTimeout(r, 500));
        }
        
        // Save results
       console.log('\n================================');
       console.log(`💾 Collection complete!`);
       console.log(`📦 Total: ${collectedData.length}`);
       console.log(`✅ From modals: ${modalOpenSuccess}`);
       console.log(`⚠️ From cards: ${modalOpenAttempts - modalOpenSuccess}`);
       console.log('===============================\n');
        
       const output = {
            source: 'Yandex Eda',
            restaurant: 'Pizza Napoli',
            url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
            method: 'hybrid',
            stats: {
                total: collectedData.length,
                fromModals: modalOpenSuccess,
                fromCards: modalOpenAttempts - modalOpenSuccess
            },
           collectedAt: new Date().toISOString(),
            products: collectedData
        };
        
       const blob = new Blob([JSON.stringify(output, null, 2)], {type: 'application/json'});
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
        a.href = url;
       a.download = 'yandex-eda-hybrid-collect.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
       console.log('✅ File downloaded: yandex-eda-hybrid-collect.json');
       console.log('\n🎉 DONE!');
        
    })();
    
})();
