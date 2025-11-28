import type { Chain } from 'viem';

export const celo: Chain = {
    id: 42220,
    name: 'Celo Mainnet',
    // network: 'celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://forno.celo.org'] },
        public: { http: ['https://forno.celo.org'] },
    },
    blockExplorers: {
        default: { name: 'Celo Explorer', url: 'https://explorer.celo.org' },
    },
    testnet: false,
};

export const celoAlfajores: Chain = {
    id: 44787,
    name: 'Celo Alfajores',
    // network: 'alfajores',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://alfajores-forno.celo-testnet.org'] },
        public: { http: ['https://alfajores-forno.celo-testnet.org'] },
    },
    blockExplorers: {
        default: { name: 'Celo Alfajores Explorer', url: 'https://explorer.celo.org/alfajores' },
    },
    testnet: true,
};

export const celoSepolia: Chain = {
    // Chain id for Celo Sepolia should be provided via env if possible. Fallback to Alfajores id.
    id: Number(process.env.CELO_SEPOLIA_CHAIN_ID) || 11142220,
    name: 'Celo Sepolia Testnet',
    nativeCurrency: { name: 'Celo Sepolia Testnet', symbol: 'CELO', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.CELO_SEPOLIA_RPC || 'https://forno.celo-sepolia.celo-testnet.org'] },
        public: { http: [process.env.CELO_SEPOLIA_RPC || 'https://forno.celo-sepolia.celo-testnet.org'] },
    },
    blockExplorers: {
        default: { name: 'Celo Sepolia Explorer', url: process.env.CELO_SEPOLIA_EXPLORER || 'https://explorer.celo.org' },
    },
    testnet: true,
};

export default { celo, celoAlfajores, celoSepolia };
