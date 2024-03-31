import { Button } from "@nextui-org/react";
import { jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import styles from "styles/pages/Token.module.scss"; // Page styles
import { store } from "../../state/StateProvider";
import { TransferRequest } from "../someTypes";
import {
  getSolBalanceInLamports,
  transferSolBulk,
} from "./users/buySellTransferMonitor";

export default function Pool() {
  const {
    poolKeys,
    payers,
    setPoolKeys,
    userAccounts,
    poolInputData,
    setPoolInputData,
    solDistributorConfig,
  } = store.useContainer();
  const { rpcConnection } = web3Connection.useContainer();

  const runBundle = (buyers: any[]) => {
    const loadingToast = toast.loading("Creating pool", { autoClose: 10000 });

    if (
      !payers.poolCreator.privateKey ||
      !payers.walletDistributor.privateKey
    ) {
      toast.error("Pool private key or zombie wallet private key not set");
      return;
    }
    const inputParams = {
      LPWalletPrivateKey: payers.poolCreator.keypair!.secretKey,
      swapWalletPrivateKey: payers.poolCreator.keypair!.secretKey,
      tokenMarketId: poolInputData.marketId,
      solToAddToPool: poolInputData.solToAddToPool,
      tokenToAddToPoolInWholeNumberAsPercentage:
        poolInputData.percentageOfTokenSupplyToAddToPool,
      poolOpenDelay: 0,
      amountOfSolToSwap: solDistributorConfig.solRequiredToFundWallets, // Amount to actually buy from the pool in the bundle
      jitoFeesPrivateKey: payers.jitoFees.keypair!.secretKey, //TODO: Add jito fees private key
      jitoFeesInSol: poolInputData.jitoFeesInSol,
      swapSellRemoveFeesInLamports: 0,
      buyers: buyers,
    };
    console.log("Running", JSON.stringify(inputParams));
    console.log("with", JSON.parse(JSON.stringify(inputParams)));
    fetch("http://localhost:3001/createAndBuy/", {
      method: "POST",

      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputParams),
    })
      .then(async (res) =>
        res
          .json()
          .then((data) => {
            toast.dismiss(loadingToast);
            if (data.success === false) {
              console.log(data);
              toast.error(`API Request Failed: ${data.error.toString()}`);
            } else {
              setPoolKeys(jsonInfo2PoolKeys(data.targetPoolInfo));
              toast.success("Pool created");
              console.log(poolKeys);
            }
          })
          .catch((e) => {
            toast.dismiss(loadingToast);
            toast.error(`Error in API: ${e}`);
          })
      )
      .catch((e) => {
        toast.dismiss(loadingToast);
        toast.error(`API Request Failed: Is the backend online? ${e}`);
      });
  };

  const handleCreatePoolAndBuy = () => {
    runBundle(
      userAccounts.map((account) => {
        return {
          secretKey: account.keypair.secretKey,
          amountOfSolToSwap: account.totalSolRequired,
        };
      })
    );
  };

  const handleDisperse = () => {
    console.log(
      "Dispersing from ",
      payers.walletDistributor.keypair?.publicKey.toString()
    );
    if (!payers.walletDistributor.keypair) {
      toast.error("Pool private key not set");
      return;
    }

    const requests = userAccounts.map((account) => {
      const txRequest: TransferRequest = {
        amount: Math.floor(
          (account.totalSolRequired +
            solDistributorConfig.gasToDepositPerWallet) *
            LAMPORTS_PER_SOL
        ),
        destination: account.publicKey,
      };
      return txRequest;
    });
    console.log(requests);
    transferSolBulk(rpcConnection, requests, payers.walletDistributor.keypair!);
  };

  const calculateTotalSolRequiredToFundSubWallets = () => {
    let totalSolRequired = 0;
    userAccounts.forEach((account) => {
      totalSolRequired +=
        account.totalSolRequired + solDistributorConfig.gasToDepositPerWallet;
    });
    console.log("Total sol required", totalSolRequired);
    return totalSolRequired;
  };

  const simulateZombieWallet = async () => {
    if (!payers.walletDistributor.privateKey) {
      toast.error("Zombie wallet private key not set");
      return;
    }
    const totalSolRequiredToFundSubWalletsInZombieWalletInLamports =
      calculateTotalSolRequiredToFundSubWallets() * LAMPORTS_PER_SOL;

    const currentZombieWalletBalanceInLamports = await getSolBalanceInLamports(
      rpcConnection,
      payers.walletDistributor.keypair!.publicKey
    );
    if (!currentZombieWalletBalanceInLamports) {
      toast.error("Dispersion wallet balance is null");
      return;
    }
    if (
      currentZombieWalletBalanceInLamports <
      totalSolRequiredToFundSubWalletsInZombieWalletInLamports
    ) {
      toast.error(
        `Insufficient balance in Dispersion wallet. Requires ${
          totalSolRequiredToFundSubWalletsInZombieWalletInLamports /
          LAMPORTS_PER_SOL
        } SOL, Current Balance: ${
          currentZombieWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL`
      );
    } else {
      toast.success(
        `Dispersion wallet has sufficient balance to fund all sub wallets. Current Balance: ${
          currentZombieWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL, requires ${
          totalSolRequiredToFundSubWalletsInZombieWalletInLamports /
          LAMPORTS_PER_SOL
        } SOL`
      );
    }
  };
  const simulateLPWallet = async () => {
    if (!payers.poolCreator.keypair) {
      toast.error("Pool private key not set");
      return;
    }

    const totalSolRequiredInLPWalletForFeesInLamports =
      poolInputData.solToAddToPool * LAMPORTS_PER_SOL;
    const currentLPWalletBalanceInLamports = await getSolBalanceInLamports(
      rpcConnection,
      payers.poolCreator.keypair.publicKey
    );
    if (!currentLPWalletBalanceInLamports) {
      toast.error("LP wallet balance is null");
      return;
    }
    if (
      currentLPWalletBalanceInLamports <
      totalSolRequiredInLPWalletForFeesInLamports
    ) {
      toast.error(
        `Insufficient balance in LP wallet. Requires ${
          totalSolRequiredInLPWalletForFeesInLamports / LAMPORTS_PER_SOL
        } SOL, Current Balance: ${
          currentLPWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL`
      );
    } else {
      toast.success(
        `LP wallet has sufficient balance to fund fees. Current Balance: ${
          currentLPWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL, requires ${
          totalSolRequiredInLPWalletForFeesInLamports / LAMPORTS_PER_SOL
        } SOL`
      );
    }
  };
  const simulateJitoWallet = async () => {
    if (!payers.jitoFees.keypair) {
      toast.error("Pool private key not set");
      return;
    }

    const totalSolRequiredInJitoWalletForFeesInLamports =
      poolInputData.jitoFeesInSol * LAMPORTS_PER_SOL;
    const currentJitoWalletBalanceInLamports = await getSolBalanceInLamports(
      rpcConnection,
      payers.jitoFees.keypair.publicKey
    );
    if (!currentJitoWalletBalanceInLamports) {
      toast.error("Jito wallet balance is null");
      return;
    }
    if (
      currentJitoWalletBalanceInLamports <
      totalSolRequiredInJitoWalletForFeesInLamports
    ) {
      toast.error(
        `Insufficient balance in JITO wallet. Requires ${
          totalSolRequiredInJitoWalletForFeesInLamports / LAMPORTS_PER_SOL
        } SOL, Current Balance: ${
          currentJitoWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL`
      );
    } else {
      toast.success(
        `JITO wallet has sufficient balance to fund fees. Current Balance: ${
          currentJitoWalletBalanceInLamports / LAMPORTS_PER_SOL
        } SOL, requires ${
          totalSolRequiredInJitoWalletForFeesInLamports / LAMPORTS_PER_SOL
        } SOL`
      );
    }
  };
  const simulatePoolCreateAndBuy = async () => {
    await simulateZombieWallet();
    await simulateJitoWallet();
    await simulateLPWallet();
  };
  useEffect(() => {
    const tokensInPool =
      poolInputData.percentageOfTokenSupplyToAddToPool *
      poolInputData.totalTokenSupply;
    const pricePerTokenInSol = poolInputData.solToAddToPool / tokensInPool;
    console.log("Price per token", pricePerTokenInSol);
    console.log("Tokens in pool", tokensInPool);
    console.log("poolInputData.solToAddToPool");
    console.log(poolInputData.solToAddToPool);
    console.log("poolInputData.totalTokenSupply");
    console.log(poolInputData.totalTokenSupply);
    console.log("poolInputData.percentageOfTokenSupplyToAddToPool");
    console.log(poolInputData.percentageOfTokenSupplyToAddToPool);
    if (isNaN(pricePerTokenInSol) || !isFinite(pricePerTokenInSol)) {
      return;
    }

    setPoolInputData({
      ...poolInputData,
      pricePerTokenInSol: pricePerTokenInSol,
      totalTokensInPool: tokensInPool,
    });
    console.log("Running update");
  }, [
    poolInputData.totalTokenSupply,
    poolInputData.percentageOfTokenSupplyToAddToPool,
    poolInputData.solToAddToPool,
  ]);

  const handlePoolValueUpdate = (newData) => {
    console.log("updating pool data", newData);
    if (newData.percentageOfTokenSupplyToAddToPool) {
      if (newData.percentageOfTokenSupplyToAddToPool > 1) {
        toast.error("Invalid percentage");
        return;
      }
    }
    setPoolInputData({ ...poolInputData, ...newData });
  };

  return (
    <MyCard name="Pool">
      <div className={styles.token}>
        <div className={styles.form}>
          <label>Jito fee</label>
          <input
            value={poolInputData.jitoFeesInSol || ""}
            placeholder="Jito fee in sol"
            onChange={(e) => {
              handlePoolValueUpdate({
                jitoFeesInSol: e.target.value,
              });
            }}
          ></input>
          <label>Percentage of supply to add to pool</label>
          <input
            placeholder="Percentage of supply to add to pool"
            value={poolInputData.percentageOfTokenSupplyToAddToPool * 100 || ""}
            onChange={(e) =>
              handlePoolValueUpdate({
                percentageOfTokenSupplyToAddToPool:
                  Number(e.target.value) / 100,
              })
            }
          />
          <label>Sol to add to pool</label>
          <input
            placeholder="SOL to add to LP"
            value={poolInputData.solToAddToPool || ""}
            onChange={(e) =>
              handlePoolValueUpdate({
                solToAddToPool: e.target.value,
              })
            }
          />
          <label>Price per token</label>
          <input
            placeholder="Price per token"
            value={`${poolInputData.pricePerTokenInSol.toExponential(2)} Sol`}
            readOnly={true}
          ></input>
          <Button onClick={handleDisperse}>Disperse Sol</Button>
          <Button onClick={simulatePoolCreateAndBuy}>Simulate</Button>
          <Button onClick={handleCreatePoolAndBuy}>Run Bundler</Button>
        </div>
      </div>
    </MyCard>
  );
}
