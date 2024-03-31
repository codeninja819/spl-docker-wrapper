import { PublicKey } from "@solana/web3.js";

export interface TransferRequest {
  amount: Number;
  destination: PublicKey;
}

export type TokenData = {
  key: string;
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  account: string;
  supply: string;
};
