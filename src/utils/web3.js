// Libraries
import Web3 from 'web3';

class Web3Extended extends Web3 {
    stop = () => {
        // this.reset(true);
        if (
            this.currentProvider &&
            typeof this.currentProvider.stop === 'function'
        ) {
            this.currentProvider.stop();
        }
    };

    bindProvider = provider => {
        this.setProvider(provider);
    };

    setWebClientProvider = () => {
        this.stop();
        return new Promise(async (resolve, reject) => {
            try {
                // Checking if the the provider is compliant with the new EIP1102 Standard.
                if (window.ethereum) {
                    //following the new EIP1102 standard
                    window.ethereum.enable().then(
                        () => {
                            this.bindProvider(window.ethereum);
                            resolve();
                        },
                        () => {
                            reject();
                        }
                    );

                    return;
                }

                if (window.web3) {
                    // This is the case for Provider Injectors which don't follow EIP1102 ( parity-extension ? )
                    this.bindProvider(window.web3.currentProvider);
                    resolve();

                    return;
                }

                reject();
            } catch (e) {
                reject(e);
            }
        });
    };
}

const web3 = new Web3Extended();
//TODO: What was this for?
// web3.utils.BN.config({ EXPONENTIAL_AT: [-18, 21] });
window.web3Provider = web3;

export default web3;
