import { Contract } from "ethers";
import { TransactionResponse } from "ethers/providers";

interface ActionRequest {
  contract: Contract;
  action: string;
  sender: string;
  data: any[];
}

interface ActionResponse {
  contract: Contract;
  action: string;
  sender:string;
  data: object;
  txResponse: TransactionResponse | undefined,
  error: any | undefined
}

const preLog = (params: ActionRequest) => {
  console.log(`[@action start: ${params.action}]`, {
    contract: params.contract,
    action: params.action,
    sender: params.sender,
    data: params.data
  });
};

const postLog = (result: ActionResponse) => {
  console.log(`[@action end: ${result.action}]`, {
    contract: result.contract,
    action: result.action,
    sender: result.sender,
    data: result.data,
    result: result.txResponse,
    error: result.error
  });
};

export const sendAction = async (params: ActionRequest): Promise<ActionResponse> => {
  const {contract, action, sender, data} = params;
  preLog(params);

  const actionResponse: ActionResponse = {
    contract,
    action,
    sender,
    data,
    txResponse: undefined,
    error: undefined
  };

  try {
    actionResponse.txResponse = await contract[action](...data);
  } catch (e) {
    actionResponse.error = e;
  }

  postLog(actionResponse);
  return actionResponse;
};