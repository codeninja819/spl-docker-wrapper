import { Button } from "@nextui-org/react";
import Image from "next/image"; // Images
import Link from "next/link"; // Dynamic routing
import { useRouter } from "next/router";
import styles from "styles/components/Header.module.scss"; // Component styles

export default function Header() {
  const route = useRouter();
  return (
    <div className={styles.header}>
      <div className={styles.header__logo}>
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={32} height={32} priority />
        </Link>

        <div className={styles.header__menu}>
          <Link href="/" legacyBehavior>
            <Button className={route.pathname === "/" ? "active" : ""}>
              Setup
            </Button>
          </Link>
          <Link href="/wallet-holdings" legacyBehavior>
            <Button
              className={route.pathname === "/wallet-holdings" ? "active" : ""}
            >
              Wallet Holdings
            </Button>
          </Link>
          <Link href="/create-token" legacyBehavior>
            <Button
              className={route.pathname === "/create-token" ? "active" : ""}
            >
              Create New Token
            </Button>
          </Link>
          <Link href="/current-token" legacyBehavior>
            <Button
              className={route.pathname === "/current-token" ? "active" : ""}
            >
              Market
            </Button>
          </Link>
          <Link href="/project" legacyBehavior>
            <Button className={route.pathname === "/project" ? "active" : ""}>
              Pool
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
