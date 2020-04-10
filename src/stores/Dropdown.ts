import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

export default class DropdownStore {
    @observable walletDropdownVisible: boolean;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.walletDropdownVisible = false;
    }

    @action toggleWalletDropdown() {
        this.walletDropdownVisible = !this.walletDropdownVisible;
    }

    @action setWalletDropdownVisible(visible: boolean) {
        this.walletDropdownVisible = visible;
    }
}
