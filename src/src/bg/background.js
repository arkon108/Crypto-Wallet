
chrome.runtime.onInstalled.addListener((event) => {
  console.info('OnInstalled');
  console.log(event);

  // if there are no currency for showing prices, default to USD
  chrome.storage.local.get('currency', (data) => {
    if (!data.currency) {
      chrome.storage.local.set({currency : 'USD'});
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender) => {
  console.info('OnMessage');
  console.log(request, sender);

  // store the new coin added
  if (request.add) {
    const { coin, amount } = request.add;
    Wallet.add(coin, amount);
  }
  
  if (request.remove) {
    Wallet.remove(request.remove);
  }

  // get the full list of cryptocurrencies every time the popup is opened
  // so the latest list is always available for adding new assets
  if (request.popup && request.popup === "open") {
    CryptoList.all().then((response) => {
      chrome.runtime.sendMessage({currencies: response.Data});
    });
  }

  // show the asset list, this can happen on popup, or when a coin gets added/edited/removed
  if (request.show) {
    Wallet.show();
  }
});

class Wallet {

  static add(coin, amount) {
    const that = this;
    chrome.storage.local.get('assets', data => {
      data.assets = data.assets || {}; 
      data.assets[coin] = parseFloat(amount);
      chrome.storage.local.set({ assets: data.assets }, () => that.show());
    });
  }

  static remove(coin) {
    const that = this;
    chrome.storage.local.get('assets', data => {
      delete data.assets[coin];
      chrome.storage.local.set({assets: data.assets}, () => that.show());
    });
  }

  static show() {
    // decide whether to show the intro page or dashboard by loading stored assets
    chrome.storage.local.get(['assets', 'currency'], (data) => {
      if (data.assets) {
  
        // fetch the prices for stored assets
        let coins = Object.keys(data.assets);
        let wallet = [];
        const currency = data.currency;
        const assets = data.assets;
  
        // fetch the prices and calculate the totals 
        CryptoList.prices(coins, data.currency).then((data) => {
          
          for (let coin in data) {
            wallet.push([coin, assets[coin], data[coin][currency]]);
          }
          wallet.sort((first, next) => {
            if (first[1]*first[2] > next[1]*next[2]) return -1;
            if (next[1]*next[2] > first[1]*first[2]) return 1;
            return 0;
          });
          chrome.runtime.sendMessage({currency, wallet});
        });
      } else {
        chrome.runtime.sendMessage({nowallet: true});
      }
    });
  }
}

class CryptoList {

  // TODO - error handling 
  static prices(coins = [], priceIn = 'USD') {
    let fsyms = coins.join(',').toUpperCase();
    let tsyms = priceIn.toUpperCase();
    return fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=${tsyms}`)
    .then(response => response.json());
  }

  // TODO - error handling
  static price(coin = '', priceIn = []) {
    let tsyms = priceIn.join(',').toUpperCase();
    let fsym = coin.toUpperCase();
    return fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fsym}&tsyms=${tsyms}`)
    .then(response => response.json());
  }

  static all() {
    return fetch('https://min-api.cryptocompare.com/data/all/coinlist')
    .then(response => response.json());
  }
}