import { blockEngineUrl } from "../config";

import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { build_bundle, onBundleResult } from "./build-bundle";
import { InnerSimpleV0Transaction } from "@raydium-io/raydium-sdk";
import { NewPoolRequest } from "../types/core";
import { Connection } from "@solana/web3.js";

export async function bull_dozer(
  lp_ix: InnerSimpleV0Transaction[],
  batchOfSwapTXs: InnerSimpleV0Transaction[][],
  newPoolConfig: NewPoolRequest,
  connection: Connection
) {
  console.log("BLOCK_ENGINE_URL:", blockEngineUrl);

  console.log("newPoolConfig.jitoFeesKeypair", newPoolConfig.jitoFeesKeypair);
  console.log(
    "newPoolConfig.jitoFeesKeypair",
    newPoolConfig.jitoFeesKeypair.publicKey.toString()
  );
  const search = searcherClient(blockEngineUrl, newPoolConfig.jitoFeesKeypair);
  console.log("Got Searcher");
  await build_bundle(search, lp_ix, batchOfSwapTXs, connection, newPoolConfig);
  const bundle_result = await onBundleResult(search);
  return bundle_result;
}
