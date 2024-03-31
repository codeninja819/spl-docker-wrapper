import { Button } from "@nextui-org/react";
import {
  AuthorityType,
  createSetAuthorityInstruction,
} from "@solana/spl-token";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import { store } from "state/StateProvider";
import styles from "styles/pages/Token.module.scss"; // Page styles
export default function RevokeMint() {
  const { rpcConnection } = web3Connection.useContainer();
  const { activeToken, setActiveToken, payers } = store.useContainer();
  const [revokedMintTX, setRevokedMintTX] = useState("");
  const handleRevokeMint = async () => {
    if (!payers.poolCreator.keypair) {
      toast.error("Pool Private Key is not set");
      return;
    }
    try {
      if (!activeToken.address) {
        toast.error("You have to input mint address");
        return;
      }
      console.log(activeToken.address);
      const tokenMint = new PublicKey(activeToken.address);
      console.log("Token Mint", tokenMint);
      console.log("Payer", payers.poolCreator.keypair.publicKey);
      // const res = await setAuthority(
      //   rpcConnection,
      //   payers.poolCreator.keypair,
      //   tokenMint,
      //   payers.poolCreator.keypair.publicKey,
      //   AuthorityType.MintTokens,
      //   null
      // );

      const instruction = createSetAuthorityInstruction(
        tokenMint,
        payers.poolCreator.keypair.publicKey,
        AuthorityType.MintTokens,
        null
      );
      const blockhash = (await rpcConnection.getLatestBlockhash("confirmed"))
        .blockhash;
      const messageV0 = new TransactionMessage({
        payerKey: payers.poolCreator.keypair.publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const versionedTransaction = new VersionedTransaction(messageV0);
      versionedTransaction.sign([payers.poolCreator.keypair]);
      const signature = await rpcConnection.sendRawTransaction(
        versionedTransaction.serialize()
      );
      const txid = await rpcConnection.confirmTransaction(signature);
      console.log(txid);
    } catch (ex: any) {
      console.log("Error", ex);
      toast.error(ex.message);
    }
  };
  return (
    <MyCard name="Mint Authority">
      <div className={styles.token}>
        <div className={styles.form}>
          <input
            placeholder="Mint Address"
            onChange={(e) =>
              setActiveToken({ ...activeToken, address: e.target.value })
            }
            value={activeToken.address}
          />
          <Button type="submit" onClick={handleRevokeMint}>
            Revoke Mint Authority
          </Button>
          {revokedMintTX && (
            <Link
              href={`https://solscan.io/tx/${revokedMintTX}`}
              target="_blank"
            >
              View Revoke Transaction
            </Link>
          )}
        </div>
      </div>
    </MyCard>
  );
}
