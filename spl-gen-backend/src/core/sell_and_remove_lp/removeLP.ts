import { logger } from "../utils/logger";
import { makeTxVersion } from "../config";

import { buildAndSendTx } from "../utils/build_a_sendtxn";
import {
  Liquidity,
  TOKEN_PROGRAM_ID,
  Token,
  TokenAmount,
  jsonInfo2PoolKeys,
  LiquidityPoolKeysV4,
} from "@raydium-io/raydium-sdk";
import { getPoolKeys } from "../pool";
import { getATAAddress, getWalletTokenAccount } from "../utils/get_balance";
export async function ammRemoveLiquidity(connection, poolKeysRequest) {
  try {
    const poolKeys = jsonInfo2PoolKeys(
      (await getPoolKeys(connection, poolKeysRequest)).targetPoolInfo
    );

    const lpToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys.lpMint,
      poolKeys.lpDecimals
    ); // LP
    const lpTokenAccount = getATAAddress(
      TOKEN_PROGRAM_ID,
      poolKeysRequest.LPWalletKeypair.publicKey,
      poolKeys.lpMint
    );
    console.log("lpTokenAccount", lpTokenAccount.toString());
    let LP_account_balance1 = await connection.getTokenAccountBalance(
      lpTokenAccount.publicKey
    );
    logger.info(
      `LP_account_balance Total: ${LP_account_balance1.value.amount}`
    );
    const percentBalance = percentAmount(LP_account_balance1.value.amount, 1);
    console.log(
      `[Remove amount] LP_account_balance After Total: ${percentBalance}`
    );

    const tokenAccountRawInfos_LP = await getWalletTokenAccount(
      connection,
      poolKeysRequest.LPWalletKeypair.publicKey
    );
    const lp_ix = await Liquidity.makeRemoveLiquidityInstructionSimple({
      connection,
      poolKeys: poolKeys as LiquidityPoolKeysV4,
      userKeys: {
        owner: poolKeysRequest.LPWalletKeypair.publicKey,
        payer: poolKeysRequest.LPWalletKeypair.publicKey,
        tokenAccounts: tokenAccountRawInfos_LP,
      },
      amountIn: new TokenAmount(lpToken, percentBalance),
      makeTxVersion,
    });

    let txids = await buildAndSendTx(
      connection,
      poolKeysRequest.LPWalletKeypair,
      lp_ix.innerTransactions,
      { skipPreflight: true, maxRetries: 30 }
    );
    logger.info(`REMOVE LP - Signature: ${txids[0]}`);
    return { success: true, txid: txids[0] };
  } catch (e: unknown) {
    logger.info(`[LP - REMOVE - ERROR]: ${e}`);
    throw new Error(`[LP - REMOVE - ERROR]: ${e}`);
  }
}
function percentAmount(amount: string, percent: number): string {
  const inputNum = BigInt(amount); // Convert string to BigInt
  const result = inputNum * BigInt(percent * 100); // Multiply by percent
  return (result / BigInt(100)).toString(); // Round down to the nearest integer
}
