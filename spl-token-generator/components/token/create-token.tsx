import {
  PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { Button } from "@nextui-org/react";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { MyCard } from "components/MyCard";
import Link from "next/link";
import { Blob, NFTStorage } from "nft.storage";
import { useCallback } from "react";
import { toast } from "react-toastify";
import { web3Connection } from "state/ConnectionProvider";
import styles from "styles/pages/Token.module.scss"; // Page styles
import { store } from "../../state/StateProvider";
export default function CreateToken() {
  const storage = new NFTStorage({
    token: process.env.NFT_STORAGE_API_KEY || "",
  });
  const { payers } = store.useContainer();
  const { rpcConnection } = web3Connection.useContainer();
  const { newTokenInfo, setNewTokenInfo } = store.useContainer();

  const { addToken } = store.useContainer();

  const uploadImage = async (img: any) => {
    const loading = toast.loading(`Uploading image to IPFS`);
    return storage.storeBlob(img).then((img_cid) => {
      storage.status(img_cid).then((status) => {
        if (status.pin.status != "pinned") {
          toast.dismiss(loading);
          toast.error(`Could not upload image, Status: ${status.pin.status}`);
          return;
        }

        setNewTokenInfo({
          ...newTokenInfo,
          logoUri: `https://${img_cid}.ipfs.nftstorage.link`,
          imageCID: img_cid,
        });
        toast.dismiss(loading);
        toast.success(`Successfully uploaded image ${img_cid}`);
      });
    });
  };

  const uploadMetadata = async () => {
    if (!newTokenInfo.description)
      toast.error("You have to input token description");
    console.log(newTokenInfo);
    if (!newTokenInfo.telegram)
      toast.error("You have to input telegram username");
    if (!newTokenInfo.twitter)
      toast.error("You have to input twitter username");
    if (!newTokenInfo.website) toast.error("You have to input website url");
    if (!newTokenInfo.name) toast.error("You have to input token name");

    const metadata = {
      name: newTokenInfo.name,
      description: newTokenInfo.description,
      image: `ipfs://${newTokenInfo.imageCID}`, // CID obtained from uploading an image to IPFS via NFT.Storage
      properties: {
        telegram: newTokenInfo.telegram,
        twitter: newTokenInfo.twitter,
        website: newTokenInfo.website,
      },
    };
    // Create a JSON Blob from the metadata object
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    const loading = toast.loading("Uploading metadata to IPFS");
    return storage.storeBlob(metadataBlob).then((cid) => {
      storage.status(cid).then((status) => {
        if (status.pin.status != "pinned") {
          toast.dismiss(loading);
          toast.error(
            `Could not upload metadata, Status: ${status.pin.status}`
          );
        }
        console.log("metadataCID", cid);
        setNewTokenInfo({ ...newTokenInfo, metadataCID: cid });
        toast.dismiss(loading);
        toast.success("Successfully uploaded metadata");
      });
    });
  };

  const handleCreateToken = useCallback(async () => {
    if (!payers.poolCreator.keypair?.publicKey.toString()) {
      toast.error("You have to connect wallet");
    } else {
      try {
        if (!newTokenInfo.imageCID) toast.error("You have to upload an image");
        if (!newTokenInfo.metadataCID)
          toast.error("You have to upload metadata");
        if (!newTokenInfo.name) toast.error("You have to input token name");
        if (!newTokenInfo.symbol) toast.error("You have to input token symbol");
        if (!newTokenInfo.decimals)
          toast.error("You have to input token decimals");
        if (!newTokenInfo.supply) toast.error("You have to input total supply");
        const lamports = await getMinimumBalanceForRentExemptMint(
          rpcConnection
        );
        const newTokenMintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(
          newTokenMintKeypair.publicKey,
          payers.poolCreator.keypair.publicKey
        );

        const metadataUri = `https://${newTokenInfo.metadataCID}.ipfs.nftstorage.link`;
        console.log("metadataUri", metadataUri);
        console.log(newTokenInfo);
        const createMetadataInstruction =
          createCreateMetadataAccountV3Instruction(
            {
              metadata: PublicKey.findProgramAddressSync(
                [
                  Buffer.from("metadata"),
                  PROGRAM_ID.toBuffer(),
                  newTokenMintKeypair.publicKey.toBuffer(),
                ],
                PROGRAM_ID
              )[0],
              mint: newTokenMintKeypair.publicKey,
              mintAuthority: payers.poolCreator.keypair?.publicKey,
              payer: payers.poolCreator.keypair?.publicKey,
              updateAuthority: payers.poolCreator.keypair?.publicKey,
            },
            {
              createMetadataAccountArgsV3: {
                data: {
                  name: newTokenInfo.name,
                  symbol: newTokenInfo.symbol,
                  uri: metadataUri,
                  creators: null,
                  sellerFeeBasisPoints: 0,
                  uses: null,
                  collection: null,
                },
                isMutable: false,
                collectionDetails: null,
              },
            }
          );

        const ix = [
          SystemProgram.createAccount({
            fromPubkey: payers.poolCreator.keypair?.publicKey,
            newAccountPubkey: newTokenMintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
            newTokenMintKeypair.publicKey,
            Number(newTokenInfo.decimals),
            payers.poolCreator.keypair.publicKey,
            payers.poolCreator.keypair.publicKey,
            TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountInstruction(
            payers.poolCreator.keypair.publicKey,
            tokenATA,
            payers.poolCreator.keypair.publicKey,
            newTokenMintKeypair.publicKey
          ),
          createMintToInstruction(
            newTokenMintKeypair.publicKey,
            tokenATA,
            payers.poolCreator.keypair.publicKey,
            Number(newTokenInfo.supply) *
              Math.pow(10, Number(newTokenInfo.decimals))
          ),
          createMetadataInstruction,
        ];

        let blockhash = await rpcConnection
          .getLatestBlockhash("confirmed")
          .then((res) => res.blockhash);

        const messageV0 = new TransactionMessage({
          payerKey: payers.poolCreator.keypair.publicKey,
          recentBlockhash: blockhash,
          instructions: ix,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        console.log("transaction", transaction);
        transaction.sign([payers.poolCreator.keypair, newTokenMintKeypair]);

        const res = await rpcConnection.sendTransaction(transaction);
        setNewTokenInfo({ ...newTokenInfo, txHash: res });
        console.log("res", res);
        addToken({
          name: newTokenInfo.name,
          symbol: newTokenInfo.symbol,
          decimals: newTokenInfo.decimals,
          address: newTokenMintKeypair.publicKey.toString(),
          account: tokenATA.toString(),
          supply: newTokenInfo.supply,
        });
      } catch (ex: any) {
        toast.error(ex.message);
      }
    }
  }, [payers.poolCreator, newTokenInfo]);

  return (
    <MyCard name="Create Token">
      <div className={styles.token}>
        <div className={styles.form}>
          <input
            placeholder="Name"
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, name: e.target.value })
            }
            value={newTokenInfo.name}
          />
          <input
            placeholder="Symbol"
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, symbol: e.target.value })
            }
            value={newTokenInfo.symbol}
          />
          <input
            placeholder="Description"
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, description: e.target.value })
            }
            value={newTokenInfo.description}
          />
          <input
            placeholder="Telegram"
            value={newTokenInfo.telegram}
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, telegram: e.target.value })
            }
          />
          <input
            placeholder="Twitter"
            value={newTokenInfo.twitter}
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, twitter: e.target.value })
            }
          />
          <input
            placeholder="Website"
            value={newTokenInfo.website}
            onChange={(e) =>
              setNewTokenInfo({ ...newTokenInfo, website: e.target.value })
            }
          />
          <div className="group">
            <input
              placeholder="Logo URI"
              value={newTokenInfo.logoUri}
              readOnly={true}
            />
            <Button>
              Upload Logo
              <input
                type="file"
                onChange={(e: any) => {
                  uploadImage(e.target.files[0]);
                  e.target.value = null;
                }}
              />
            </Button>
          </div>
          <input
            placeholder="Decimals"
            type="number"
            value={newTokenInfo.decimals || ""}
            onChange={(e) =>
              setNewTokenInfo({
                ...newTokenInfo,
                decimals: Number(e.target.value),
              })
            }
          />
          <input
            placeholder="Total Supply"
            type="number"
            value={newTokenInfo.supply || ""}
            onChange={(e) => {
              setNewTokenInfo({
                ...newTokenInfo,
                supply: Number(e.target.value),
              });
            }}
          />
          <Button onClick={uploadMetadata}>Upload Metadata to IFS</Button>

          <Button type="submit" onClick={handleCreateToken}>
            Create Token
          </Button>
          <img src={newTokenInfo.logoUri} style={{ maxWidth: "80%" }}></img>
          {newTokenInfo.txHash && (
            <Link
              href={`https://solscan.io/tx/${newTokenInfo.txHash}`}
              target="_blank"
            >
              View Transaction
            </Link>
          )}
        </div>
      </div>
    </MyCard>
  );
}

const solScan = "https://solscan.io/tx/";
