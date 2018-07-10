
chrome.runtime.onStartup.addListener((event) => {
  console.info('OnStartup');
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

  // 
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
        const wallet = {};
        const currency = data.currency;
  
        for (let coin in data.assets) {
          wallet[coin] = { amount: data.assets[coin] };
        }
        
        // fetch the prices and calculate the totals 
        CryptoList.prices(coins, data.currency).then((data) => {
          for (let coin in data) {
            wallet[coin].value = wallet[coin].amount * data[coin][currency];
            wallet[coin].price = `${data[coin][currency]} ${currency}`;
          }
          chrome.runtime.sendMessage({wallet, currency});
        });
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