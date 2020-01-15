import React from 'react';
import styled from 'styled-components';

const ErrorTextContainer = styled.div`
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    text-align: center;
    color: var(--error-color);
    margin-top: 6px;
    margin-bottom: 36px;
`

const ErrorDisplay = ({errorText}) => {

	return(
		<ErrorTextContainer>
			{errorText}
		</ErrorTextContainer>
	)
}

export default ErrorDisplay