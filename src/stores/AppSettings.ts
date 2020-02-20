import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

export default class AppSettingsStore {
    @observable darkMode: boolean;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.darkMode = false;
    }

    @action toggleDarkMode() {
        this.darkMode = !this.darkMode;
    }

    @action setDarkMode(visible: boolean) {
        this.darkMode = visible;
    }
}
