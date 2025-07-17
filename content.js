// Content script for cologne image hover buttons
function extractFragranceName(img) {
  // Try to get fragrance name from various sources
  const altText = img.alt || '';
  const titleText = img.title || '';
  const figcaption = img.closest('figure')?.querySelector('figcaption')?.textContent || '';
  const nearbyText = img.parentElement?.textContent || '';

  // Look for the most likely fragrance name
  let fragranceName = altText || titleText || figcaption;

  // Clean up the name (remove common words, file extensions, etc.)
  if (fragranceName) {
    fragranceName = fragranceName
      .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
      .replace(/cologne|perfume|fragrance|bottle|image/gi, '')
      .trim();
  }

  // If still no good name, try to extract from page title as fallback
  if (!fragranceName) {
    const pageTitle = document.querySelector('title')?.textContent || '';
    fragranceName = pageTitle.split('|')[0].trim();
  }

  return fragranceName || 'Unknown Fragrance';
}

function findTopmostVisibleImage(container) {
  // Find all images in the container
  const images = container.querySelectorAll('img');
  let topmostImage = null;
  let highestZIndex = -1;

  for (const img of images) {
    const rect = img.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(img);

    // Skip if image is not visible
    if (rect.width === 0 || rect.height === 0 ||
        computedStyle.display === 'none' ||
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0') {
      continue;
    }

    // Get z-index (treat 'auto' as 0)
    const zIndex = computedStyle.zIndex === 'auto' ? 0 : parseInt(computedStyle.zIndex) || 0;

    // Consider both z-index and DOM order (later elements appear on top)
    if (zIndex > highestZIndex ||
        (zIndex === highestZIndex && (!topmostImage ||
         Array.from(container.querySelectorAll('img')).indexOf(img) >
         Array.from(container.querySelectorAll('img')).indexOf(topmostImage)))) {
      topmostImage = img;
      highestZIndex = zIndex;
    }
  }

  return topmostImage;
}

function createOrUpdateButton(container, fragranceName) {
  // Find the topmost visible image
  const topmostImage = findTopmostVisibleImage(container);
  if (!topmostImage) return;

  // Check if image meets size requirements
  const rect = topmostImage.getBoundingClientRect();
  if (rect.width < 100 || rect.height < 100) return;

  // Remove any existing button
  const existingButton = container.querySelector('.fragrance-hover-btn');
  if (existingButton) {
    existingButton.remove();
  }

  // Ensure container can hold absolutely positioned elements
  const containerStyle = window.getComputedStyle(container);
  if (containerStyle.position === 'static') {
    container.style.position = 'relative';
  }

  // Create the button
  const button = document.createElement('button');
  button.className = 'fragrance-hover-btn';
  button.innerHTML = 'Fragrantica';
  button.style.cssText = `
    position: absolute;
    bottom: 12px;
    right: 8px;
    display: none;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
    pointer-events: auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    line-height: 1;
  `;

  // Add hover effect for button
  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(0, 0, 0, 0.95)';
    button.style.transform = 'scale(1.05)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(0, 0, 0, 0.85)';
    button.style.transform = 'scale(1)';
  });

  // Click handler - opens specific Fragrantica search
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const searchUrl = `https://www.fragrantica.com/search/?q=${encodeURIComponent(fragranceName)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  });

  // Add button to container
  container.appendChild(button);

  // Store reference to current container for cleanup
  button.dataset.container = container;

  return button;
}

function setupHoverEvents(container) {
  // Remove existing hover events to avoid duplicates
  container.removeEventListener('mouseenter', container._fragranceMouseEnter);
  container.removeEventListener('mouseleave', container._fragranceMouseLeave);

  // Create new hover event handlers
  container._fragranceMouseEnter = () => {
    const button = container.querySelector('.fragrance-hover-btn');
    if (button) {
      // Update button position for current topmost image
      const fragranceName = extractFragranceNameFromContainer(container);
      createOrUpdateButton(container, fragranceName);

      const updatedButton = container.querySelector('.fragrance-hover-btn');
      if (updatedButton) {
        updatedButton.style.display = 'block';
      }
    }
  };

  container._fragranceMouseLeave = () => {
    const button = container.querySelector('.fragrance-hover-btn');
    if (button) {
      button.style.display = 'none';
    }
  };

  // Add hover events to container
  container.addEventListener('mouseenter', container._fragranceMouseEnter);
  container.addEventListener('mouseleave', container._fragranceMouseLeave);
}

function extractFragranceNameFromContainer(container) {
  // Try to get fragrance name from any image in the container
  const images = container.querySelectorAll('img');
  for (const img of images) {
    const name = extractFragranceName(img);
    if (name && name !== 'Unknown Fragrance') {
      return name;
    }
  }
  return 'Unknown Fragrance';
}

function isLikelyFragranceImage(img) {
  const src = img.src?.toLowerCase() || '';
  const alt = img.alt?.toLowerCase() || '';
  const className = img.className?.toLowerCase() || '';

  // First, check minimum size requirements (avoid small menu buttons/icons)
  const minWidth = 100;
  const minHeight = 100;

  // Get actual rendered dimensions
  const rect = img.getBoundingClientRect();
  const actualWidth = rect.width;
  const actualHeight = rect.height;

  // Skip if image is too small
  if (actualWidth < minWidth || actualHeight < minHeight) {
    return false;
  }

  // Skip common non-fragrance elements
  const excludeKeywords = [
    'logo', 'icon', 'avatar', 'menu', 'button', 'nav', 'header', 'footer',
    'social', 'share', 'cart', 'search', 'close', 'arrow', 'chevron'
  ];

  const hasExcludeKeyword = excludeKeywords.some(keyword =>
    src.includes(keyword) || alt.includes(keyword) || className.includes(keyword)
  );

  if (hasExcludeKeyword) {
    return false;
  }

  // Check if image is likely a fragrance/cologne bottle
  const fragranceKeywords = [
    'cologne', 'perfume', 'fragrance', 'bottle', 'scent',
    'eau de toilette', 'eau de parfum', 'edt', 'edp', 'product'
  ];

  // Check if any keywords are present
  const hasKeyword = fragranceKeywords.some(keyword =>
    src.includes(keyword) || alt.includes(keyword) || className.includes(keyword)
  );

  // For larger images, be more permissive even without keywords
  const isLargeImage = actualWidth >= 150 && actualHeight >= 150;

  return hasKeyword || isLargeImage;
}

function processImageContainer(container) {
  // Allow reprocessing by removing the processed flag during reprocessing runs
  // but keep the processed flag to avoid duplicate processing within the same run

  // Extract fragrance name from container
  const fragranceName = extractFragranceNameFromContainer(container);

  // Create button and setup hover events
  createOrUpdateButton(container, fragranceName);
  setupHoverEvents(container);

  // Mark as processed
  container.dataset.fragranceProcessed = 'true';
}

function findImageContainers() {
  const images = document.querySelectorAll('img');
  const processedContainers = new Set();

  images.forEach(img => {
    // Only process likely fragrance images
    if (!isLikelyFragranceImage(img)) return;

    // Find the appropriate container (parent that can hold multiple images)
    let container = img.parentElement;

    // Look for a container that might hold multiple images (common patterns)
    while (container && container !== document.body) {
      const containerImages = container.querySelectorAll('img');
      if (containerImages.length >= 1 &&
          (container.classList.contains('product') ||
           container.classList.contains('image') ||
           container.classList.contains('photo') ||
           container.tagName === 'FIGURE' ||
           container.getAttribute('data-zoom') ||
           window.getComputedStyle(container).position === 'relative')) {
        break;
      }
      container = container.parentElement;
    }

    // If no suitable container found, use immediate parent
    if (!container || container === document.body) {
      container = img.parentElement;
    }

    // Process each container only once per run, but allow reprocessing on subsequent runs
    if (!processedContainers.has(container)) {
      processedContainers.add(container);
      processImageContainer(container);
    }
  });
}

// Watch for dynamic image changes
function watchForImageChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldReprocess = false;

    mutations.forEach((mutation) => {
      // Check for added images
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'IMG' || node.querySelector('img')) {
            shouldReprocess = true;
          }
        }
      });

      // Check for src changes on existing images
      if (mutation.type === 'attributes' &&
          mutation.attributeName === 'src' &&
          mutation.target.tagName === 'IMG') {
        shouldReprocess = true;
      }
    });

    if (shouldReprocess) {
      setTimeout(() => {
        // Re-process all containers to update buttons for new images
        const containers = document.querySelectorAll('[data-fragrance-processed="true"]');
        containers.forEach(container => {
          const fragranceName = extractFragranceNameFromContainer(container);
          createOrUpdateButton(container, fragranceName);
        });

        // Also find any new containers
        findImageContainers();
      }, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  return observer;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initial processing
    findImageContainers();
    watchForImageChanges();

    // Delayed reprocessing for images that might not have been ready
    setTimeout(() => {
      console.log('Fragrance Extension: Reprocessing images after 2 seconds...');
      findImageContainers();
    }, 2000);

    // Recurring reprocessing every 20 seconds
    setInterval(() => {
      console.log('Fragrance Extension: Recurring reprocessing...');
      findImageContainers();
    }, 20000);
  });
} else {
  // Initial processing
  findImageContainers();
  watchForImageChanges();

  // Delayed reprocessing for images that might not have been ready
  setTimeout(() => {
    console.log('Fragrance Extension: Reprocessing images after 2 seconds...');
    findImageContainers();
  }, 2000);

  // Recurring reprocessing every 20 seconds
  setInterval(() => {
    console.log('Fragrance Extension: Recurring reprocessing...');
    findImageContainers();
  }, 20000);
}

// Clean up observer when page unloads
window.addEventListener('beforeunload', () => {
  // Observer cleanup is handled automatically
});
