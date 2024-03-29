import { createStyles, ListItem, ListItemText, makeStyles, Theme } from '@material-ui/core';
import type { Route } from 'mobx-router';
import React, { useContext } from 'react';
import { StoreContext, Store } from '../../../stores/Store';

const useStyles = makeStyles((theme: Theme) =>
	createStyles({
		listButton: {
			'&:hover': {
				'& $listItemText': {
					textDecoration: 'underline',
					textDecorationColor: theme.palette.secondary.main,
					textDecorationThickness: '3px',
				},
			},
		},
		listItemText: {
			color: theme.palette.text.primary,
			fontWeight: 'bold',
		},
	}),
);

interface SidebarListItemProps {
	title: string;
	view: Route<Store> | undefined;
	url: string | undefined;
	disabled: boolean;
}

export const SidebarListItem = (props: SidebarListItemProps): JSX.Element => {
	const classes = useStyles();
	const { title, view, url, disabled } = props;
	const store = useContext(StoreContext);
	const { goTo } = store.router;
	const { collapsedHeader, toggleSidebar } = store.ui;

	const handleRoute = async (path: Route<Store, any, any> | undefined, url: string | undefined): Promise<void> => {
		if (!collapsedHeader) toggleSidebar();
		if (path) {
			await goTo(path);
		} else {
			window.open(url);
		}
		return;
	};

	return (
		<ListItem
			disabled={disabled}
			button
			className={classes.listButton}
			key={`sidebar-${title}`}
			onClick={() => {
				handleRoute(view, url);
			}}
		>
			<ListItemText key={`text-${title}`} className={classes.listItemText} primary={title} disableTypography />
		</ListItem>
	);
};

export default SidebarListItem;
