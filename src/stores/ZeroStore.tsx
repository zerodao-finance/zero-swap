import { RouterStore } from 'mobx-router';
import { createContext } from 'react';
import WalletStore from './WalletStore';
import UiStore from './UiStore';
import CurrencyStore from './CurrencyStore';

export class ZeroStore {
	public router: RouterStore<ZeroStore>;
	public wallet: WalletStore;
	public ui: UiStore;
	public currency: CurrencyStore;

	constructor() {
		this.router = new RouterStore<ZeroStore>(this);
		this.wallet = new WalletStore(this);
		this.ui = new UiStore(this);
		this.currency = new CurrencyStore(this);
	}
}

const store = new ZeroStore();

export const StoreContext = createContext({} as ZeroStore);
export const StoreProvider = StoreContext.Provider;

export default store;