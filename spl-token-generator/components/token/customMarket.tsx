import styles from "styles/pages/Token.module.scss"; // Page styles
// import { FileUpload } from 'primereact/fileupload';
import { MyCard } from "components/MyCard";
import { store } from "state/StateProvider";

export default function PreexistingMarket() {
  const { setPoolInputData, poolInputData } = store.useContainer();

  return (
    <MyCard name="Pre-existing Market">
      <div className={styles.token}>
        <div className={styles.form}>
          <input
            placeholder="Market ID"
            onChange={(e) =>
              setPoolInputData({
                ...poolInputData,
                marketId: e.target.value,
              })
            }
            value={poolInputData.marketId}
          />
        </div>
      </div>
    </MyCard>
  );
}
