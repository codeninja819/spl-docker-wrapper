import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { SearcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import { isError } from "jito-ts/dist/sdk/block-engine/utils";
import { buildSimpleTransaction } from "@raydium-io/raydium-sdk";
import { InnerSimpleV0Transaction } from "@raydium-io/raydium-sdk";

import { makeTxVersion } from "../config";

const MEMO_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";
import { NewPoolRequest } from "../types/core";
export async function build_bundle(
  search: SearcherClient,
  lp_ix: InnerSimpleV0Transaction[],
  batchOfSwapTxs: InnerSimpleV0Transaction[][],
  connection: Connection,
  newPoolConfig: NewPoolRequest
) {
  console.log("-----STARTING BUILD_BUNDLE-----");
  const _tipAccount = (await search.getTipAccounts())[0];
  console.log("tip account:", _tipAccount);
  const tipAccount = new PublicKey(_tipAccount);

  const bund = new Bundle([], 20);
  const resp = await connection.getLatestBlockhash("confirmed");

  const lpTX = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: newPoolConfig.LPWalletKeypair.publicKey,
    innerTransactions: lp_ix,
    addLookupTableInfo: undefined,
    recentBlockhash: resp.blockhash,
  });

  if (lpTX[0] instanceof VersionedTransaction) {
    lpTX[0].sign([newPoolConfig.LPWalletKeypair]);
    bund.addTransactions(lpTX[0]);
  }
  console.log("batching swap txs");
  // Error: Stream error: 8 RESOURCE_EXHAUSTED: exceeded maximum concurrent bundle result connections limit of 20
  for (let i = 0; i < batchOfSwapTxs.length; i++) {
    const swapIX = batchOfSwapTxs[i];
    console.log("ADDING BUYER SWAP TX", swapIX);
    const correspondingPayerKeypair = newPoolConfig.LPWalletKeypair;
    const swapTX = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: correspondingPayerKeypair.publicKey, // TODO, assuming this is going to be paid for on a per-wallet basis
      innerTransactions: swapIX,
      addLookupTableInfo: undefined,
      recentBlockhash: resp.blockhash,
    });
    if (swapTX[0] instanceof VersionedTransaction) {
      console.log("signing swap tx", swapTX);
      swapTX[0].sign([
        correspondingPayerKeypair,
        newPoolConfig.buyers[i].keypair,
      ]);
      bund.addTransactions(swapTX[0]);
    } else {
      throw new Error(
        "Swap TX is not a VersionedTransaction, this was not planned for (yet)"
      );
    }
  }

  console.log("Adding tip");
  let maybeBundle = bund.addTipTx(
    newPoolConfig.jitoFeesKeypair,
    newPoolConfig.jitoFeesInSol * LAMPORTS_PER_SOL,
    tipAccount,
    resp.blockhash
  );
  console.log("SUBMITTING BUNDLE", maybeBundle);

  if (isError(maybeBundle)) {
    throw Error(`Error adding tip tx to bundle ${maybeBundle}`);
  }

  try {
    const response_bund = await search.sendBundle(maybeBundle);
    console.log("response_bund:", response_bund);
  } catch (e) {
    console.error("error sending bundle:", e);
    return null;
  }

  return maybeBundle;
}

export const onBundleResult = (c: SearcherClient): Promise<number> => {
  let first = 0;
  let isResolved = false;

  return new Promise((resolve) => {
    // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
    setTimeout(() => {
      resolve(first);
      isResolved = true;
    }, 30000);

    c.onBundleResult(
      (result) => {
        if (isResolved) return first;
        // clearTimeout(timeout); // Clear the timeout if a bundle is accepted

        if (isResolved == false) {
          if (result.accepted) {
            console.log(
              "bundle accepted, ID:",
              result.bundleId,
              " Slot: ",
              result?.accepted?.slot
            );
            first += 1;
            isResolved = true;
            resolve(first); // Resolve with 'first' when a bundle is accepted
          }

          if (result.rejected) {
            console.log("bundle is Rejected:", result);
            // Do not resolve or reject the promise here
          }
        }
      },
      (e) => {
        console.error(e);
        // Do not reject the promise here
      }
    );
  });
};

export const buildMemoTransaction = (
  keypair: Keypair,
  recentBlockhash: string,
  message: string
): VersionedTransaction => {
  const ix = new TransactionInstruction({
    keys: [
      {
        pubkey: keypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(message),
  });

  const instructions = [ix];

  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  tx.sign([keypair]);

  return tx;
};
