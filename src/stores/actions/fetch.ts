import { TokenBalance, UserAllowance } from '../Token';
import { TokenPairData } from '../Pool';

export enum AsyncStatus {
    SUCCESS,
    STALE,
    TIMEOUT,
    FAILURE,
}

export interface TokenBalanceFetchRequest {
    chainId: number;
    tokenAddress: string;
    account: string;
    fetchBlock: number;
}

export class TokenBalanceFetch {
    status: AsyncStatus;
    request: TokenBalanceFetchRequest;
    payload: TokenBalance | undefined;

    constructor({ status, request, payload }) {
        this.status = status;
        this.request = request;
        this.payload = payload;
    }
}

export interface UserAllowanceFetchRequest {
    chainId: number;
    tokenAddress: string;
    owner: string;
    spender: string;
    fetchBlock: number;
}

export class UserAllowanceFetch {
    status: AsyncStatus;
    request: UserAllowanceFetchRequest;
    payload: UserAllowance | undefined;

    constructor({ status, request, payload }) {
        this.status = status;
        this.request = request;
        this.payload = payload;
    }
}

export interface TokenPairsFetchRequest {
    chainId: number;
    tokenAddress: string;
    fetchBlock: number;
}

export class TokenPairsFetch {
    status: AsyncStatus;
    request: TokenPairsFetchRequest;
    payload: TokenPairData | undefined;

    constructor({ status, request, payload }) {
        this.status = status;
        this.request = request;
        this.payload = payload;
    }
}
