// 🍕 YANDEX EDA AUTO COLLECTOR
// Автоматически открывает ВСЕ модалки и собирает полные данные
// 
// ЗАПУСК: F12 → Console → Вставить весь код → Enter
// 
// НАСТРОЙКИ:
// - MAX_PRODUCTS = 2 (собрать первые 2 товара для теста)
// - MAX_PRODUCTS = 333 (собрать все товары)
// 
// ЧТО БУДЕТ:
// 1. Найдёт все карточки товаров
// 2. Извлечёт название из карточки ДО открытия модалки
// 3. Откроет каждую модалку
// 4. Соберёт: вес, цену, состав, КБЖУ, описание
// 5. Проверит дубликаты по названию (игнорирует повторы)
// 6. Закроет модалку
// 7. Перейдёт к следующей
// 8. Сохранит JSON файл только с уникальными товарами

(function() {
  console.log('🍕 YANDEX EDA AUTOMATED COLLECTOR');
  console.log('===================================\n');
  console.log('⚠️  ФАЙЛ ПОЯВИТСЯ ТОЛЬКО ПОСЛЕ ЗАВЕРШЕНИЯ ВСЕГО ПРОЦЕССА!\n');
  
  // ===== НАСТРОЙКИ (можно менять) =====
  const MAX_PRODUCTS = 2; // Сколько товаров собрать (2 для теста, 333 для всех)
  // ====================================
   
  // Visual progress bar
  function showProgress(current, total, message) {
  const percentage = Math.round((current / total) * 100);
  const filled = '█'.repeat(Math.floor(percentage / 5));
  const empty = '░'.repeat(20 - Math.floor(percentage / 5));
  console.log(`\n📊 PROGRESS: [${filled}${empty}] ${current}/${total} (${percentage}%) - ${message}`);
  }
    
  const collectedData = [];
  const seenTitles = new Set(); // Track unique product names
  let totalProducts = 0;
  let successCount = 0;
  let failCount = 0;
  let duplicateCount = 0;
    
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
    
    totalProducts = Math.min(productCards.length, MAX_PRODUCTS);
   
  console.log(`🎯 Will collect ${totalProducts} products (max: ${MAX_PRODUCTS})\n`);
    
   // Extract title from card BEFORE opening modal
  function extractTitleFromCard(card) {
  const titleSelectors = [
       '[class*="title"]',
       '[class*="name"]',
       '[class*="Title"]',
       '[class*="Name"]',
       'h3',
       'h4'
     ];
     
   for (const selector of titleSelectors) {
   const el = card.querySelector(selector);
      if (el && el.textContent.trim().length > 0) {
     const text = el.textContent.trim();
        if (!text.toLowerCase().includes('вам может понравится') &&
            !text.toLowerCase().includes('похожие') &&
            !text.toLowerCase().includes('рекомендуем')) {
         return text;
       }
      }
    }
    
    // Fallback: find first meaningful text in card
  const text = card.textContent.trim().split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 3 && l.length < 100)[0];
    
   return text || '';
  }
    
    // Extract data from modal (title is passed separately)
   function extractData(title) {
 const modal = document.querySelector('[role="dialog"]');
       if (!modal) return null;
       
  const text = modal.innerText;
        
        // Title is passed from card, just extract other data
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
        
        // Ingredients/Composition - parse actual ingredients list
     let ingredients = [];
     const ingredientSections = [
            /состав[:\s]*([\s\S]+?)(?:на \d+|пищевая ценност|белки|жиры|углеводы|калории|$)/i,
            /ингредиенты[:\s]*([\s\S]+?)(?:на \d+|пищевая ценност|белки|жиры|углеводы|калории|$)/i
        ];
        
        for (const pattern of ingredientSections) {
        const match = text.match(pattern);
            if (match) {
           const ingText = match[1].trim();
               ingredients = ingText.split(/[,\n]/)
                   .map(i => i.trim())
                   .filter(i => {
                       if (i.length < 2 || i.length > 50) return false;
                       if (i.match(/^\d+/)) return false;
                       if (i.toLowerCase().includes('ккал') || 
                           i.toLowerCase().includes('белк') || 
                           i.toLowerCase().includes('жир') || 
                           i.toLowerCase().includes('углевод')) return false;
                       return true;
                   });
                break;
            }
        }
        
        // Nutrition (КБЖУ) - improved patterns to catch values in different formats
     const nutrition = {
            proteins: null,
            fats: null,
            carbs: null,
            calories: null
        };
        
       const proteinPatterns = [/белки?[:\s]*(\d+(?:\.\d+)?)\s*г/i, /(\d+(?:\.\d+)?)\s*г\s*белков?/i];
       const fatPatterns = [/жиры?[:\s]*(\d+(?:\.\d+)?)\s*г/i, /(\d+(?:\.\d+)?)\s*г\s*жиров?/i];
       const carbPatterns = [/углеводы?[:\s]*(\d+(?:\.\d+)?)\s*г/i, /(\d+(?:\.\d+)?)\s*г\s*углеводов?/i];
       const caloriePatterns = [/калории?[:\s]*(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i, /(\d+(?:\.\d+)?)\s*(?:ккал|кал)/i];
        
        for (const pattern of proteinPatterns) {
        const match = text.match(pattern);
            if (match) {
               nutrition.proteins = parseFloat(match[1]);
                break;
            }
        }
        
        for (const pattern of fatPatterns) {
        const match = text.match(pattern);
            if (match) {
               nutrition.fats = parseFloat(match[1]);
                break;
            }
        }
        
        for (const pattern of carbPatterns) {
        const match = text.match(pattern);
            if (match) {
               nutrition.carbs = parseFloat(match[1]);
                break;
            }
        }
        
        for (const pattern of caloriePatterns) {
        const match = text.match(pattern);
            if (match) {
               nutrition.calories = parseFloat(match[1]);
                break;
            }
        }
        
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
          const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            card.dispatchEvent(clickEvent);
            
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
        for (let i = 0; i < totalProducts; i++) {
          const card = productCards[i];
            
          console.log(`▶️  Product ${i +1}/${totalProducts}`);
                   
       // Show progress bar on EVERY item
      showProgress(i + 1, totalProducts, `Scanning...`);
            
            try {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 500));
                
              const opened = await openModal(card);
                
                if (opened) {
                 // Get title from card BEFORE opening modal
            const cardTitle = extractTitleFromCard(card);
             console.log(`   📦 Card title found: ${cardTitle.substring(0, 50)}...`);
               
            const data = extractData(cardTitle);
                    
                    if (data && data.title) {
                        // Check for duplicates by title (case-insensitive)
                      const normalizedTitle = data.title.toLowerCase().trim();
                        
                       if (seenTitles.has(normalizedTitle)) {
                           duplicateCount++;
                        console.log(`   ⏭️  DUPLICATE skipped: ${data.title.substring(0, 40)}...`);
                       } else {
                          seenTitles.add(normalizedTitle);
                       collectedData.push(data);
                           successCount++;
                           
                      console.log(`   ✅ WRITTEN: ${data.title.substring(0, 50)}`);
                      console.log(`      💰 Price: ${data.price || 'N/A'} ₽ | Weight: ${data.weight || 'N/A'}`);
                      console.log(`      📝 Ingredients: ${data.ingredients.length} items`);
                           if (data.nutrition.calories) {
                        console.log(`      🔥 Calories: ${data.nutrition.calories} kcal`);
                           }
                           if (data.nutrition.proteins || data.nutrition.fats || data.nutrition.carbs) {
                        console.log(`      📊 BJU: ${data.nutrition.proteins || 0}/${data.nutrition.fats || 0}/${data.nutrition.carbs || 0}`);
                           }
                      console.log(`   👉 TOTAL SAVED: ${successCount} products\n`);
                       }
                   } else {
                        failCount++;
                     console.log(`   ❌ Failed to extract data`);
                    }
                    
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
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
     console.log('\n================================');
    console.log('💾 Collection complete!');
    console.log(`📦 Total cards scanned: ${totalProducts}`);
    console.log(`✅ New products added: ${successCount}`);
    console.log(`⏭️  Duplicates skipped: ${duplicateCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Success rate: ${((successCount/totalProducts)*100).toFixed(1)}%`);
    console.log('===============================\n');
       
   console.log('\n⏳ GENERATING FILE...\n');
    await new Promise(r => setTimeout(r, 500)); // Small delay to show the message
      
    const output = {
           source: 'Yandex Eda',
           restaurant: 'Pizza Napoli',
           url: 'https://eda.yandex.ru/r/pizza_napoli_bmroq',
           method: 'automated-modal-collection',
           stats: {
               total: totalProducts,
               success: successCount,
               duplicates: duplicateCount,
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
