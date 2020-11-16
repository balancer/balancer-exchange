import { supportedChainId } from '../provider/connectors';

const actionToGoalId = {
    multihopBatchSwapExactIn: 'OAXZQIBH',
    multihopBatchSwapExactOut: 'ZT892CNN',
    approve: 'ST3CSJFO',
};

export function setGoal(action, value = 0) {
    const id = actionToGoalId[action];
    if (window['fathom'] && supportedChainId === 1 && id)
        window['fathom'].trackGoal(id, value);
}

if (supportedChainId === 1) {
    const script = document.createElement('script');
    script.setAttribute('src', 'https://cdn.usefathom.com/script.js');
    script.setAttribute('data-spa', 'auto');
    script.setAttribute('data-site', 'YRAWPOKJ');
    script.setAttribute('honor-dnt', 'true');
    script.setAttribute('defer', '');
    document.head.appendChild(script);
}
