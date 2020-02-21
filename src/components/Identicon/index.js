import React, { useEffect, useRef } from 'react';

import styled from 'styled-components';

import Jazzicon from 'jazzicon';
import { useStores } from '../../contexts/storesContext';
import { useActiveWeb3React } from 'provider/providerHooks';

const StyledIdenticon = styled.div`
    height: 1rem;
    width: 1rem;
    border-radius: 1.125rem;
    background-color: ${({ theme }) => theme.silverGray};
`;

export default function Identicon() {
    const ref = useRef();

    const {
        root: { providerStore },
    } = useStores();
    const { account } = useActiveWeb3React();

    useEffect(() => {
        if (account && ref.current) {
            ref.current.innerHTML = '';
            ref.current.appendChild(
                Jazzicon(16, parseInt(account.slice(2, 10), 16))
            );
        }
    });

    return <StyledIdenticon ref={ref} />;
}
