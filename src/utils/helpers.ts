import type { PriceHistory, PriceSummary } from '../config/models/currency';
import BigNumber from 'bignumber.js';
import type { ZeroStore } from '../stores/ZeroStore';
import { getSushiToken, SUPPORTED_TOKEN_NAMES } from '../config/constants/tokens';
import { Route as SushiRoute, Fetcher, Pair, Route, Trade, TokenAmount, TradeType } from '@sushiswap/sdk';
import { BaseProvider } from '@ethersproject/providers';

// ============== BTC HELPERS ==============

/* Returns the most recent price and the price that is as close to 6 confirmations away from current price
 * @param confirmationTime = time in minutes that it takes for 6 confirmation
 */
export const fetchBtcPriceHistory = async (confirmationTime: string): Promise<PriceHistory | undefined> => {
	const numConfTime = parseFloat(confirmationTime);
	if (isNaN(numConfTime)) return undefined;
	const oldPriceIndex = Math.ceil(numConfTime / 5) + 1;

	const cgResponse: number[] | null = await fetchData(() =>
		fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=.1&interval=minute'),
	);
	const prices = cgResponse ? cgResponse['prices'] : undefined;

	// Coingecko returns data in oldest -> newest format so we pull data from the end
	return prices
		? {
				currentPrice: new BigNumber(prices[prices.length - 1][1]),
				oldPrice: new BigNumber(prices[prices.length - oldPriceIndex][1]),
		  }
		: undefined;
};

/* Pulls the average block length in minutes and returns the time it takes for 6 confirmations on average
 */
export const fetchBtcConfirmationTime = async (): Promise<string> => {
	const stats: { [key: string]: string } | null = await fetchData(() =>
		fetch(`https://blockchain.info/stats?format=json&cors=true`),
	);

	const blockLengthMinutes = stats ? parseFloat(stats['minutes_between_blocks']) : 60;
	return (blockLengthMinutes * 6).toFixed(1);
};

// ============== SUSHI HELPERS ==============

/* Get the pair data to create routes and return the sushiswap route data
 * from the sushi SDK.
 * @param store = Store data to pull network specific information
 * @param fromName = Name of tokenA in the supported token list
 * @param toName = Name of tokenB in the supported token list
 * @param currency = token name we're denominating the trade in
 */
export const fetchRoute = async (
	store: ZeroStore,
	fromName: SUPPORTED_TOKEN_NAMES,
	toName: SUPPORTED_TOKEN_NAMES,
): Promise<Route | undefined> => {
	const currencyToken = getSushiToken(fromName, store);
	if (!currencyToken || !store.wallet.connectedAddress) return undefined;

	// If we're going from token -> eth, we only need one pair
	if (toName === SUPPORTED_TOKEN_NAMES.ETH) {
		const ethPair = await fetchPair(store, fromName, toName);
		return ethPair ? new SushiRoute([ethPair], currencyToken) : undefined;
	}

	const fromEthPair = await fetchPair(store, fromName, SUPPORTED_TOKEN_NAMES.ETH);
	const ethWantPair = await fetchPair(store, SUPPORTED_TOKEN_NAMES.ETH, toName);
	return fromEthPair && ethWantPair ? new SushiRoute([fromEthPair, ethWantPair], currencyToken) : undefined;
};

/* Get sushi token instances of token names and fetch the pair data from
 * the sushiswap SDK.
 * @param store = Store data to pull network specific information
 * @param fromName = Name of tokenA in the supported token list
 * @param toName = Name of tokenB in the supported token list
 */
export const fetchPair = async (
	store: ZeroStore,
	fromName: SUPPORTED_TOKEN_NAMES,
	toName: SUPPORTED_TOKEN_NAMES,
): Promise<Pair | void> => {
	const fromToken = getSushiToken(fromName, store);
	const toToken = getSushiToken(toName, store);
	if (!fromToken || !toToken || !store.wallet.connectedAddress) return undefined;

	console.log('check:', fromToken, toToken, store.wallet.provider);
	return Fetcher.fetchPairData(fromToken, toToken, store.wallet.provider as BaseProvider);
};

/* Fetches the pair data from sushiswap and calculates current pricing for all supported pairs
 * NOTE: this pricing is not execution price and should only be used for displaying current price.
 * @param store = store instance to get network specific data and sushi tokens
 */
export const fetchPrices = async (store: ZeroStore): Promise<PriceSummary | null> => {
	let prices = {};

	const btc = getSushiToken(SUPPORTED_TOKEN_NAMES.WBTC, store);
	if (!btc) return null;

	for (const token in SUPPORTED_TOKEN_NAMES) {
		const tokenName = SUPPORTED_TOKEN_NAMES[token];
		const route = await fetchRoute(store, SUPPORTED_TOKEN_NAMES.WBTC, tokenName);
		if (!route) break;
		prices[tokenName] = new BigNumber(route.midPrice.toFixed(2));
	}

	return prices;
};

/* Get the correct route for a sushi swap and return the trade object from the SDK
 * @param store = store holding network data
 * @param fromName = name of token we're swapping from
 * @param tokenName = name of token we're swapping to
 * @param amount = BigNumber amount we're swapping from in from token
 */
export const fetchTrade = async (
	store: ZeroStore,
	fromName: SUPPORTED_TOKEN_NAMES,
	toName: SUPPORTED_TOKEN_NAMES,
	amount: BigNumber,
	type: TradeType,
): Promise<Trade | undefined> => {
	const inputToken = type === TradeType.EXACT_INPUT ? getSushiToken(fromName, store) : getSushiToken(toName, store);
	const route = await fetchRoute(store, fromName, toName);
	if (!inputToken || !route) return undefined;
	const trade = new Trade(
		route,
		new TokenAmount(
			inputToken,
			amount
				.multipliedBy(10 ** inputToken.decimals)
				.toFixed(0)
				.toString(),
		),
		type,
	);
	return trade;
};

// ============== ZERO HELPERS ==============

/* Returns a string formatted estimation of the value you'd receive after fees
 * @param store = ZeroStore instance for network specifics
 * @param amount = BigNumber execution price of the swap
 * @param decimals = amount of decimals to format the string to
 * @param noCommas = boolean to flag if the return should be comma formatted
 */
export const valueAfterFees = (
	store: ZeroStore,
	amount: BigNumber,
	currency: SUPPORTED_TOKEN_NAMES,
	decimals = 8,
	noCommas = false,
): string | null => {
	const fees = store.fees.getAllFees(store, amount, currency);
	const finalAmount = amount.minus(fees ?? new BigNumber(0));

	return noCommas
		? finalAmount.toFixed(decimals, BigNumber.ROUND_HALF_FLOOR).toString()
		: numberWithCommas(finalAmount.toFixed(decimals, BigNumber.ROUND_HALF_FLOOR)).toString();
};

/* General purpose fetch that returns a JSON formatted response or null if there's an error
 * @param request = Promise to await
 */
export const fetchData = async <T>(request: () => Promise<Response>): Promise<T | null> => {
	try {
		const response = await request();
		if (!response.ok) {
			return null;
		}
		// purposefully await to use try / catch
		return await response.json();
	} catch (err) {
		console.log('error', err);
		return null;
	}
};

// ============== GENERAL HELPERS ==============

/* Breaks down a provided number and inserts appropriately placed commas to make a number more human readable
 * @param x = string formatted number to modify with commas
 */
export const numberWithCommas = (x: string): string => {
	const parts = x.split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return parts.join('.');
};

/* Takes an input value and the old value and performs type coercion from string to
 * a BigNumber.  If it's not a valid input, returns the old value.
 * @param newValue = String input from an onChange event
 * @param oldValue = Previous value to revert to if an invalid input
 */
export const coerceInputToNumber = (newValue: string, oldValue: string) => {
	// Format to add a leading zero in front of decimals
	if (newValue === '.') newValue = '0.';

	// Format to remove leading zeros
	if (newValue.length >= 2 && newValue[0] === '0' && newValue[1] !== '.') newValue = newValue.substring(1);

	if (newValue === '') {
		return '0';
	}
	if (isNaN(newValue as unknown as number)) {
		return oldValue;
	} else {
		return newValue;
	}
};
