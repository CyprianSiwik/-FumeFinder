const listContainer = document.getElementById('list-container');
const wishlistTab = document.getElementById('wishlist-tab');
const collectionTab = document.getElementById('collection-tab');

let currentTab = 'wishlist';

function renderList(type) {
  chrome.storage.local.get([type], (data) => {
    const items = data[type] || [];
    listContainer.innerHTML = '';
    items.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'item';

      const img = document.createElement('img');
      img.src = item.image;

      const name = document.createElement('div');
      name.textContent = item.name;
      name.className = 'item-name';

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '🗑️';
      removeBtn.onclick = () => {
        items.splice(index, 1);
        chrome.storage.local.set({ [type]: items }, () => renderList(type));
      };

      div.appendChild(img);
      div.appendChild(name);
      div.appendChild(removeBtn);
      listContainer.appendChild(div);
    });
  });
}

wishlistTab.addEventListener('click', () => {
  currentTab = 'wishlist';
  renderList('wishlist');
});

collectionTab.addEventListener('click', () => {
  currentTab = 'collection';
  renderList('collection');
});

renderList(currentTab);
