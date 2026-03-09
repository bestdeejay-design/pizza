// YANDEX EDA AUTOMATED COLLECTOR - REFACTORED
// Clean, modular code for reliable data extraction

console.log('🍕 YANDEX EDA AUTOMATED COLLECTOR (REFACTORED)');
console.log('===================================\n');
console.log('⚠️  ФАЙЛ ПОЯВИТСЯ ТОЛЬКО ПОСЛЕ ЗАВЕРШЕНИЯ ВСЕГО ПРОЦЕССА!\n');

// ===== НАСТРОЙКИ =====
const MAX_PRODUCTS = 40; // Сколько товаров собрать (2 для теста, 333 для всех)
// ======================

let collectedData = [];
let seenTitles = new Set();
let successCount = 0;
let duplicateCount = 0;
let failCount = 0;
let totalProducts = 0;

// Visual progress bar
function showProgress(current, total, status) {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  console.log(`\r[${bar}] ${percent}% (${current}/${total}) - ${status}`);
}

// Find product cards on page
function findProductCards() {
  const selectors = [
    '[class*="ProductCard"]',
    '[class*="product-card"]',
    '[class*="card"]'
  ];
  
  for (const selector of selectors) {
   const cards = document.querySelectorAll(selector);
   if (cards.length > 0) {
     console.log(`✅ Found ${cards.length} products with: ${selector}\n`);
     return cards;
    }
  }
  
  console.error('❌ No products found! Make sure you are on https://eda.yandex.ru/r/pizza_napoli_bmroq');
 return [];
}

// Extract title from card BEFORE opening modal - ULTRA STRICT WEIGHT FILTER
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
    
    // REJECT weight-only titles: "50 г", "400 г", "1,1 кг", "1.5 кг"
  const isWeightOnly = text.match(/^[\d\s.,]+[ ]?[гкГК]/);
  if (isWeightOnly) {
  console.log(`   ⚠️  REJECTED weight-only title: "${text}"`);
  continue;
    }
    
  if (!text.toLowerCase().includes('вам может понравится') &&
         !text.toLowerCase().includes('похожие') &&
         !text.toLowerCase().includes('рекомендуем')) {
   return text;
     }
    }
  }
  
  // Fallback: find first meaningful text that's NOT a weight
  const text = card.textContent.trim().split('\n')
    .map(l => l.trim())
    .filter(l => {
  if (l.length < 3 || l.length > 100) return false;
     // REJECT pure weights like "50 г", "1 кг", "1,1 кг", "1.5 кг"
  if (l.match(/^[\d\s.,]+[ ]?[гкГК]/)) return false;
  return true;
    })[0];
  
 return text || '';
}

// Find section block containing product info
function findSectionBlock(modal) {
  // Strategy 1: Find by ingredients text-collapsed, then parent section
  const ingredientsText = modal.querySelector('[data-testid="product-card-ingredients-text-collapsed"]');
  if (ingredientsText) {
   return ingredientsText.closest('section');
  }
  
  // Strategy 2: Find by ingredients-block parent
  const ingredientsBlock = modal.querySelector('[data-testid="product-card-ingredients-block"]');
  if (ingredientsBlock) {
   return ingredientsBlock.closest('section');
  }
  
  // Strategy 3: Try direct section selectors
 return modal.querySelector('section[class*="BlockRounded"], section[class*="ProductCardInfo"]') || 
         modal.querySelector('section');
}

// Extract ingredients from section- SIMPLE TEXT SEARCH AFTER "Состав"
function extractIngredients(section) {
  console.log('   🔍 Searching for ingredients...');
  
  // Strategy 1: Find all text in section and look for "Состав" followed by ingredients
  const allText = section.innerText;
  
  // Look for pattern: "Состав" followed by comma-separated items, before marketing words
  const compositionRegex = /Состав\s*[:\s]*([А-Яа-яЁё0-9\s,;]+?)(?:Вам может понравиться|Похожие|Рекомендуем|Пищевая ценност|На \d+|$)/i;
  const match = allText.match(compositionRegex);
  
  if (match && match[1]) {
   const compositionText = match[1].trim();
    
    // Check it's not too long (not description)
   if (compositionText.length < 300 && !compositionText.toLowerCase().includes('вкус') && !compositionText.toLowerCase().includes('текстур')) {
     console.log(`   ✅ Ingredients found: ${compositionText.substring(0, 100)}...`);
     return parseIngredients(compositionText);
    } else {
     console.log(`   ⚠️  Rejected - looks like description: ${compositionText.substring(0, 80)}...`);
    }
  }
  
  // Strategy 2: Try DOM-based search for composition block
  const compositionBlock = section.querySelector('[data-testid="product-card-ingredients-block"]');
  if (compositionBlock) {
   const titleEl = compositionBlock.querySelector('[data-testid="product-card-ingredients-title"]');
    
   if (titleEl && titleEl.textContent.trim().toLowerCase() === 'состав') {
      // Get text content from the block excluding title
     const blockText = compositionBlock.textContent.replace(/Состав/i, '').trim();
      
     if (blockText && blockText.length < 300 && !blockText.toLowerCase().includes('пищевая')) {
       console.log(`   ✅ Ingredients from block: ${blockText.substring(0, 100)}...`);
       return parseIngredients(blockText);
      }
    }
    
    // Try direct ingredients text
   const ingredientsText = compositionBlock.querySelector('[data-testid="product-card-ingredients-text-collapsed"], [data-testid="product-card-ingredients-text-expanded"]');
   if (ingredientsText) {
     const ingText = ingredientsText.textContent.trim();
     console.log(`   ✅ Ingredients from data-testid: ${ingText.substring(0, 100)}...`);
     return parseIngredients(ingText);
    }
  }
  
  // Strategy 3: Direct data-testid search
  const ingredientsText = section.querySelector('[data-testid="product-card-ingredients-text-collapsed"], [data-testid="product-card-ingredients-text-expanded"]');
  
  if (ingredientsText) {
   const ingText = ingredientsText.textContent.trim();
    
    // Strict validation
   const lowerText = ingText.toLowerCase();
   const hasMarketingWords = 
        lowerText.includes('вкус') || 
        lowerText.includes('текстур') || 
        lowerText.includes('гармоничн') || 
        lowerText.includes('нежн') || 
        lowerText.includes('сочетани') ||
        lowerText.includes('приготовленн') ||
        lowerText.includes('ароматн') ||
        lowerText.includes('идеальн') ||
        lowerText.includes('прекрасн') ||
        lowerText.includes('наслажд') ||
        lowerText.includes('погрузитесь') ||
        lowerText.includes('порадуй') ||
        lowerText.includes('только') ||
        lowerText.includes('свеж') ||
        lowerText.includes('пикантн') ||
        lowerText.includes('освежающ') ||
        lowerText.includes('дополнят') ||
        lowerText.includes('разнообрази') ||
        lowerText.includes('отличн') ||
        lowerText.includes('гурман') ||
        lowerText.includes('комбо') ||
        lowerText.includes('сет') ||
        lowerText.includes('морс');
    
   const hasVerbs = lowerText.match(/\b(приготовлен|подавать|идеальн|подходит|рекоменду|сочетает|создад|утул|порад|дарит|скрывает|наполнен|имеет)\w*\b/);
    
   const hasLongSentences = ingText.split(/[.,;]/).some(part => part.trim().length > 60);
    
   if (hasMarketingWords || hasVerbs || hasLongSentences || ingText.length > 100) {
     console.log(`   ⚠️  REJECTED description: ${ingText.substring(0, 80)}...`);
    } else {
     console.log(`   ✅ Ingredients validated: ${ingText.substring(0, 100)}...`);
     return parseIngredients(ingText);
    }
  }
  
  console.log('   ❌ No ingredients found in section');
 return [];
}

// Parse ingredients text into array
function parseIngredients(text) {
 return text.split(/[,;]/)
    .map(i => i.trim())
    .filter(i => {
   if (i.length < 2 || i.length > 50) return false;
   if (i.match(/^\d+/)) return false;  // Skip pure numbers
   if (i.toLowerCase().includes('вам может понравиться') || 
          i.toLowerCase().includes('похожие') || 
          i.toLowerCase().includes('рекомендуем') ||
         i.toLowerCase().includes('добавить')) return false;
   return true;
    });
}

// Extract nutrition (КБЖУ) from section
function extractNutrition(section) {
  const nutrition = {
    proteins: null,
    fats: null,
    carbs: null,
    calories: null
  };
  
  const nutritionBlock = section.querySelector('[data-testid="product-card-nutrients"]');
  if (!nutritionBlock) return nutrition;
  
  // Find each nutrient item by partial class name
  const items = nutritionBlock.querySelectorAll('[class*="ProductCardEnergyValues_item"]');
  
  items.forEach(item => {
   const valueEl = item.querySelector('[data-testid="product-card-nutrients-item-value"]');
   const titleEl = item.querySelector('[data-testid="product-card-nutrients-item-title"]');
    
   if (valueEl && titleEl) {
     const valueText = valueEl.textContent.trim();
     const titleText = titleEl.textContent.trim().toLowerCase();
      
     const numMatch = valueText.match(/(\d+(?:\.\d+)?)/);
     if (!numMatch) return;
     const value = parseFloat(numMatch[1]);
      
      // Map to nutrition fields
     if (titleText.includes('ккал') || titleText.includes('кал')) {
        nutrition.calories = value;
      } else if (titleText.includes('белк')) {
        nutrition.proteins = value;
      } else if (titleText.includes('жир')) {
        nutrition.fats = value;
      } else if (titleText.includes('углевод')) {
        nutrition.carbs = value;
      }
    }
  });
  
  console.log(`   🔥 KBJU: ${nutrition.calories || 0} kcal, ${nutrition.proteins || 0}/${nutrition.fats || 0}/${nutrition.carbs || 0}`);
 return nutrition;
}

// Extract description from section
function extractDescription(section) {
  const descElement = section.querySelector('[class*="ProductCardDescriptions_descriptionText"]');
  if (descElement) {
   return descElement.textContent.trim();
  }
  
  // Fallback: regex patterns
  const descPatterns = [
    /([А-Яа-яЁё0-9\s,]+(?:вкус|текстур|сочетани|гармоничн|нежн|хрустящ)[^]+?)(?:Состав|На \d+|Пищевая)/i,
    /([А-Яа-яЁё0-9\s,]{50,200})(?:Состав|На \d+)/i
  ];
  
  for (const pattern of descPatterns) {
   const match = section.textContent.match(pattern);
   if (match) {
     return match[1].trim();
    }
  }
  
 return '';
}

// Extract data from section block
function extractDataFromSection(title, section) {
  // Weight
  const weightMatch = section.textContent.match(/(\d+(?:\.\d+)?)\s*г/i);
  const weight = weightMatch ? `${weightMatch[1]} г` : null;
  
  // Price
  const priceMatch = section.textContent.match(/(\d+)\s*₽/);
  const price = priceMatch ? parseInt(priceMatch[1]) : null;
  
  // Description
  const description = extractDescription(section);
  
  // Ingredients
  const ingredients = extractIngredients(section);
  
  // Nutrition (КБЖУ)
  const nutrition = extractNutrition(section);
  
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

// Fallback extraction if section not found
function extractDataFallback(title, modal) {
  const text = modal.innerText;
  
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
  
  // Ingredients
 let ingredients = [];
  const compositionMatch = text.match(/Состав\s*([\s\S]+?)(?:Вам может понравиться|$)/i);
  if (compositionMatch) {
   const ingText = compositionMatch[1].trim();
   console.log(`   📝 Composition found via "Состав" header`);
    
   ingredients = ingText.split(/[,\n]/)
      .map(i => i.trim())
      .filter(i => {
       if (i.length < 2 || i.length > 50) return false;
       if (i.match(/^\d+/)) return false;
       if (i.toLowerCase().includes('вам может понравиться') || 
            i.toLowerCase().includes('похожие') || 
            i.toLowerCase().includes('рекомендуем') ||
            i.toLowerCase().includes('добавить')) return false;
       return true;
      });
  }
  
  // Nutrition (КБЖУ) - fallback regex patterns
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

// Main extract function
function extractData(title) {
  const modal = document.querySelector('[role="dialog"]');
  if (!modal) return null;
  
  // Find section block
  const sectionBlock = findSectionBlock(modal);
  
  if (!sectionBlock) {
   console.log('   ⚠️  Section block not found, using fallback');
   return extractDataFallback(title, modal);
  }
  
  console.log('   ✅ Found section block for extraction');
  
  // Extract all data from section
 return extractDataFromSection(title, sectionBlock);
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

// Close modal by clicking close button- ONLY WORKING METHOD
async function closeModal() {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) {
  console.log('   ✅ No modal to close');
   return true;
  }
  
  console.log('   🚪 Closing modal...');
  
  // Find and click close button by aria-label
  const closeSelectors = [
    'button[aria-label*="закрыть"]',
    'button[aria-label*="close"]',
    'button[aria-label]',
    '[aria-label*="закрыть"]',
    '[aria-label*="close"]'
  ];
  
  for (const selector of closeSelectors) {
  const closeBtn = dialog.querySelector(selector);
  if (closeBtn) {
    console.log(`   Found close button: ${selector}`);
     
     // Click with MouseEvent dispatch
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      
      closeBtn.dispatchEvent(event);
      
      // Wait and verify
      await new Promise(r => setTimeout(r, 2000));
      
    const finalCheck = document.querySelector('[role="dialog"]');
    if (!finalCheck) {
      console.log('   ✅ Modal closed via button');
       return true;
      }
      
    console.log('   ⚠️  Button click failed, trying next selector...');
    }
  }
  
  // If no button found, try generic close
  const genericClose = dialog.querySelector('button[class*="close"], [class*="Close"], svg[class*="close"]');
  if (genericClose) {
  const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    genericClose.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 2000));
    
  const finalCheck = document.querySelector('[role="dialog"]');
  if (!finalCheck) {
   console.log('   ✅ Modal closed via generic close');
    return true;
    }
  }
  
  console.log('   ❌ Failed to find close button');
 return false;
}

// Main collection loop
console.log('🚀 Starting automated collection...\n');

(async () => {
  const productCards = findProductCards();
  if (productCards.length === 0) return;
  
  totalProducts = Math.min(productCards.length, MAX_PRODUCTS);
  console.log(`🎯 Will collect ${totalProducts} products (max: ${MAX_PRODUCTS})\n`);
  
  // Pre-scan card titles to avoid duplicates
  const scannedCardTitles = new Set();
  
  for (let i = 0; i < totalProducts; i++) {
  const card = productCards[i];
    
  console.log(`▶️  Product ${i + 1}/${totalProducts}`);
    
    // Show progress
    showProgress(i + 1, totalProducts, 'Scanning...');
    
    try {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 500));
      
     // Get title from card BEFORE opening modal
   const preCheckTitle = extractTitleFromCard(card);
   const normalizedPreTitle = preCheckTitle.toLowerCase().trim();
    
    // Skip if we already scanned this card
   if (scannedCardTitles.has(normalizedPreTitle)) {
     duplicateCount++;
    console.log(`   ⏭️  DUPLICATE card skipped: ${preCheckTitle.substring(0, 40)}...`);
    continue;
    }
    scannedCardTitles.add(normalizedPreTitle);
      
    const opened = await openModal(card);
      
   if (opened) {
      // Verify modal is actually accessible
   const modal = document.querySelector('[role="dialog"]');
   if (!modal) {
    console.log('   ❌ Modal opened but not accessible');
      failCount++;
    continue;
      }
      
     // Wait a bit for content to load
     await new Promise(r => setTimeout(r, 500));
      
     // Get title from card BEFORE opening modal
   const cardTitle = extractTitleFromCard(card);
   console.log(`   📦 Card title found: ${cardTitle.substring(0, 50)}...`);
        
       const data = extractData(cardTitle);
        
       if (data && data.title) {
          // Check for duplicates
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
        
        const closed = await closeModal();
      if (!closed) {
       console.log('   ❌ MODAL NOT CLOSED! Waiting extra time...');
         // Wait longer if close failed
         await new Promise(r => setTimeout(r, 3000));
         
         // Check again
       const stillOpen = document.querySelector('[role="dialog"]');
       if (stillOpen) {
         console.log('   ⚠️  Modal STILL OPEN - stopping collection to prevent errors');
           failCount++;
          break; // Stop collection to prevent cascading errors
         }
        }
      } else {
        failCount++;
     console.log(`   ❌ Modal did not open`);
      }
      
    } catch (error) {
      failCount++;
   console.error(`   ❌ Error: ${error.message}`);
    }
    
  console.log('');
    
    // Extra long delay between products to ensure modal is fully closed
    await new Promise(r => setTimeout(r, 2000));
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
  await new Promise(r => setTimeout(r, 500));
  
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
  console.log('\n📁 MOVE FILE TO: /Users/admin/Documents/GitHub/pizza/');
  console.log('  Terminal command:');
  console.log('  mv ~/Downloads/yandex-eda-auto-collect.json /Users/admin/Documents/GitHub/pizza/');
})();
