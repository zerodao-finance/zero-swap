import React, { useContext } from 'react';
import { Button } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { observer } from 'mobx-react-lite';
import { StoreContext, Store } from '../../stores/Store';
import { connectWallet, shortenAddress } from '../../utils/helpers';

const useStyles = makeStyles((theme: Theme) => ({
	root: {
		padding: theme.spacing(0),
		width: '100%',
	},
	select: {
		height: '2.1rem',
		fontSize: '.9rem',
		overflow: 'hidden',
		marginRight: theme.spacing(1),
		minWidth: '93px',
	},
	walletButton: {
		'&:hover': {
			opacity: '0.8',
		},
		color: '#FFFFFF',
		backgroundColor: theme.palette.secondary.main,
		opacity: '0.90',
		maxHeight: '2rem',
		marginTop: 'auto',
		marginBottom: 'auto',
		[theme.breakpoints.down('sm')]: {
			width: '100%',
		},
	},
}));

interface Props {}

export const connect = async (store: Store) => {
	const { onboard, connect } = store.wallet;
	if (!onboard) return;
	else {
		connectWallet(onboard, connect);
	}
};

const WalletButton: React.FC<Props> = observer(() => {
	const classes = useStyles();
	const store = useContext(StoreContext);
	const { connectedAddress } = store.wallet;

	return (
		<Button
			disableElevation
			variant="contained"
			color="secondary"
			className={classes.walletButton}
			onClick={() => {
				if (!connectedAddress) connect(store);
				else store.wallet.disconnect();
			}}
		>
			{!!connectedAddress ? shortenAddress(connectedAddress, 7) : 'CONNECT'}
		</Button>
	);
});

export default WalletButton;
