import IAsset from "./interfaces/asset";
import IToken from "./interfaces/token";

const imgBase = 'https://storage.googleapis.com/zapper-fi-assets/tokens';
const protocolImgBase = 'https://storage.googleapis.com/zapper-fi-assets/apps/';

export enum AssetCategories {
    notUsed = 'notUsed',
    wallet = 'wallet',
    deposit = 'deposit',
    investment = 'investment',
    pool = 'pool',
    staking = 'staking',
    claimable = 'claimable',
    debt = 'debt',
    nft = 'nft',
    other = 'others'
};

const ROOT_ADDRESS = '0x0000000000000000000000000000000000000000';

const emptyBalances = {
    [AssetCategories.notUsed]: 0,
    [AssetCategories.wallet]: 0,
    [AssetCategories.deposit]: 0,
    [AssetCategories.investment]: 0,
    [AssetCategories.pool]: 0,
    [AssetCategories.staking]: 0,
    [AssetCategories.claimable]: 0,
    [AssetCategories.debt]: 0,
    [AssetCategories.nft]: 0,
    [AssetCategories.other]: 0
};

const emptyAssets = JSON.stringify({
    [AssetCategories.notUsed]: {},
    [AssetCategories.wallet]: {},
    [AssetCategories.deposit]: {},
    [AssetCategories.investment]: {},
    [AssetCategories.pool]: {},
    [AssetCategories.staking]: {},
    [AssetCategories.claimable]: {},
    [AssetCategories.debt]: {},
    [AssetCategories.nft]: {},
    [AssetCategories.other]: {}
});

export const supportedBlockExplorers = ['polygon', 'ethereum', 'fantom', 'binance-smart-chain', 'arbitrum']

export const blockExplorers = {
    polygon: {
        apiUrl: 'https://api.polygonscan.com',
        apiKey: process.env.POLYGONSCAN_API_KEY,
        apiKey2: process.env.POLYGONSCAN_API_KEY_JABUN,
        priceAction: 'maticprice'
    },
    "binance-smart-chain": {
        apiUrl: 'https://api.bscscan.com',
        apiKey: process.env.BSCSCAN_API_KEY,
        apiKey2: process.env.BSCSCAN_API_KEY_JABUN,
        priceAction: 'bnbprice'

    },
    ethereum: {
        apiUrl: 'https://api.etherscan.io',
        apiKey: process.env.ETHERSCAN_API_KEY,
        apiKey2: process.env.ETHERSCAN_API_KEY_JABUN,
        priceAction: 'ethprice'
    },
    fantom: {
        apiUrl: 'https://api.ftmscan.com',
        apiKey: process.env.FTMSCAN_API_KEY
    },
    arbitrum: {
        apiUrl: 'https://api.arbiscan.io',
        apiKey: process.env.ARBISCAN_API_KEY
    }

}

export function getAssetCategories(x = 'wallet'): AssetCategories {
    return (<any>AssetCategories)[x];
}

export function getEmptyBalances() {
    return Object.assign({}, emptyBalances);
}

export function getEmptyAssets() {
    // for deeper copy https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
    return Object.assign({}, JSON.parse(emptyAssets));
}

export function isJSON(text: any) {
    if (/^[\],:{}\s]*$/.test(text.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        return true;
    } else {
        return false;
    }
}

export function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function addAsset(assets: any, assetCategory: AssetCategories, asset: IAsset, balances: any, currentNetwork: string, productLabel: string) {
    let key = String(assetCategory);
    let tokens: IToken[] = extractTokens(asset, productLabel);

    if (assets[key].hasOwnProperty(asset.address) || (assets[key].hasOwnProperty(`${asset.symbol}-${asset.network}`) && asset.category === 'wallet')) {
        for (let token of tokens) {
            // make sure MATIC, FTM and ETH don't override each other or are not merged (same address, different net)
            if (asset.address == ROOT_ADDRESS || asset.category === 'wallet') {
                let foundToken = assets[key][`${asset.symbol}-${asset.network}`].find((element: any) => element.symbol == token.symbol);
                foundToken.balance += token.balance;
                balances[key] += token.balance;
            } else {
                let foundToken = assets[key][asset.address].find((element: any) => element.symbol == token.symbol);
                if (foundToken) {
                    foundToken.balance += token.balance;
                    balances[key] += token.balance;
                } else {
                    console.log('[addAsset]: should not happen.');
                }
                assets[key][asset.address].balance += asset.balanceUSD;
            }
        }
    } else {
        if ((asset.type == 'farm' || asset.type == 'claimable') && asset.tokens && asset.tokens.length > 0) {
            for (let token of tokens) {
                token.network = currentNetwork;
                if (token.metaType == 'staking' || token.metaType == 'staked') {
                    assets['staking'][token.address] = [token];
                    balances['staking'] += token.balance;
                } else if (token.metaType == 'claimable' || token.metaType == 'yield') {
                    assets['claimable'][token.address] = [token];
                    balances['claimable'] += token.balance;
                } else {
                    assets['claimable'][token.address] = [token];
                    balances['claimable'] += token.balance;
                }
            }
        } else {
            for (let token of tokens) { token.network = currentNetwork; }
            if (asset.category === 'wallet') {
                assets[key][`${asset.symbol}-${asset.network}`] = tokens;
            } else {
                assets[key][asset.address] = tokens;
            }
            balances[key] += asset.balanceUSD;
        }
    }
}

export function addToken(assets: any, assetCategory: AssetCategories, token: IToken) {
    let key = String(assetCategory);

    if (assets[key].hasOwnProperty(token.address)) {
        assets[key][token.address].balance += token.balanceUSD;
    } else {
        assets[key][token.address] = token;
    }
}

export function extractTokens(asset: IAsset, productLabel: string): IToken[] {
    let tokens: IToken[] = [];
    switch (asset.category) {
        case "debt":
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.appId || '',
                label: asset.label || asset.symbol,
                img: asset.img,
                productLabel: productLabel
            });
            break;

        case "wallet":
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.appId || 'wallet',
                label: asset.label || asset.symbol,
                img: `https://storage.googleapis.com/zapper-fi-assets/tokens/${asset.network}/${asset.address}.png`,
                network: asset.network,
                productLabel: productLabel
            });
            break;

        case "deposit":
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.appId || '',
                label: asset.label || asset.symbol,
                img: `https://storage.googleapis.com/zapper-fi-assets/tokens/${asset.network}/${asset.address}.png`,
                tokens: asset.tokens || [],
                protocolImg: `${protocolImgBase}${asset.appId}.png`,
                productLabel: productLabel
            });
            break;

        case "claimable":
            let claimableAssetTokens = asset.tokens;
            if (claimableAssetTokens && claimableAssetTokens.length > 0) {
                for (let assetToken of claimableAssetTokens) {
                    assetToken.img = extractAssetImg(assetToken, asset.category);
                    tokens.push({
                        address: assetToken.address,
                        symbol: assetToken.symbol,
                        balance: assetToken.balanceUSD,
                        protocol: asset.appId || '',
                        label: assetToken.label || assetToken.symbol,
                        img: assetToken.img,
                        productLabel: productLabel
                    });
                }
            }
            break;

        case "nft":
            // should look into assets for NFT details
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.collectionName || asset.location?.appId || '',
                label: asset.collectionName || asset.symbol,
                img: asset.collectionImg
            });
            break;

        case "investment":
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.location?.appId || '',
                label: asset.label || asset.symbol,
                img: extractAssetImg(asset, asset.category),
                productLabel: productLabel
            });
            break;

        case "pool":
            let poolAssetTokens = asset.tokens;
            if (poolAssetTokens && poolAssetTokens.length > 0) {
                for (let assetToken of poolAssetTokens) {
                    assetToken.img = extractAssetImg(assetToken, asset.category);
                }
            }
            tokens.push({
                address: asset.address,
                symbol: asset.symbol,
                balance: asset.balanceUSD,
                protocol: asset.appId,
                label: asset.label || asset.symbol,
                tokens: asset.tokens,
                productLabel: productLabel
            });
            break;

        case "staking":
            if (asset.type == 'base') {
                tokens.push({
                    address: asset.address,
                    symbol: asset.symbol,
                    balance: asset.balanceUSD,
                    protocol: asset.location?.appId || '',
                    label: asset.label || asset.symbol,
                    img: extractAssetImg(asset, asset.category),
                    productLabel: productLabel
                });
            } else if (asset.type == 'pool') {
                let assetTokens = asset.tokens;
                if (assetTokens && assetTokens.length > 0) {
                    for (let assetToken of assetTokens) {
                        if (assetToken.category == 'pool') {
                            assetToken.img = `${protocolImgBase}${asset.appId}.png`;
                        } else {
                            assetToken.img = extractAssetImg(assetToken, asset.category);
                        }
                    }
                }

                tokens.push({
                    address: asset.address,
                    symbol: asset.symbol,
                    balance: asset.balanceUSD,
                    protocol: asset.location?.appId || '',
                    label: asset.label || asset.symbol,
                    tokens: assetTokens,
                    productLabel: productLabel
                });
            } else if (asset.type == 'farm') {
                let assetTokens = asset.tokens;
                let symbol = '';

                if (asset.symbol) {
                    symbol = asset.symbol
                } else if (assetTokens && assetTokens.length > 0) {
                    symbol = assetTokens[0].symbol;
                }

                if (assetTokens && assetTokens.length > 0) {
                    for (let assetToken of assetTokens) {
                        assetToken.img = `${protocolImgBase}${asset.appId}.png`;
                        assetToken.protocol = asset.appId;
                        assetToken.productLabel = productLabel

                        tokens.push({
                            address: assetToken.address,
                            symbol: assetToken.symbol,
                            metaType: assetToken.metaType,
                            balance: assetToken.balanceUSD,
                            protocol: asset.appId || asset.location?.appId || '',
                            label: assetToken.label || assetToken.symbol || symbol,
                            img: assetToken.img,
                            tokens: assetToken.tokens,
                            productLabel: assetToken.productLabel
                        });
                    }
                }
            }
            break;

        default:
            console.log(`Asset category ${asset.category} not supported`);
            break;
    }
    return tokens;
}

// asset should be IAsset | IToken
export function extractAssetImg(asset: any, assetCategory: string) {
    let img = null;

    if (asset.img && asset.img != '') {
        if (assetCategory != AssetCategories.nft) {
            img = asset.img;
        }
    } else {
        if (assetCategory != AssetCategories.nft) {
            img = `${imgBase}/ethereum/${asset.address}.png`; // network should be dynamic
        }
    }

    return img;
}

export function extractGas(transactions: any, gasContrainer: any) {
    for (let transaction of transactions) {
        gasContrainer[transaction.network] += transaction.gas;
    }
}

export function extractZapperGas(transactions: any){
    let totalGas: number = 0
    transactions.map((transaction: any) => {
        totalGas += transaction.gas
    })
    return totalGas
}

export function extractEtherscanGas(transactions: any) {
    let totalGas: number = 0
    transactions.map((transaction: any) => {
        totalGas += (transaction.gasUsed * (transaction.gasPrice / 1e18))
    })

    return totalGas
}