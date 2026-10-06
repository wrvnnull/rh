import { defineChain } from 'viem';
export const robinhoodTestnet=defineChain({id:46630,name:'Robinhood Chain Testnet',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:['https://robinhood-sepolia-rpc.publicnode.com']}},blockExplorers:{default:{name:'Robinhood Explorer',url:'https://explorer.testnet.chain.robinhood.com'}}});
export const CONTRACTS={factory:'0x533cE670f1372cb402D49866608b92e7bc2b4493' as `0x${string}`,multicall3:'0xcA11bde05977b3631167028862bE2a173976CA11' as `0x${string}`};
export const DEPLOY_BLOCK=129157568;
export const CHUNK=50000;
