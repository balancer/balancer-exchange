// src/contexts/index.tsx
import React from 'react';
import RootStore from 'stores/Root';

export const storesContext = React.createContext({
    root: new RootStore(),
});

export const useStores = () => React.useContext(storesContext);
