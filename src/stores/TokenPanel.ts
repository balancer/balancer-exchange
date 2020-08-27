import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

export default class TokenPanelStore {
    @observable isFocus: boolean;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.isFocus = false;
    }

    @action setFocus(visible: boolean) {
        this.isFocus = visible;
    }

    isFocused(): boolean {
        return this.isFocus;
    }
}
