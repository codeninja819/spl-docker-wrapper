import { PoolAPI } from "./core/PoolAPI";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NewPoolRequest, FetchPoolKeysRequest, Buyer } from "./core/types/core";
const express = require("express");
const dotenv = require("dotenv");
var cors = require("cors");
dotenv.config();

const app = express();
const port = 3001;
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
app.use(cors());
const uint8DictParser = (data: object) => {
  console.log("parsing", data);
  let res: number[] = [];
  for (const key in data) {
    res.push(data[key]);
  }
  return Uint8Array.from(res);
};
app.post("/getPoolKeys", jsonParser, async (req, res) => {
  try {
    const poolAPI = new PoolAPI();
    console.log(req);
    const data = req.body;
    const poolKeysRequest: FetchPoolKeysRequest = {
      LPWalletKeypair: Keypair.fromSecretKey(
        uint8DictParser(data.LPWalletPrivateKey)
      ),

      tokenMarketId: new PublicKey(data.tokenMarketId),
    };
    poolAPI
      .getPoolKeys(poolKeysRequest)
      .then((result) => {
        console.log("Get pool result: ", result);
        res.send(
          JSON.stringify({
            success: result.success,
            targetPoolInfo: result.targetPoolInfo,
          })
        );
      })
      .catch((err) => {
        console.log("err: ", err.message);
        res.send(JSON.stringify({ success: false, error: err.message }));
      });
  } catch (e: any) {
    res.send(JSON.stringify({ success: false, error: e.message }));
  }
});
app.post("/removeLiquidity", jsonParser, async (req, res) => {
  try {
    const poolAPI = new PoolAPI();

    const data = req.body;
    const poolKeysRequest: FetchPoolKeysRequest = {
      LPWalletKeypair: Keypair.fromSecretKey(
        uint8DictParser(data.LPWalletPrivateKey)
      ),

      tokenMarketId: new PublicKey(data.tokenMarketId),
    };
    poolAPI
      .removeLiquidity(poolKeysRequest)
      .then((result) => {
        console.log("Get pool result: ", result);
        res.send(
          JSON.stringify({
            success: result.success,
            txids: result.txid,
          })
        );
      })
      .catch((err) => {
        console.log("err: ", err.message);
        res.send(JSON.stringify({ success: false, error: err.message }));
      });
  } catch (e: any) {
    res.send(JSON.stringify({ success: false, error: e.message }));
  }
});
app.post("/createAndBuy", jsonParser, async (req, res) => {
  try {
    const poolAPI = new PoolAPI();

    const data = req.body;
    const newPoolRequest: NewPoolRequest = {
      LPWalletKeypair: Keypair.fromSecretKey(
        uint8DictParser(data.LPWalletPrivateKey)
      ),
      swapWalletKeypair: Keypair.fromSecretKey(
        uint8DictParser(data.swapWalletPrivateKey)
      ),
      tokenMarketId: new PublicKey(data.tokenMarketId),
      solToAddToPool: data.solToAddToPool,
      tokenToAddToPoolInWholeNumberAsPercentage:
        data.tokenToAddToPoolInWholeNumberAsPercentage,
      poolOpenDelay: data.poolOpenDelay,
      jitoFeesKeypair: Keypair.fromSecretKey(
        uint8DictParser(data.jitoFeesPrivateKey)
      ),
      jitoFeesInSol: data.jitoFeesInSol,
      swapSellRemoveFeesInLamports: data.swapSellRemoveFeesInLamports,
      buyers: data.buyers.map((buyer: any) => {
        const buyerTyped: Buyer = {
          keypair: Keypair.fromSecretKey(uint8DictParser(buyer.secretKey)),
          amountOfSolToSwap: buyer.amountOfSolToSwap,
        };
        return buyerTyped;
      }),
    };

    poolAPI
      .createAndInitNewPool(newPoolRequest)
      .then((result) => {
        // const { success: success, targetPoolInfo: targetPoolInfo } = res;
        console.log("result: ", result);
        res.send(
          JSON.stringify({
            success: result.success,
            targetPoolInfo: result.targetPoolInfo,
            error: result.error,
          })
        );
      })
      .catch((err) => {
        console.log("err: ", err.message);
        res.send(JSON.stringify({ success: false, error: err.message }));
      });
  } catch (e: any) {
    res.send(JSON.stringify({ success: false, error: e.message }));
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
