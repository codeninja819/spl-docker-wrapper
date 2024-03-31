import { MyCard } from "components/MyCard";
import { toast } from "react-toastify";
import styles from "styles/pages/Token.module.scss"; // Page styles
import { store } from "../../state/StateProvider";

export default function Zombie() {
  const { solDistributorConfig, setSolDistributorConfig, payers } =
    store.useContainer();

  return (
    <>
      <MyCard name="Sol Dispersion">
        <div className={styles.token}>
          <div className={styles.form}>
            <input
              placeholder="Wallet for dispersing SOL"
              value={
                payers.walletDistributor.keypair?.publicKey.toString() || ""
              }
              readOnly={true}
              onClick={() => {
                toast.info("Set wallet on Setup page");
              }}
            />

            <label>Gas to deposit per wallet</label>
            <input
              type="number"
              step={0.01}
              placeholder="Gas to deposit per wallet"
              value={solDistributorConfig.gasToDepositPerWallet}
              onChange={(e) => {
                setSolDistributorConfig({
                  ...solDistributorConfig,
                  gasToDepositPerWallet: Number(e.target.value),
                });
              }}
            ></input>
            <label>Total sol needed to fund wallets</label>
            <input
              placeholder="SOL needed to buy tokens"
              value={solDistributorConfig.solRequiredToFundWallets.toFixed(2)}
              readOnly={true}
            />
          </div>
        </div>
      </MyCard>
    </>
  );
}
