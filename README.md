# Balancer Exchange

## Dependencies

-   Install dependencies

    ```
    git submodule update --init --remote
    yarn
    ```

-   Environment Config

    -   Copy .env.example -> .env
    -   Configure backup node urls

    ```
    # Backup node url
    REACT_APP_RPC_URL_1="https://mainnet.infura.io/v3/{apiKey}"
    REACT_APP_RPC_URL_42="https://kovan.infura.io/v3/{apiKey}"
    REACT_APP_RPC_URL_LOCAL="http://localhost:8545"
    ```

-   Build & run locally

    ```
    yarn build
    yarn start
    ```

-   Test Locally (using Cypress)
    ```$xslt
    yarn run cypress open
    ```
