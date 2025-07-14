function getFragranceName() {
  const titleTag = document.querySelector('title');
  return titleTag ? titleTag.textContent.split('|')[0].trim() : null;
}

function injectButtons(name) {
  const container = document.querySelector('body');
  if (!container || document.querySelector('#fragrance-ext-buttons')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'fragrance-ext-buttons';
  wrapper.style.cssText = 'position:fixed;top:100px;right:20px;background:#fff;padding:10px;z-index:10000;border:1px solid #ccc;box-shadow:0 0 6px rgba(0,0,0,0.2);';

  const fragranticaBtn = document.createElement('button');
  fragranticaBtn.textContent = 'View on Fragrantica';
  fragranticaBtn.onclick = () => {
    const url = `https://www.fragrantica.com/search/?q=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Add to List';
  saveBtn.onclick = () => {
    const pageUrl = window.location.href;
    const image = document.querySelector('img')?.src || '';
    const item = { name, url: pageUrl, image };
    chrome.storage.local.get(['wishlist', 'collection'], (data) => {
      const wishlist = data.wishlist || [];
      wishlist.push(item);
      chrome.storage.local.set({ wishlist });
      alert('Added to wishlist!');
    });
  };

  wrapper.appendChild(fragranticaBtn);
  wrapper.appendChild(document.createElement('br'));
  wrapper.appendChild(saveBtn);
  container.appendChild(wrapper);
}

const fragranceName = getFragranceName();
if (fragranceName) injectButtons(fragranceName);
