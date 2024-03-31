import styles from "styles/pages/Token.module.scss"; // Page styles
// import { FileUpload } from 'primereact/fileupload';
import { Metaplex } from "@metaplex-foundation/js";
import { jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import { store } from "state/StateProvider";
import { Key } from "./key";
export default function GlobalPrivateKey() {
  const { rpcConnection } = web3Connection.useContainer();
  const {
    payers,
    activeToken,
    setPoolInputData,
    poolInputData,
    setActiveToken,
    setPoolKeys,
  } = store.useContainer();
  //HxYPcef3PuAAK4MdeYWN7GMHhuX7Am1xZGuRvUGQFbbB mint
  //7pisod9VjiNoYC39hFE9LLku1jWEnMHSQ5CeSuzEgeic market
  //59XxZSLVj6G11hT4xD6fJTn4dyo1qwYEFG6ns19FEYjYQ1mqQGJYp2Ev71CqRLt4NMvfguyYiqC73Hs9p7DBpwVB
  //HE3pXeqgbAjx3Bw3pV63g27y4CsY9VHfFYjEarxmHrmw collector

  const fetchPoolKeys = (newMarketID) => {
    if (!payers.poolCreator.keypair!.secretKey) return;
    const loadingToast = toast.loading("Fetching Pool Keys", {
      autoClose: 15000,
    });
    const inputParams = {
      LPWalletPrivateKey: payers.poolCreator.keypair!.secretKey,
      tokenMarketId: newMarketID,
    };
    console.log("Running", JSON.stringify(inputParams));
    console.log("with", JSON.parse(JSON.stringify(inputParams)));
    fetch("http://localhost:3001/getPoolKeys/", {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputParams),
      // mode: "no-cors",
    }).then(async (res) =>
      res.json().then((data) => {
        toast.dismiss(loadingToast);
        if (data.success === false) {
          console.log(data.success);
          toast.error(`Pool details not available `);
        } else {
          setPoolKeys(jsonInfo2PoolKeys(data.targetPoolInfo));
          toast.success("Updated Pool Keys");
        }
      })
    );
  };
  const handleNewMarketID = (marketID: string) => {
    if (!payers.poolCreator.keypair) {
      toast.error("Pool Private Key is not set");
      return;
    }
    setPoolInputData({
      ...poolInputData,
      marketId: marketID,
    });
    fetchPoolKeys(marketID);
  };
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

  const getTokenData = async (address) => {
    let pubKey = null;
    try {
      pubKey = new PublicKey(address);
    } catch (e) {
      toast.error("Invalid token address");
    }
    // console.log(pubKey.toString());
    const info = await rpcConnection.getParsedAccountInfo(pubKey);
    console.log(info);
    if (!info) {
      toast.error("Invalid token address");
      return;
    }
    const tokenMetadata = await getTokenMetadata(address);

    if (!tokenMetadata) {
      console.log("No token metadatafor account", address);
      return null;
    }

    return {
      name: tokenMetadata?.name,
      symbol: tokenMetadata?.symbol,
      decimals: info?.value?.data.parsed.info.decimals,
      address: address,
      account: "account.pubkey.toString()",
      supply: info?.value?.data.parsed.info.supply,
    };
  };

  const setNewToken = async (e: any) => {
    console.log(e.target.value);
    const tokenData = await getTokenData(e.target.value);
    if (!tokenData) {
      toast.error("Invalid token address");
      return;
    }
    console.log(tokenData);
    setActiveToken({
      ...activeToken,
      address: tokenData.address,
      supply: tokenData.supply,
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
    });
    setPoolInputData({
      ...poolInputData,
      totalTokenSupply: tokenData.supply,
    });

    toast.success(`Token address updated ${activeToken.address}`);
  };

  return (
    <MyCard name="Setup">
      <div className={styles.token}>
        <div className={styles.form}>
          <Key
            label="Pool Creator"
            currentPK={payers.poolCreator.privateKey}
            dictKey="poolCreator"
          />
          <Key
            label="Jito Fees"
            currentPK={payers.jitoFees.privateKey}
            dictKey="jitoFees"
          />
          <Key
            label="Sol Distribution"
            currentPK={payers.walletDistributor.privateKey}
            dictKey="walletDistributor"
          />
          <label>Token Mint Address</label>
          <input
            placeholder="Mint Address"
            onChange={(e) => setNewToken(e)}
            value={activeToken.address}
          />
          <label>Token Market ID</label>
          <input
            onChange={(e) => handleNewMarketID(e.target.value)}
            value={poolInputData.marketId}
            placeholder="Market ID"
          />
        </div>
      </div>
    </MyCard>
  );
}
