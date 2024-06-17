import * as readline from 'node:readline/promises'
import { exit, stdin as input, stdout as output } from 'node:process';
import fs from 'fs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiKit } from '@scallop-io/sui-kit';
// import '@scallop-io/sui-kit'
import delay from 'delay'

var hijau = '\x1b[32m';
var merah = '\x1b[31m';
var putih = '\x1b[37m';
var kuning = '\x1b[33m'
var reset = '\x1b[m'
var magenta = '\x1b[35m'
var biru = '\x1b[34m'
const SUI_CA = '0x2::sui::SUI'
const OCEAN_CA = '0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN'
const line = `${putih}~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`

function read_mnemonic_file() {
    var _mnemonic = fs.readFileSync('./mnemonic.txt', 'utf-8')
    var _split_mnemonic = _mnemonic.split('\n')
    var list_mnemonic = []

    for (var m of _split_mnemonic) {
        if (m.length <= 0) {
            continue
        }

        if (m.match('\r')) {
            m = m.replace('\r', '')
        }

        list_mnemonic.push(m)

    }
    return list_mnemonic;
}

const gettimeclaim = (address) => new Promise((resolve, reject) => {
    fetch('https://fullnode.mainnet.sui.io/', {
        method: 'POST',
        headers: {
            'accept': '*/*',
            'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8',
            'client-sdk-type': 'typescript',
            'client-sdk-version': '0.51.0',
            'client-target-api-version': '1.21.0',
            'content-type': 'application/json',
            'origin': 'https://walletapp.waveonsui.com',
            'priority': 'u=1, i',
            'referer': 'https://walletapp.waveonsui.com/',
            'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99", "Microsoft Edge WebView2";v="124"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
        },
        body: JSON.stringify({
            'jsonrpc': '2.0',
            'id': 45,
            'method': 'suix_getDynamicFieldObject',
            'params': [
                '0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a',
                {
                    'type': 'address',
                    'value': address
                }
            ]
        })
    }).then(res => res.json())
        .then(res => {
            resolve(res)
        })
        .catch(err => reject(err));
});

function divmod(a, b) {
    const quotient = Math.floor(a / b);
    const remainder = a % b;
    return [quotient, remainder];
}

function watch_format(data) {
    let [minutes, seconds] = divmod(data, 60);
    let [hours, mins] = divmod(minutes, 60);
    hours = String(hours).padStart(2, '0');
    mins = String(mins).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');
    return `${hours}:${mins}:${seconds}`
}

const countdown = async (t) => {
    var timer = t;
    while (true) {
        if (timer > 0) {
            let [minutes, seconds] = divmod(timer, 60);
            let [hours, mins] = divmod(minutes, 60);
            hours = String(hours).padStart(2, '0');
            mins = String(mins).padStart(2, '0');
            seconds = String(seconds).padStart(2, '0');
            process.stdout.write(`waiting until ${hours}:${mins}:${seconds} \r`);
            timer -= 1;
            await delay(1000)

        } else {
            process.stdout.write('                         \r');
            break
        }
    }
}

const claim = async (mnemonic) => {
    const sui_client = new SuiKit({ mnemonics: mnemonic })
    const sui_balance = (await sui_client.getBalance(SUI_CA)).totalBalance / 1000000000
    const ocean_balance = (await sui_client.getBalance(OCEAN_CA)).totalBalance / 1000000000
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const address = keypair.getPublicKey().toSuiAddress();
    const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
    console.log(`${hijau}mnemonic : ${putih}${mnemonic}`)
    console.log(`${hijau}address : ${putih}${address}`)
    console.log(`${hijau}SUI balance : ${putih}${sui_balance}`)
    console.log(`${hijau}OCean balance : ${putih}${ocean_balance}`)
    try {
        let waktu
        waktu = await gettimeclaim(address);
        waktu = waktu.result.data;
        if (waktu == undefined) {
            console.log(`${merah}failed fetch last claim,${kuning} maybe becasue not claimed first claim !`)
            return 10800
        }
        waktu = waktu.content.fields.last_claim
        var last_claim = waktu.toString();
        var time = Date.now().toString();
        var perclaim = 2 * 3600 * 1000
        var waktu_berlalu = time - last_claim
        var next_claim = Math.ceil((perclaim - waktu_berlalu) / 1000);
        var time_format = watch_format(Math.ceil((perclaim - waktu_berlalu) / 1000));
        if (next_claim > 0) {
            console.log(`${magenta}${address} ${putih}| ${merah}not time to claim, ${kuning}next claim in ${time_format}${reset}`);
            return next_claim
        }
        // exit()
        const packageObjectId = '0x1efaf509c9b7e986ee724596f526a22b474b15c376136772c00b8452f204d2d1';
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${packageObjectId}::game::claim`,
            arguments: [tx.object("0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a"),
            tx.pure('0x0000000000000000000000000000000000000000000000000000000000000006'),
            ],
        });
        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
        });
        const txsk = { result }
        console.log(`${hijau}claim successfully ! `);
        return (2 * 3600) + 60
    } catch (error) {
        console.log(error);
        return 2 * 3600
    }
}

(async () => {
    const rl = readline.createInterface({ input, output })
    const menu = `
    1.) Kirim SUI ke Akun tuyul (file mnemonic.txt)
    2.) Kirim OCEAN ke Akun Utama
    3.) Check Balance SUI
    4.) Check Balance OCEAN
    5.) Start Auto Claim OCEAN
    `
    console.log(menu)
    const option = await rl.question('[?] input nomor : ')
    var list_mnemonic = read_mnemonic_file()
    if (option == '1') {
        console.log('')
        var main_mnemonic = fs.readFileSync('./main_mnemonic.txt', 'utf-8')
        var _config = fs.readFileSync('./config.json', 'utf-8')
        var config = JSON.parse(_config)
        var sui_amount_to_send = config.sui_amount_to_send
        const main_client = new SuiKit({ mnemonics: main_mnemonic })
        const main_address = main_client.getAddress()
        const main_balance = (await main_client.getBalance(SUI_CA)).totalBalance / 1000000000
        console.log(`${hijau}main wallet address : ${putih}${main_address}`)
        console.log(`${hijau}main sui balance : ${putih}${main_balance}`)
        console.log(line)
        var st = 1
        for (var meme of list_mnemonic) {
            if (meme == main_mnemonic) {
                continue
            }
            console.log(`${hijau}mnemonic nomor [${biru}${st}${hijau}/${biru}${list_mnemonic.length}${hijau}]`)
            var recv_client = new SuiKit({ mnemonics: meme })
            var recv_address = recv_client.getAddress()
            console.log(`${hijau}receiver address : ${putih}${recv_address}`)
            var result = main_client.transferSui(recv_address, sui_amount_to_send)
            console.log(`${hijau}sending SUI ${sui_amount_to_send}`)
            console.log(line)
            st += 1
        }
        exit()
    }
    if (option == '2') {
        console.log('')
        var main_mnemonic = fs.readFileSync('./main_mnemonic.txt', 'utf-8')
        var _config = fs.readFileSync('./config.json', 'utf-8')
        const main_client = new SuiKit({ mnemonics: main_mnemonic })
        const main_address = main_client.getAddress()
        const main_balance = (await main_client.getBalance(SUI_CA)).totalBalance / 1000000000
        console.log(`${hijau}main wallet address : ${putih}${main_address}`)
        console.log(`${hijau}main sui balance : ${putih}${main_balance}`)
        console.log(line)
        var st = 1
        for (var meme of list_mnemonic) {
            if (meme == main_mnemonic) {
                continue
            }
            console.log(`${hijau}mnemonic nomor [${biru}${st}${hijau}/${biru}${list_mnemonic.length}${hijau}]`)
            var recv_client = new SuiKit({ mnemonics: meme })
            var recv_address = recv_client.getAddress()
            var recv_balance = (await recv_client.getBalance(OCEAN_CA)).totalBalance
            console.log(`${hijau}balance : ${putih}${recv_balance / 1000000000}`)
            // console.log(`${hijau}receiver address : ${putih}${recv_address}`)
            var result = recv_client.transferCoin(main_address, recv_balance, OCEAN_CA)
            console.log(`${hijau}sending ${recv_balance / 1000000000} OCEAN`)
            console.log(line)
            st += 1
        }
        exit()
    }

    if (option == '3') {
        var st = 1
        for (var meme of list_mnemonic) {
            console.log(`${hijau}mnemonic nomor [${biru}${st}${hijau}/${biru}${list_mnemonic.length}${hijau}]`)
            var recv_client = new SuiKit({ mnemonics: meme })
            var recv_address = recv_client.getAddress()
            var recv_balance = (await recv_client.getBalance(SUI_CA)).totalBalance / 1000000000
            console.log(`${hijau}address : ${putih}${recv_address}`)
            console.log(`${hijau}balance : ${recv_balance} SUI`)
            console.log(line)
            st += 1
        }
        exit()
    }
    if (option == '4') {
        var st = 1
        for (var meme of list_mnemonic) {
            console.log(`${hijau}mnemonic nomor [${biru}${st}${hijau}/${biru}${list_mnemonic.length}${hijau}]`)
            var recv_client = new SuiKit({ mnemonics: meme })
            var recv_address = recv_client.getAddress()
            var recv_balance = (await recv_client.getBalance(OCEAN_CA)).totalBalance / 1000000000
            console.log(`${hijau}address : ${putih}${recv_address}`)
            console.log(`${hijau}balance : ${putih}${recv_balance} OCEAN`)
            console.log(line)
            st += 1
        }
        exit()
    }
    if (option == '5') {
        while (true) {
            var list_countdown = []
            var st = 1
            for (var meme of list_mnemonic) {
                console.log(`${hijau}mnemonic nomor [${biru}${st}${hijau}/${biru}${list_mnemonic.length}${hijau}]`)
                var result = await claim(meme)
                list_countdown.push(result)
                await delay(3000)
                st += 1
            }
            var minimum = Math.min(...list_waiting_time)
            await countdown(parseInt(minimum))
            continue
        }
    }

})();