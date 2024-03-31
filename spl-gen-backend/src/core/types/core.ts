import { PublicKey } from "@solana/web3.js";

import { Keypair } from "@solana/web3.js";

export interface NewPoolRequest {
  LPWalletKeypair: Keypair;
  swapWalletKeypair: Keypair;
  tokenMarketId: PublicKey;
  solToAddToPool: number;
  tokenToAddToPoolInWholeNumberAsPercentage: number;
  poolOpenDelay: number;
  jitoFeesKeypair: Keypair;
  jitoFeesInSol: number;
  swapSellRemoveFeesInLamports: number;
  buyers: Buyer[];
}
export interface Buyer {
  keypair: Keypair;
  amountOfSolToSwap: number;
}

export interface FetchPoolKeysRequest {
  LPWalletKeypair: Keypair;
  tokenMarketId: PublicKey;
}

export interface PoolResponse {
  success: boolean;
  targetPoolInfo: object;
  error?: string;
}
