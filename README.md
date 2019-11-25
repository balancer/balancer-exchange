# Balancer Exchange

## Dependencies
- Install dependencies
    ```
    git submodule update --init --remote
    yarn
    ```
    
## Setup Environment
- Update docker-compose at ./lib/graph-node/docker/docker-compose.yml. Replace ethereum value with below:
```
ethereum: 'ganache:http://host.docker.internal:8545'
```
- You'll need a local ganache instance running and a metamask-enabled browser. The deploy script is configured to connect to the default Ganache host (localhost:8545). This ganache instance should have a gas limit of 4294967295.

- Ganache-cli parameters
  ```
  ganache-cli -d -l 4294967295 --allowUnlimitedContractSize
  ```
- Install graph dependencies
```
yarn graph:install
```
- Start the local graph-node
```
yarn graph:node
```

Wait until the graph node initializes and is querying blocks from ganache

- In another terminal, run:
```
yarn graph:createlocal
```
- Deploy balancer-subgraph
```
yarn graph
```
- Deploy a set of pools, tokens, and setup environment
```
yarn deploy
```
The GraphiQL interface should be available at: http://localhost:8000/subgraphs/name/balancer-labs/balancer-subgraph/graphql

```
yarn start
```
