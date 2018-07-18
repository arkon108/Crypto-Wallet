// notify the background page that the popup was opened
chrome.runtime.sendMessage({ popup: "open", show: true });

// listener for messages from background
chrome.runtime.onMessage.addListener((request, sender) => {
    console.info('OnMessage inside popup');
    console.log(request, sender);
  
    if (request.currencies) {
        console.log('got currencies');
        chrome.storage.local.set({ "list-all": request.currencies});
        document.getElementById('add-new').hidden = false;
    }

    if (request.nowallet) {
        setTimeout(() => {
            document.getElementById('loader').hidden = true;
            document.getElementById('intro').hidden = false;
            document.getElementById('dash').hidden = true;
            document.getElementById('btn-options').hidden = false;
        }, 300);        
    }

    if (request.wallet && request.currency) {
        setTimeout(() => {
            document.getElementById('loader').hidden = true;
            document.getElementById('intro').hidden = true;
            document.getElementById('dash').hidden = false;
            document.getElementById('btn-options').hidden = false;
        }, 300);
        
        const table = document.querySelector('#dash table');
        let total = 0;

        table.innerHTML = ''; 
        let row = document.createElement('tr');
        row.innerHTML = '<th width="20%">Crypto</th><th>Amount</th><th>Value</th><th width="30%"><!-- actions --></th>';
        table.appendChild(row);

        request.wallet.forEach(asset => {
            let row = document.createElement('tr');
            row.id = `row-${asset[0]}`;
            row.innerHTML = `
            <td><abbr title="${asset[2]}">${asset[0]}</abbr></td>
            <td>${asset[1].toFixed(8)}</td>
            <td>${(asset[1]*asset[2]).toFixed(2)} ${request.currency}</td>
            <td><button value="row-${asset[0]}-edit">edit</button><button value="${asset[0]}">delete</button></td>`;
            table.appendChild(row);

            // hidden edit row
            row = document.createElement('tr');
            row.id = `row-${asset[0]}-edit`;
            row.hidden = true;
            row.innerHTML = `
            <td><abbr title="${asset[2]}">${asset[0]}</abbr></td>
            <td colspan="2"><input type="text" value="${asset[1]}"></td>
            <td><button value="${asset[0]}">save</button> <button value="row-${asset[0]}">cancel</button></td>`;
            table.appendChild(row);

            total += asset[1]*asset[2];
        });
        
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

document.querySelector("#add-new a").addEventListener('click', event => {
    document.querySelector("#add-new button").click();
    event.stopPropagation();
    event.preventDefault();
});

// table actions (edit/delete) click handler
document.querySelector("#dash table").addEventListener('click', event => {
    console.info('clicked inside the table - on: ');
    console.log(event.target); 

    if (event.target.tagName == "BUTTON") {
        switch(event.target.innerText.toLowerCase()) {
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
    event.stopPropagation();
    console.info('form values');
    const amount = event.target.querySelector('input[type="number"]').value;
    const coin = event.target.querySelector('input[type="text"]').value;
    console.log(amount, coin);
    if (amount.length && coin.length) {
        chrome.runtime.sendMessage({add: {coin, amount}});
        document.querySelector("#add-new button").click();
        document.querySelectorAll('input').forEach(i => i.value = '');
    }
});

// Input search through crypto list
document.getElementById('cryptocurrency').addEventListener('keyup', event => {
    const searchstr = event.target.value.toLowerCase();
    
    if (searchstr.length && searchstr.length >= 3) {
        chrome.storage.local.get('list-all', data => {
            const list = Object.values(data['list-all']).filter(e => {
                return (e.FullName.toLowerCase().search(searchstr) > -1);
            });
            list.sort((a,b) => {
                if (parseInt(a.SortOrder) > parseInt(b.SortOrder)) return 1;
                if (parseInt(a.SortOrder) < parseInt(b.SortOrder)) return -1;
                return 0;
            });

            const container = document.getElementById('list-container');
            const containerContent = list.map(e => `<li data-currency="${ e.Symbol }">${ e.FullName }</li>`);
            container.innerHTML = containerContent.join("");
        }); 
    }
});

document.getElementById('list-container').addEventListener('click', event => {
    if (event.target != event.currentTarget) {
        const coin = event.target.getAttribute('data-currency');
        const amount = document.querySelector('#add-new form input[type="number"]').value;
        console.log(amount, coin);
        if (amount.length && coin.length) {
            chrome.runtime.sendMessage({add: {coin, amount}});
            document.querySelector("#add-new > button").click();
            document.querySelectorAll('input').forEach(i => i.value = '');
            document.getElementById('list-container').innerHTML = '';
        }
        event.stopPropagation();
        event.preventDefault();
    }   
});