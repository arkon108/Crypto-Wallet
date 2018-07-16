// notify the background page that the popup was opened
chrome.runtime.sendMessage({ popup: "open", show: true });

// listener for messages from background
chrome.runtime.onMessage.addListener((request, sender) => {
    console.info('OnMessage inside background');
    console.log(request, sender);
  
    if (request.currencies) {

        let currencies = [];
        for (let currency in request.currencies) {
            currencies.push(request.currencies[currency].Symbol);
        }

        currencies.sort((a,b) => {
            if (a < b) return -1;
            else if (b > a) return 1;
            return 0;
        });

        let cryptos = document.getElementById('cryptolist');
        
        currencies.forEach(currency => {
            let option = document.createElement('option');
            option.value = currency;
            option.innerText = request.currencies[currency].FullName;
            cryptos.appendChild(option);            
        });
    }

    if (request.nowallet) {
        setTimeout(() => {
            document.getElementById('loader').hidden = true;
            document.getElementById('intro').hidden = false;
            document.getElementById('dash').hidden = true;
            document.getElementById('add-new').hidden = false;
            document.getElementById('btn-options').hidden = false;
        }, 300);        
    }

    if (request.wallet && request.currency) {
        setTimeout(() => {
            document.getElementById('loader').hidden = true;
            document.getElementById('intro').hidden = true;
            document.getElementById('dash').hidden = false;
            document.getElementById('add-new').hidden = false;
            document.getElementById('btn-options').hidden = false;
        }, 300);
        

        const table = document.querySelector('#dash table');
        let row, total = 0;

        table.innerHTML = ''; 
        row = document.createElement('tr');
        row.innerHTML = "<th>Crypto</th><th>Amount</th><th>Worth</th><th><!-- actions --></th>";
        table.appendChild(row);

        for (let asset in request.wallet) {
            row = document.createElement('tr');
            row.id = `row-${asset}`;
            row.innerHTML = `
            <td><abbr title="${request.wallet[asset].price}">${asset}</abbr></td>
            <td>${request.wallet[asset].amount}</td>
            <td>${request.wallet[asset].value.toFixed(2)} ${request.currency}</td>
            <td><button value="row-${asset}-edit">edit</button><button value="${asset}">delete</button></td>`;
            table.appendChild(row);

            // hidden edit row
            row = document.createElement('tr');
            row.id = `row-${asset}-edit`;
            row.hidden = true;
            row.innerHTML = `
            <td><abbr title="${request.wallet[asset].price}">${asset}</abbr></td>
            <td colspan="2"><input type="text" value="${request.wallet[asset].amount}"></td>
            <td><button value="${asset}">save</button> <button value="row-${asset}">cancel</button></td>
            `;
            table.appendChild(row);

            total += request.wallet[asset].value;
        }
        document.querySelector('#dash h1').innerText = `${total.toFixed(2)} ${request.currency}`;
    }
    
  });

// add new asset show/hide handler
document.querySelector("#add-new button").addEventListener('click', event => {
    const form = document.querySelector("#add-new form");

    if (form.hidden) {
        form.hidden = false;
        event.target.innerText = "-";
    } else {
        form.hidden = true;
        event.target.innerText = "+";
    }
    event.stopPropagation();
});

// table actions (edit/delete) click handler
document.querySelector("#dash table").addEventListener('click', event => {
    console.info('clicked inside the table - on: ');
    console.log(event.target); 

    if (event.target.tagName == "BUTTON") {
        switch(event.target.innerText) {
            case 'edit':
                console.info('clicked the edit button');
                console.log(event.target.value);
                document.getElementById(event.target.value).hidden = false;
                event.target.parentNode.parentNode.hidden = true;
                break;

            case 'save':
                let amount = event.target.parentNode.parentNode.querySelector('input').value;
                let coin   = event.target.value;
                console.info('Clicked save');
                console.log(`Amount: ${amount}, Coin: ${coin}`);
                if (amount.length && coin.length) {
                    chrome.runtime.sendMessage({add: {coin, amount}});
                    event.target.parentNode.parentNode.hidden = true;
                    document.getElementById(`row-${event.target.value}`).hidden = false;
                }
                break;

            case 'cancel':
                event.target.parentNode.parentNode.hidden = true;
                document.getElementById(event.target.value).hidden = false;
                break;
    
            case 'delete':
                chrome.runtime.sendMessage({remove: event.target.value});
                break;
    
            default:
                // no action
        }
        event.stopPropagation();
    }
});

// Save a new coin form handler
document.querySelector("#add-new form").addEventListener('submit', event => {
    event.preventDefault();
    console.info('form values');
    let amount = event.target.querySelector('input[type="number"]').value;
    let coin = event.target.querySelector('input[type="text"]').value;
    console.log(amount, coin);
    if (amount.length && coin.length) {
        chrome.runtime.sendMessage({add: {coin, amount}});
        document.querySelector("#add-new button").click();
        document.querySelectorAll('input').forEach(i => i.value = '');
    }
});
