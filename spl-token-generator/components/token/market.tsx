import styles from "styles/pages/Token.module.scss"; // Page styles
// import { FileUpload } from 'primereact/fileupload';
import { Metadata, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Button } from "@nextui-org/react";
import {
  MAINNET_PROGRAM_ID,
  MarketV2,
  Token,
  TxVersion,
} from "@raydium-io/raydium-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import { buildAndSendTx } from "components/project/users/swap";
import { useState } from "react";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import { store } from "state/StateProvider";

export default function Market() {
  const { rpcConnection } = web3Connection.useContainer();
  const { payers, activeToken, setPoolInputData, poolInputData } =
    store.useContainer();

  const [orderSize, setOrderSize] = useState("");
  const [priceSize, setPriceSize] = useState("");

  const handleOpenMarket = async () => {
    if (!payers.poolCreator.keypair) {
      toast.error("Pool Private Key is not set");
      return;
    }
    try {
      if (!activeToken.address)
        throw new Error("You have to input mint address");
      if (!orderSize) throw new Error("You have to input minimum order size");
      if (!priceSize)
        throw new Error("You have to input minimum price tick size");
      const tokenMint = new PublicKey(activeToken.address);
      const mint = await rpcConnection.getParsedAccountInfo(tokenMint);
      const metadataPDA = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
        PROGRAM_ID
      )[0];
      const metadataAccount = await rpcConnection.getAccountInfo(metadataPDA);
      if (!metadataAccount) throw new Error("Cannot find metadata");
      const [metadata, _] = await Metadata.deserialize(metadataAccount.data);
      const baseToken = new Token(
        TOKEN_PROGRAM_ID,
        tokenMint,
        (mint.value?.data as any).parsed?.info.decimals,
        metadata.data.symbol.replaceAll("\x00", ""),
        metadata.data.name.replaceAll("\x00", "")
      );

      const quoteToken = new Token(
        TOKEN_PROGRAM_ID,
        new PublicKey("So11111111111111111111111111111111111111112"),
        9,
        "WSOL",
        "WSOL"
      );

      const makeTxVersion = TxVersion.V0;
      const createMarketInstruments =
        await MarketV2.makeCreateMarketInstructionSimple({
          connection: rpcConnection,
          wallet: payers.poolCreator.keypair.publicKey,
          baseInfo: baseToken,
          quoteInfo: quoteToken,
          lotSize: Number(orderSize), // default 1
          tickSize: Number(priceSize), // default 0.01

          dexProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
          makeTxVersion,
        });
      const marketId = createMarketInstruments.address.marketId;
      setPoolInputData({
        ...poolInputData,
        marketId: marketId.toString(),
      });

      const results = buildAndSendTx(
        rpcConnection,
        payers.poolCreator.keypair,
        createMarketInstruments.innerTransactions
      );

      console.log("Market Created");
      console.log("Create Market Transactions :", results);
      console.log("Market Address :", marketId);
      toast.success("Successfully created!");
    } catch (ex: any) {
      toast.error(ex.message);
    }
  };

  return (
    <MyCard name="Create OpenBook Market">
      <div className={styles.token}>
        <div className={styles.form}>
          <input
            placeholder="Minimum Order Size"
            onChange={(e) => setOrderSize(e.target.value)}
            value={orderSize}
          />
          <input
            placeholder="Minimum Price Tick Size"
            onChange={(e) => setPriceSize(e.target.value)}
            value={priceSize}
          />
          <Button type="submit" onClick={handleOpenMarket}>
            Create OpenBook Market
          </Button>
        </div>
      </div>
    </MyCard>
  );
}
