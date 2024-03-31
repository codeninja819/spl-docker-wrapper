import {
  buildSimpleTransaction,
  InnerSimpleV0Transaction,
  ONE,
  TokenAmount,
  Token,
} from "@raydium-io/raydium-sdk";
import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";

import { makeTxVersion, DEFAULT_TOKEN } from "../config";

import { Liquidity } from "@raydium-io/raydium-sdk";

import { getComputeBudgetConfig, getComputeBudgetConfigHigh } from "./budget";
import { BN } from "bn.js";
import { Buyer, NewPoolRequest } from "../types/core";
import { getWalletTokenAccount } from "./get_balance";

export async function sendTx(
  connection: Connection,
  payer: Keypair | Signer,
  txs: (VersionedTransaction | Transaction)[],
  options?: SendOptions
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}

export async function buildAndSendTx(
  connection: Connection,
  keypair: Keypair,
  innerSimpleV0Transaction: InnerSimpleV0Transaction[],
  options?: SendOptions
) {
  const willSendTx = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: keypair.publicKey,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: undefined,
  });

  return await sendTx(connection, keypair, willSendTx, options);
}

export async function build_bulk_buyer_swap_instructions(
  connection: Connection,
  poolKeys,
  newPoolConfig: NewPoolRequest,
  quoteDecimals: number,
  TOKEN_TYPE: Token
) {
  const swapTransactions: any[] = [];
  for (let i = 0; i < newPoolConfig.buyers.length; i++) {
    const buyer = newPoolConfig.buyers[i];
    // newPoolConfig.buyers.forEach(async (buyer: Buyer) => {
    const minAmountOut = new TokenAmount(TOKEN_TYPE, ONE); //TODO: Maybe make this a percentage of the inputTokenAmount
    console.log(minAmountOut);
    const inputTokenAmount = new TokenAmount(
      DEFAULT_TOKEN.WSOL,
      Math.floor(buyer.amountOfSolToSwap * 10 ** quoteDecimals)
    );
    console.log("inputTokenAmount", inputTokenAmount);
    console.log("Swap wsol [Lamports]: ", inputTokenAmount.raw.toNumber());
    console.log("Min Amount Out[Lamports]: ", minAmountOut.raw.toNumber[0]);

    const tokenAccountRawInfos_Swap = await getWalletTokenAccount(
      connection,
      buyer.keypair.publicKey
    );
    const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
      connection,
      poolKeys,
      userKeys: {
        tokenAccounts: tokenAccountRawInfos_Swap,
        owner: buyer.keypair.publicKey,
      },
      amountIn: inputTokenAmount,
      amountOut: minAmountOut,
      fixedSide: "in",
      makeTxVersion,
      computeBudgetConfig: await getComputeBudgetConfigHigh(),
    });
    swapTransactions.push(innerTransactions);
  }

  return swapTransactions;
}

// export async function build_swap_instructions(
//   connection: Connection,
//   poolKeys,
//   tokenAccountRawInfos_Swap,
//   keypair,
//   inputTokenAmount,
//   minAmountOut
// ) {
//   const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
//     connection,
//     poolKeys,
//     userKeys: {
//       tokenAccounts: tokenAccountRawInfos_Swap,
//       owner: keypair.publicKey,
//     },
//     amountIn: inputTokenAmount,
//     amountOut: minAmountOut,
//     fixedSide: "in",
//     makeTxVersion,
//     computeBudgetConfig: await getComputeBudgetConfigHigh(),
//   });

//   return innerTransactions;
// }

export async function build_swap_sell_instructions(
  connection,
  poolKeys,
  tokenAccountRawInfos_Swap,
  keypair,
  inputTokenAmount,
  minAmountOut
) {
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: tokenAccountRawInfos_Swap,
      owner: keypair.publicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "out",
    makeTxVersion,
    computeBudgetConfig: await getComputeBudgetConfigHigh(),
  });

  return innerTransactions;
}

export async function build_create_pool_instructions(
  connection: Connection,
  MAINNET_PROGRAM_ID,
  market_id,
  keypair,
  tokenAccountRawInfos,
  baseMint,
  baseDecimals,
  quoteMint,
  quoteDecimals,
  delay_pool_open_time,
  base_amount_input,
  quote_amount
) {
  const { innerTransactions } =
    await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: MAINNET_PROGRAM_ID.AmmV4,
      marketInfo: {
        programId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
        marketId: market_id,
      },
      associatedOnly: false,
      ownerInfo: {
        feePayer: keypair.publicKey,
        wallet: keypair.publicKey,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
      },
      baseMintInfo: {
        mint: baseMint,
        decimals: baseDecimals,
      },
      quoteMintInfo: {
        mint: quoteMint,
        decimals: quoteDecimals,
      },

      startTime: new BN(Math.floor(Date.now() / 1000) + delay_pool_open_time),
      baseAmount: new BN(base_amount_input.toString()),
      quoteAmount: new BN(quote_amount.toString()),

      computeBudgetConfig: await getComputeBudgetConfig(),
      checkCreateATAOwner: true,
      makeTxVersion: makeTxVersion,
      lookupTableCache: {},
      feeDestinationId: new PublicKey(
        "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5" //TODO: Jito?
      ),
    });

  return innerTransactions;
}
