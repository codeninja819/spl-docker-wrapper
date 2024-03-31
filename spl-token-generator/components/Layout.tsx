import Header from "components/Header"; // Components: Header
import Meta from "components/Meta"; // Components: Meta
import type { ReactElement } from "react"; // Types
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "styles/components/Layout.module.scss"; // Component styles

export default function Layout({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  return (
    <div className="dark text-foreground bg-background">
      <div className={styles.layout}>
        <Meta />
        <Header />
        <div className={styles.layout__content}>{children}</div>
        <ToastContainer theme="dark" />
      </div>
    </div>
  );
}
