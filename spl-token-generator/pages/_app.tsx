"use client";
import { NextUIProvider } from "@nextui-org/react";
import Layout from "components/Layout";
import type { AppProps } from "next/app"; // Types
import "styles/global.scss"; // Global styles
import { web3Connection } from "../state/ConnectionProvider";
import { store } from "../state/StateProvider";
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <store.Provider>
      <web3Connection.Provider>
        <NextUIProvider>
          <Layout>
            <Component
              {...pageProps}
              className="dark text-foreground bg-background"
            />
          </Layout>
        </NextUIProvider>
      </web3Connection.Provider>
    </store.Provider>
  );
}
