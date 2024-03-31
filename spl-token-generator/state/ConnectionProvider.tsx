import { Connection } from "@solana/web3.js";
import { createContainer } from "unstated-next"; // State management

function useConnection() {
  const rpcConnection = new Connection(process.env.RPC_URL, "confirmed");
  return {
    rpcConnection,
  };
}
export const web3Connection = createContainer(useConnection);
