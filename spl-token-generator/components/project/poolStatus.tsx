import { Button } from "@nextui-org/react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import styles from "styles/pages/Token.module.scss"; // Page styles
import { store } from "../../state/StateProvider";
import { getSolBalanceInLamports } from "./users/buySellTransferMonitor";
import { useState } from "react";
export default function PoolStatus() {
  const { poolKeys } = store.useContainer();
  const [poolValue, setPoolValue] = useState(0);
  const { rpcConnection } = web3Connection.useContainer();

  const updatePoolValue = async () => {
    if (!poolKeys?.quoteVault) {
      toast.error("Set all keys in setup page");
      return;
    }
    const LP_worth =
      (await getSolBalanceInLamports(rpcConnection, poolKeys.quoteVault)) /
      LAMPORTS_PER_SOL;
    setPoolValue(LP_worth);
  };
  return (
    <MyCard name="Pool Status">
      <div className={styles.token}>
        <div className={styles.form}>
          <label>Pool Value (SOL)</label>
          <input type="text" readOnly={true} value={poolValue}></input>

          <Button onClick={updatePoolValue}>Update pool value</Button>
        </div>
      </div>
    </MyCard>
  );
}
