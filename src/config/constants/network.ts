import type { NetworkConstants } from '../models/network';
import { ChainId } from '@sushiswap/sdk';

export const APP_NAME = 'Zero Swap';
export const CONTACT_EMAIL = 'mitch@zerodao.com';
export const PORTIS_APP_ID = '72ef7613-7d8d-407e-88eb-b6afb998c990';

export enum NETWORK_LIST {
	BSC = 'bsc',
	ETH = 'eth',
	MATIC = 'matic',
}

export enum NETWORK_IDS {
	ETH = ChainId.MAINNET,
	BSC = ChainId.BSC,
	MATIC = ChainId.MATIC,
	FTM = ChainId.FANTOM,
	XDAI = ChainId.XDAI,
}

export const NETWORK_CONSTANTS: NetworkConstants = {
	[NETWORK_LIST.ETH]: {
		APP_URL: 'https://mainnet.0confirmation.com/',
		RPC_URL: 'https://mainnet.infura.io/v3/2f1de898efb74331bf933d3ac469b98d',
		REN_GATEWAY_ADDRESS: '0xe4b679400F0f267212D5D812B95f58C83243EE71',
	},
};
