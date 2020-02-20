import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

export default class ModalStore {
    @observable walletModalVisible: boolean;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.walletModalVisible = false;
    }

    @action toggleWalletModal() {
        this.walletModalVisible = !this.walletModalVisible;
    }

    @action setWalletModalVisible(visible: boolean) {
        this.walletModalVisible = visible;
    }
}
