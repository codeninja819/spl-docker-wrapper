// import { FileUpload } from 'primereact/fileupload';
import { Keypair } from "@solana/web3.js";
import * as bs58 from "bs58";
import { toast } from "react-toastify";
import { store } from "state/StateProvider";
interface KeyProps {
  label: string;
  currentPK: string;
  dictKey: string;
}
export function Key({ label, currentPK, dictKey }: KeyProps) {
  const { payers, setPayers } = store.useContainer();
  const newKeypair = (pk: string) => {
    let keypair;
    let privateKey = "";
    try {
      keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(pk)));
      privateKey = pk;
      toast.success(` ${dictKey} Private Key is set`);
    } catch (e) {
      console.error(e);
      keypair = null;
      privateKey = "";
      toast.error("Paste a valid private key");
    }
    return { keypair, privateKey };
  };
  return (
    <>
      <label>{label}</label>
      <input
        value={currentPK}
        placeholder={`${label} Private Key`}
        onChange={(e) => {
          let { keypair, privateKey } = newKeypair(e.target.value);
          setPayers({
            ...payers,
            [dictKey]: { keypair: keypair, privateKey: privateKey },
          });
        }}
      />
    </>
  );
}
