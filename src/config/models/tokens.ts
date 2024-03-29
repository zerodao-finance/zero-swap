import BigNumber from 'bignumber.js';
import { action, extendObservable } from 'mobx';
import type { Store } from '../../stores/Store';
import { numberWithCommas } from '../../utils/helpers';

export interface TokenMap {
	[name: string]: Token;
}

export class Token {
	private store!: Store;
	public name: string;
	public symbol: string;
	public address: string;
	public decimals: number;
	public price: BigNumber;

	constructor(store: Store, address: string, name: string, symbol: string, decimals: number, price?: BigNumber) {
		this.store = store;
		this.name = name;
		this.symbol = symbol;
		this.address = address;
		this.decimals = decimals;
		extendObservable(this, {
			price: undefined,
		});
		// Quick reference price stored in sats
		this.price = price ? price : new BigNumber(0);
	}

	setPrice = action((price: BigNumber) => {
		this.price = price;
	});

	/* Returns the amount of Bitcoin needed to receive the amount of wanted tokens
	 * less gas and fees (optional)
	 * @param amount = BigNumber amount of tokens user wants
	 * @param gasCost = Estimation of gas cost for the transaction in wei
	 * @param fees = fees in sats
	 */
	valueIn(amount: BigNumber, decimals = 8, noCommas = false): string | null {
		if (this.price.eq(0)) return null;
		const btcFee = this.store.fees.btcFee.value ?? new BigNumber(0);
		const zeroFee = this.store.fees.zeroFee.scalar
			? new BigNumber(amount.multipliedBy(this.store.fees.zeroFee.scalar))
			: new BigNumber(0);
		const gasFee = this.store.fees.gasFee.value ?? new BigNumber(0);
		const mintFee = this.store.fees.mintFee.scalar
			? new BigNumber(amount.multipliedBy(this.store.fees.mintFee.scalar))
			: new BigNumber(0);
		const totalFees = btcFee.plus(zeroFee).plus(gasFee).plus(mintFee);

		const finalAmount = amount.minus(totalFees).dividedBy(this.price);

		return noCommas
			? finalAmount.toFixed(decimals, BigNumber.ROUND_HALF_FLOOR).toString()
			: numberWithCommas(finalAmount.toFixed(decimals, BigNumber.ROUND_HALF_FLOOR)).toString();
	}
}
