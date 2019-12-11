import { createMuiTheme } from '@material-ui/core/styles';
import { getStyles } from './lib-style-helpers';

const colors = getStyles(['error', 'primary', 'secondary']);

const theme = createMuiTheme({
    palette: {
        primary: {
            main: colors.primary,
        },
        secondary: {
            main: colors.secondary,
        },
        error: {
            main: colors.error,
        },
    },
});

export default theme;
