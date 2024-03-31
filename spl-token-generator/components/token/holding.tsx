// import { FileUpload } from 'primereact/fileupload';
import { Metaplex } from "@metaplex-foundation/js";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import { store } from "../../state/StateProvider";
export default function Holdings() {
  const { payers } = store.useContainer();
  const [isLoading, setIsLoading] = useState(false);
  const { tokens, setPoolInputData, setTokens, poolInputData } =
    store.useContainer();
  const [balances, setBalances] = useState<any>({});
  const router = useRouter();
  const { rpcConnection } = web3Connection.useContainer();

  async function getTokenMetadata(mint) {
    const metaplex = Metaplex.make(rpcConnection);
    const mintAddress = new PublicKey(mint);
    const metadataAccount = metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintAddress });

    const metadataAccountInfo = await rpcConnection.getAccountInfo(
      metadataAccount
    );

    if (metadataAccountInfo) {
      return await metaplex.nfts().findByMint({ mintAddress: mintAddress });
    } else {
      console.log("No metadata found for", mintAddress.toString());
      return null;
    }
  }

  const getTokenData = async (account, index) => {
    const info = await rpcConnection.getParsedAccountInfo(account.pubkey);
    const tokenMetadata = await getTokenMetadata(
      info?.value?.data.parsed.info.mint
    );

    if (!tokenMetadata || !info) {
      console.log("No token metadatafor account", account.pubkey.toString());
      return null;
    }

    return {
      key: String(index),
      name: tokenMetadata?.name,
      symbol: tokenMetadata?.symbol,
      decimals: info?.value?.data.parsed.info.tokenAmount.decimals,
      address: info?.value?.data.parsed.info.mint,
      account: account.pubkey.toString(),
      supply: info?.value?.data.parsed.info.tokenAmount.uiAmount,
    };
  };
  async function getTokenAccounts(wallet: PublicKey) {
    const tokenAccounts = await rpcConnection.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    });
    console.log("Token Accounts", tokenAccounts);
    const newTokens = tokenAccounts.value.map(async (account, index) => {
      return getTokenData(account, index);
    });
    Promise.all(newTokens).then((tokens) => {
      console.log("New Tokens", tokens);
      setTokens(
        tokens.filter((token) => {
          return token !== null;
        })
      );
    });
  }
  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!payers.poolCreator.keypair) return;

      await getTokenAccounts(payers.poolCreator.keypair?.publicKey);
    };
    fetchTokenAccounts();
  }, [payers.poolCreator]);

  const getAndSetTokenBalance = async (token) => {
    try {
      const tokenAccountPubkey = new PublicKey(token.account);

      const bal = await rpcConnection.getTokenAccountBalance(
        tokenAccountPubkey
      );
      const newBalance = { [String(token.address)]: bal.value.uiAmount };
      setBalances((b: any) => ({
        ...b,
        newBalance,
      }));
      console.log("Balance", newBalance);
    } catch (e) {
      toast.error("Error fetching balance", e);
    }
  };

  const tokenColumns = [
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
    },
    {
      title: "Mint",
      dataIndex: "mint",
      key: "mint",
    },
    {
      title: "Active Market",
      dataIndex: "activeMarket",
      key: "activeMarket",
    },
  ];
  useEffect(() => {
    console.log("Setting tokens", tokens);
    tokens.map(async (token) => {
      // setTimeout(async () => {
      //   await getAndSetTokenBalance(token);
      // }, 500);
    });
  }, [tokens]);

  // const list = useAsyncList({
  //   async load({ signal }) {
  //     if (!payers.poolCreator.keypair) return { items: [] };
  //     setIsLoading(true);
  //     // await getTokenAccounts(payers.poolCreator.keypair!.publicKey);
  //     setIsLoading(false);
  //     return {
  //       items: tokens,
  //     };
  //   },
  //   async sort({ items, sortDescriptor }) {
  //     return {
  //       items: items.sort((a, b) => {
  //         let first = a[sortDescriptor.column];
  //         let second = b[sortDescriptor.column];
  //         let cmp =
  //           (parseInt(first) || first) < (parseInt(second) || second) ? -1 : 1;

  //         if (sortDescriptor.direction === "descending") {
  //           cmp *= -1;
  //         }

  //         return cmp;
  //       }),
  //     };
  //   },
  // });
  // useEffect(() => {
  //   list.loadMore();
  // }, [payers.poolCreator.keypair]);

  return (
    <MyCard name="Available Tokens">
      <Table
        aria-label="Tokens in current LP account"
        // sortDescriptor={list.sortDescriptor}
        // onSortChange={list.sort}
      >
        <TableHeader columns={tokenColumns}>
          {(column) => (
            <TableColumn key={column.key} allowsSorting>
              {column.title}{" "}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={tokens}
          isLoading={isLoading}
          loadingContent={<Spinner label="Loading..." />}
        >
          {(item) => (
            <TableRow key={item.key}>
              <TableCell>{item.symbol}</TableCell>
              <TableCell>{item.address}</TableCell>
              <TableCell>{item.decimals}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </MyCard>
  );
}
