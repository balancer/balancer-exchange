import * as ethers from 'ethers';

class UncheckedJsonRpcSigner extends ethers.Signer {
    signer: any;

    constructor(signer) {
        super();
        ethers.utils.defineReadOnly(this, 'signer', signer);
        ethers.utils.defineReadOnly(this, 'provider', signer.provider);
    }

    getAddress() {
        return this.signer.getAddress();
    }

    sendTransaction(transaction) {
        return this.signer.sendUncheckedTransaction(transaction).then(hash => {
            return {
                hash: hash,
                nonce: null,
                gasLimit: null,
                gasPrice: null,
                data: null,
                value: null,
                chainId: null,
                confirmations: 0,
                from: null,
                wait: confirmations => {
                    return this.signer.provider.waitForTransaction(
                        hash,
                        confirmations
                    );
                },
            };
        });
    }

    signMessage(message) {
        return this.signer.signMessage(message);
    }
}

export default UncheckedJsonRpcSigner;
