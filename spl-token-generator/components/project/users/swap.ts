import {
  InnerSimpleV0Transaction,
  Liquidity,
  TxVersion,
  buildSimpleTransaction,
} from "@raydium-io/raydium-sdk";
import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { getComputeBudgetConfigHigh } from "../users/buySellTransferMonitor";
const makeTxVersion = TxVersion.V0;

export async function buildSwapInstructions(
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
    fixedSide: "in",
    makeTxVersion,
    computeBudgetConfig: { units: 50000, microLamports: 20000 },
  });

  return innerTransactions;
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
    addLookupTableInfo: {},
  });

  return await sendTx(connection, keypair, willSendTx, options);
}

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
      const txid = await connection.sendTransaction(iTx, options);
      await connection.confirmTransaction(txid, "confirmed");
      txids.push(txid);
    } else {
      throw new Error("Unsupported transaction type");
    }
  }
  return txids;
}
