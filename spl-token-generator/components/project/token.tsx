import styles from "styles/pages/Token.module.scss"; // Page styles

import { MyCard } from "components/MyCard";
import { store } from "../../state/StateProvider";
export default function Mint() {
  const { activeToken } = store.useContainer();
  return (
    <MyCard name="Current Active Token">
      <div className={styles.token}>
        <div className={styles.form}>
          <label>
            {activeToken.address ? activeToken.address : "No Token Selected"}
          </label>
        </div>
      </div>
    </MyCard>
  );
}
