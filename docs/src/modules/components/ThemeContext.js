import React from 'react';
import PropTypes from 'prop-types';
import { ThemeProvider as MuiThemeProvider } from '@material-ui/styles';
import { createMuiTheme, darken } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { blue, pink } from '@material-ui/core/colors';
import { getCookie } from 'docs/src/modules/utils/helpers';
import { darkTheme, setPrismTheme } from './prism';
import deepmerge from 'deepmerge';

export const themeColor = blue[700];

const themeInitialOptions = {
  dense: false,
  direction: 'ltr',
  paletteColors: {},
  spacing: 8, // spacing unit
};

/**
 * @typedef {import('@material-ui/core/src/styles/createMuiTheme').ThemeOptions} ThemeOptions
 *
 *
 * @param {ThemeOptions} themeOptions
 * @returns {ThemeOptions}
 */
function usingHighDensity(themeOptions) {
  return deepmerge(themeOptions, {
    props: {
      MuiButton: {
        size: 'small',
      },
      MuiFilledInput: {
        margin: 'dense',
      },
      MuiFormControl: {
        margin: 'dense',
      },
      MuiFormHelperText: {
        margin: 'dense',
      },
      MuiIconButton: {
        size: 'small',
      },
      MuiInputBase: {
        margin: 'dense',
      },
      MuiInputLabel: {
        margin: 'dense',
      },
      MuiListItem: {
        dense: true,
      },
      MuiOutlinedInput: {
        margin: 'dense',
      },
      MuiFab: {
        size: 'small',
      },
      MuiTable: {
        size: 'small',
      },
      MuiTextField: {
        margin: 'dense',
      },
      MuiToolbar: {
        variant: 'dense',
      },
    },
    overrides: {
      MuiIconButton: {
        sizeSmall: {
          // minimal touch target hit spacing
          marginLeft: 4,
          marginRight: 4,
          padding: 12,
        },
      },
    },
  });
}

function usingIdentity(themeOptions) {
  return themeOptions;
}

export const DispatchContext = React.createContext(() => {
  throw new Error('Forgot to wrap component in ThemeContext.Provider');
});

const useEnhancedEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function ThemeProvider(props) {
  const { children } = props;

  const [themeOptions, dispatch] = React.useReducer((state, action) => {
    switch (action.type) {
      case 'SET_SPACING':
        return {
          ...state,
          spacing: action.payload,
        };
      case 'INCREASE_SPACING': {
        return {
          ...state,
          spacing: state.spacing + 1,
        };
      }
      case 'DECREASE_SPACING': {
        return {
          ...state,
          spacing: state.spacing - 1,
        };
      }
      case 'SET_DENSE':
        return {
          ...state,
          dense: action.payload,
        };
      case 'RESET_DENSITY':
        return {
          ...state,
          dense: themeInitialOptions.dense,
          spacing: themeInitialOptions.spacing,
        };
      case 'CHANGE':
        return {
          ...state,
          paletteType: action.payload.paletteType || state.paletteType,
          direction: action.payload.direction || state.direction,
          paletteColors: action.payload.paletteColors || state.paletteColors,
        };
      default:
        throw new Error(`Unrecognized type ${action.type}`);
    }
  }, themeInitialOptions);

  const prefersDarkMode = useMediaQuery('@media (prefers-color-scheme: dark)');
  const preferredType = prefersDarkMode ? 'dark' : 'light';
  const { dense, direction, paletteColors, paletteType = preferredType, spacing } = themeOptions;

  React.useEffect(() => {
    setPrismTheme(darkTheme);
  }, []);

  React.useEffect(() => {
    if (process.browser) {
      const nextPaletteColors = JSON.parse(getCookie('paletteColors') || 'null');
      const nextPaletteType = getCookie('paletteType');

      dispatch({
        type: 'CHANGE',
        payload: { paletteColors: nextPaletteColors, paletteType: nextPaletteType },
      });
    }
  }, []);

  // persist paletteType
  React.useEffect(() => {
    document.cookie = `paletteType=${paletteType};path=/;max-age=31536000`;
  }, [paletteType]);

  useEnhancedEffect(() => {
    document.body.dir = direction;
  }, [direction]);

  const theme = React.useMemo(() => {
    const themeDecorator = dense ? usingHighDensity : usingIdentity;
    const nextTheme = createMuiTheme(
      themeDecorator({
        direction,
        nprogress: {
          color: paletteType === 'light' ? '#000' : '#fff',
        },
        palette: {
          primary: {
            main: paletteType === 'light' ? blue[700] : blue[200],
          },
          secondary: {
            main: paletteType === 'light' ? darken(pink.A400, 0.1) : pink[200],
          },
          type: paletteType,
          background: {
            default: paletteType === 'light' ? '#fff' : '#121212',
          },
          ...paletteColors,
        },
        spacing,
      }),
    );

    nextTheme.palette.background.level2 =
      paletteType === 'light' ? nextTheme.palette.grey[100] : '#333';

    nextTheme.palette.background.level1 =
      paletteType === 'light' ? '#fff' : nextTheme.palette.grey[900];

    return nextTheme;
  }, [dense, direction, paletteColors, paletteType, spacing]);

  React.useEffect(() => {
    // Expose the theme as a global variable so people can play with it.
    if (process.browser) {
      window.theme = theme;
    }
  }, [theme]);

  return (
    <MuiThemeProvider theme={theme}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </MuiThemeProvider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node,
};

/**
 * @returns {(nextOptions: Partial<typeof themeInitialOptions>) => void}
 */
export function useChangeTheme() {
  const dispatch = React.useContext(DispatchContext);
  return React.useCallback(options => dispatch({ type: 'CHANGE', payload: options }), [dispatch]);
}
