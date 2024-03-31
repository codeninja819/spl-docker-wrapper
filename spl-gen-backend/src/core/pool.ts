import { PublicKey } from "@solana/web3.js";
import { PoolResponse } from "./types/core";
import {
  jsonInfo2PoolKeys,
  Liquidity,
  MAINNET_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V3,
  LiquidityPoolKeys,
  Token,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";

import { unpackMint } from "@solana/spl-token";

import {
  getTokenAccountBalance,
  getWalletTokenAccount,
} from "./utils/get_balance";

import { bull_dozer } from "./jito_bundle/send-bundle";
import { Connection } from "@solana/web3.js";

import {
  build_create_pool_instructions,
  build_bulk_buyer_swap_instructions,
} from "./utils/build_a_sendtxn";
import { NewPoolRequest, FetchPoolKeysRequest } from "./types/core";

export async function getPoolKeys(
  connection: Connection,
  poolKeysRequest: FetchPoolKeysRequest
) {
  console.log(
    "LP Wallet Address: ",
    poolKeysRequest.LPWalletKeypair.publicKey.toString()
  );

  console.log("------------- get pool keys for pool creation---------");

  const marketBufferInfo = await connection.getAccountInfo(
    poolKeysRequest.tokenMarketId
  );
  console.log("Market Buffer Info: ", marketBufferInfo);
  if (!marketBufferInfo) throw new Error("Market not found");
  const {
    baseMint,
    quoteMint,
    baseLotSize,
    quoteLotSize,
    baseVault: marketBaseVault,
    quoteVault: marketQuoteVault,
    bids: marketBids,
    asks: marketAsks,
    eventQueue: marketEventQueue,
  } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data);
  console.log("Base mint: ", baseMint.toString());
  console.log("Quote mint: ", quoteMint.toString());

  const accountInfo_base = await connection.getAccountInfo(baseMint);
  if (!accountInfo_base) throw new Error("Base mint not found");
  const baseTokenProgramId = accountInfo_base.owner;
  const baseDecimals = unpackMint(
    baseMint,
    accountInfo_base,
    baseTokenProgramId
  ).decimals;
  console.log("Base Decimals: ", baseDecimals);

  const accountInfo_quote = await connection.getAccountInfo(quoteMint);
  if (!accountInfo_quote) throw new Error("Quote mint not found");
  const quoteTokenProgramId = accountInfo_quote.owner;
  const quoteDecimals = unpackMint(
    quoteMint,
    accountInfo_quote,
    quoteTokenProgramId
  ).decimals;
  console.log("Quote Decimals: ", quoteDecimals);

  const associatedPoolKeys = await Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    marketId: poolKeysRequest.tokenMarketId,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
  });

  // -------------------------------------------------
  // ---- Swap info
  const targetPoolInfo = {
    id: associatedPoolKeys.id.toString(),
    baseMint: associatedPoolKeys.baseMint.toString(),
    quoteMint: associatedPoolKeys.quoteMint.toString(),
    lpMint: associatedPoolKeys.lpMint.toString(),
    baseDecimals: associatedPoolKeys.baseDecimals,
    quoteDecimals: associatedPoolKeys.quoteDecimals,
    lpDecimals: associatedPoolKeys.lpDecimals,
    version: 4,
    programId: associatedPoolKeys.programId.toString(),
    authority: associatedPoolKeys.authority.toString(),
    openOrders: associatedPoolKeys.openOrders.toString(),
    targetOrders: associatedPoolKeys.targetOrders.toString(),
    baseVault: associatedPoolKeys.baseVault.toString(),
    quoteVault: associatedPoolKeys.quoteVault.toString(),
    withdrawQueue: associatedPoolKeys.withdrawQueue.toString(),
    lpVault: associatedPoolKeys.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: associatedPoolKeys.marketProgramId.toString(),
    marketId: associatedPoolKeys.marketId.toString(),
    marketAuthority: associatedPoolKeys.marketAuthority.toString(),
    marketBaseVault: marketBaseVault.toString(),
    marketQuoteVault: marketQuoteVault.toString(),
    marketBids: marketBids.toString(),
    marketAsks: marketAsks.toString(),
    marketEventQueue: marketEventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };

  return { success: true, targetPoolInfo: targetPoolInfo };
}

export async function txCreateAndInitNewPool(
  connection: Connection,
  newPoolConfig: NewPoolRequest
) {
  try {
    console.log(
      "LP Wallet Address: ",
      newPoolConfig.LPWalletKeypair.publicKey.toString()
    );

    console.log("------------- get pool keys for pool creation---------");

    const tokenAccountRawInfos_LP = await getWalletTokenAccount(
      connection,
      newPoolConfig.LPWalletKeypair.publicKey
    );

    const marketBufferInfo = await connection.getAccountInfo(
      newPoolConfig.tokenMarketId
    );
    console.log("Market Buffer Info: ", marketBufferInfo);
    if (!marketBufferInfo) throw new Error("Market not found");
    const {
      baseMint,
      quoteMint,
      baseLotSize,
      quoteLotSize,
      baseVault: marketBaseVault,
      quoteVault: marketQuoteVault,
      bids: marketBids,
      asks: marketAsks,
      eventQueue: marketEventQueue,
    } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data);
    console.log("Base mint: ", baseMint.toString());
    console.log("Quote mint: ", quoteMint.toString());

    const accountInfo_base = await connection.getAccountInfo(baseMint);
    if (!accountInfo_base) throw new Error("Base mint not found");
    const baseTokenProgramId = accountInfo_base.owner;
    const baseDecimals = unpackMint(
      baseMint,
      accountInfo_base,
      baseTokenProgramId
    ).decimals;
    console.log("Base Decimals: ", baseDecimals);

    const accountInfo_quote = await connection.getAccountInfo(quoteMint);
    if (!accountInfo_quote) throw new Error("Quote mint not found");
    const quoteTokenProgramId = accountInfo_quote.owner;
    const quoteDecimals = unpackMint(
      quoteMint,
      accountInfo_quote,
      quoteTokenProgramId
    ).decimals;
    console.log("Quote Decimals: ", quoteDecimals);

    const associatedPoolKeys = await Liquidity.getAssociatedPoolKeys({
      version: 4,
      marketVersion: 3,
      baseMint,
      quoteMint,
      baseDecimals,
      quoteDecimals,
      marketId: newPoolConfig.tokenMarketId,
      programId: MAINNET_PROGRAM_ID.AmmV4,
      marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    });
    const { id: ammId, lpMint } = associatedPoolKeys;
    console.log("AMM ID: ", ammId.toString());
    console.log("lpMint: ", lpMint.toString());

    // --------------------------------------------
    let quote_amount = newPoolConfig.solToAddToPool * 10 ** quoteDecimals;
    // -------------------------------------- Get balance
    let base_balance: number;
    let quote_balance: number;
    if (baseMint.toString() == "So11111111111111111111111111111111111111112") {
      base_balance = await connection.getBalance(
        newPoolConfig.LPWalletKeypair.publicKey
      );
      if (!base_balance) throw new Error("Base balance not found");
      console.log("SOL Balance:", base_balance);
    } else {
      console.log("Base Mint: ", baseMint);
      console.log("Base Mint: ", baseMint.toString());
      const temp = await getTokenAccountBalance(
        connection,
        newPoolConfig.LPWalletKeypair.publicKey.toString(),
        baseMint.toString()
      );
      base_balance = temp || 0;
    }

    if (quoteMint.toString() == "So11111111111111111111111111111111111111112") {
      quote_balance = await connection.getBalance(
        newPoolConfig.LPWalletKeypair.publicKey
      );
      if (!quote_balance) throw new Error("Quote balance not found");
      console.log("SOL Balance:", quote_balance);
      console.log("Quote Amount: ", quote_amount);
      if (quote_amount > quote_balance) {
        console.log("SOL LP input is less than current balance");
        throw new Error("Sol LP input is greater than current balance");
      }
    } else {
      const temp = await getTokenAccountBalance(
        connection,
        newPoolConfig.LPWalletKeypair.publicKey.toString(),
        quoteMint.toString()
      );
      quote_balance = temp || 0;
    }

    let base_amount_input = Math.ceil(
      base_balance * newPoolConfig.tokenToAddToPoolInWholeNumberAsPercentage
    );
    console.log("Input Base: ", base_amount_input);

    // step2: init new pool (inject money into the created pool)
    const lpIX = await build_create_pool_instructions(
      connection,
      MAINNET_PROGRAM_ID,
      newPoolConfig.tokenMarketId,
      newPoolConfig.LPWalletKeypair,
      tokenAccountRawInfos_LP,
      baseMint,
      baseDecimals,
      quoteMint,
      quoteDecimals,
      newPoolConfig.poolOpenDelay,
      base_amount_input,
      quote_amount
    );
    console.log("-------- pool creation instructions [DONE] ---------\n");

    // -------------------------------------------------
    // ---- Swap info
    const targetPoolInfo = {
      id: associatedPoolKeys.id.toString(),
      baseMint: associatedPoolKeys.baseMint.toString(),
      quoteMint: associatedPoolKeys.quoteMint.toString(),
      lpMint: associatedPoolKeys.lpMint.toString(),
      baseDecimals: associatedPoolKeys.baseDecimals,
      quoteDecimals: associatedPoolKeys.quoteDecimals,
      lpDecimals: associatedPoolKeys.lpDecimals,
      version: 4,
      programId: associatedPoolKeys.programId.toString(),
      authority: associatedPoolKeys.authority.toString(),
      openOrders: associatedPoolKeys.openOrders.toString(),
      targetOrders: associatedPoolKeys.targetOrders.toString(),
      baseVault: associatedPoolKeys.baseVault.toString(),
      quoteVault: associatedPoolKeys.quoteVault.toString(),
      withdrawQueue: associatedPoolKeys.withdrawQueue.toString(),
      lpVault: associatedPoolKeys.lpVault.toString(),
      marketVersion: 3,
      marketProgramId: associatedPoolKeys.marketProgramId.toString(),
      marketId: associatedPoolKeys.marketId.toString(),
      marketAuthority: associatedPoolKeys.marketAuthority.toString(),
      marketBaseVault: marketBaseVault.toString(),
      marketQuoteVault: marketQuoteVault.toString(),
      marketBids: marketBids.toString(),
      marketAsks: marketAsks.toString(),
      marketEventQueue: marketEventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString(),
    };

    console.log(targetPoolInfo);

    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
    console.log("\n -------- Now getting swap instructions --------");
    const TOKEN_TYPE = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals);
    console.log();

    const batchOfSwapIXs = await build_bulk_buyer_swap_instructions(
      connection,
      poolKeys,
      newPoolConfig,
      quoteDecimals,
      TOKEN_TYPE
    );
    console.log("-------- swap coin instructions [DONE] ---------\n");

    // swap ix end ------------------------------------------------------------

    console.log("------------- Bundle & Send ---------");

    console.log(
      "Please wait for 30 seconds for bundle to be completely executed by all nearests available leaders!"
    );
    console.log;

    let success = await runBundleTillSuccess(
      lpIX,
      batchOfSwapIXs,
      newPoolConfig,
      connection
    );

    const result: PoolResponse = {
      success: success > 0,
      targetPoolInfo: targetPoolInfo,
    };
    return result;
  } catch (err) {
    console.log("Error: ", err);
    return {
      success: false,
      targetPoolInfo: null,
      error: (err as Error).message,
    };
  }
}

async function runBundleTillSuccess(
  lpIX,
  batchOfSwapIXs,
  newPoolConfig,
  connection
) {
  let success = 0;
  let k = 0;
  while (success < 1 && k < 30) {
    success = await bull_dozer(lpIX, batchOfSwapIXs, newPoolConfig, connection);
    k++;
  }
  if (success > 0) {
    console.log("------------- Bundle Successful ---------");
  } else {
    console.log("------------- Bundle Failed ---------");
  }
  return success;
}
