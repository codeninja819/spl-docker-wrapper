import { PublicKey } from "@solana/web3.js";
import {
  Token,
  Currency,
  TOKEN_PROGRAM_ID,
  TxVersion,
  SOL,
} from "@raydium-io/raydium-sdk";

// define these
export const blockEngineUrl = "tokyo.mainnet.block-engine.jito.wtf";

export const makeTxVersion = TxVersion.V0; // LEGACY

export const sell_remove_fees = 5000000;

export const DEFAULT_TOKEN = {
  SOL: SOL,
  SOL1: new Currency(9, "USDC", "USDC"),
  WSOL: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("So11111111111111111111111111111111111111112"),
    9,
    "WSOL",
    "WSOL"
  ),
  USDC: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    6,
    "USDC",
    "USDC"
  ),
};
