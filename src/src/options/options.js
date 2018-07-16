chrome.storage.local.get('currency', (data) => {
    if (!data.currency) {
      data.currency = 'USD';
      chrome.storage.local.set({currency : 'USD'});
    }

    document.getElementById('currency').value = data.currency;
  });

document.getElementById('currency').addEventListener('change', event => {
    chrome.storage.local.set({currency: event.target.value});
});

document.getElementById('close').addEventListener('click', event => window.close());