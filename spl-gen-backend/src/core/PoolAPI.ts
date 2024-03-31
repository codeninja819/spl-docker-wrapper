import { txCreateAndInitNewPool, getPoolKeys } from "./pool";
import { ammRemoveLiquidity } from "./sell_and_remove_lp/removeLP";
import { NewPoolRequest, FetchPoolKeysRequest } from "./types/core";
import { Connection } from "@solana/web3.js";
if (!process.env.RPC_URL) {
  throw new Error("RPC_URL is not defined");
}
export class PoolAPI {
  connection: Connection;
  constructor() {
    this.connection = new Connection(
      process.env.RPC_URL as string,
      "confirmed"
    );
  }
  async createAndInitNewPool(newPoolRequest: NewPoolRequest) {
    return await txCreateAndInitNewPool(this.connection, newPoolRequest);
  }

  async getPoolKeys(poolKeysRequest: FetchPoolKeysRequest) {
    return await getPoolKeys(this.connection, poolKeysRequest);
  }
  async removeLiquidity(removeLiquidityRequest: FetchPoolKeysRequest) {
    return await ammRemoveLiquidity(this.connection, removeLiquidityRequest);
  }
}
