import { Keypair, PublicKey } from "@solana/web3.js";
import { useState } from "react"; // React
import { createContainer } from "unstated-next"; // State management
interface PoolKeypair {
  keypair: Keypair | null;
  privateKey: string;
}

interface Payers {
  jitoFees: PoolKeypair;
  poolCreator: PoolKeypair;
  walletDistributor: PoolKeypair;
}
interface ActiveTokenData {
  address: string;
  name: string;
  symbol: string;
  logoUri: string;
  supply: number;
  decimals: number;
  description: string;
  telegram: string;
  twitter: string;
  website: string;
  imageCID: string;
  metadataCID: string;
  txHash: string;
}

interface UserAccount {
  id: number;
  publicKey: PublicKey;
  privateKey: string;
  keypair: Keypair;
  secretKey: Uint8Array;
  totalSolRequired: number;
  percentageOfPoolToPurchase: number;
  tokenBalance: number;
  solBalance: number;
  tokenAmountToSell: number;
  amountOfTokensToBuy: number;
  gasToLeavePerWallet: number;
}
function useStore() {
  const [tokens, setTokens] = useState<any[]>([]);

  function addToken(token: any) {
    setTokens((t) => [...t, token]);
  }

  const [solDistributorConfig, setSolDistributorConfig] = useState({
    solRequiredToFundWallets: 0,
    gasToDepositPerWallet: 0,
  });

  const [activeToken, setActiveToken] = useState<ActiveTokenData>({
    address: "",
    name: "",
    symbol: "",
    logoUri: "",
    supply: 0,
    decimals: 0,
    description: "",
    telegram: "",
    twitter: "",
    website: "",
    imageCID: "",
    metadataCID: "",
    txHash: "",
  });

  const [poolKeys, setPoolKeys] = useState<any>(null);

  const [payers, setPayers] = useState<Payers>({
    jitoFees: { keypair: null, privateKey: "" },
    poolCreator: { keypair: null, privateKey: "" },
    walletDistributor: { keypair: null, privateKey: "" },
  });

  const [newTokenInfo, setNewTokenInfo] = useState({
    name: "",
    symbol: "",
    logoUri: "",
    supply: 0,
    decimals: 0,
    description: "",
    telegram: "",
    twitter: "",
    website: "",
    imageCID: "",
    metadataCID: "",
    txHash: "",
  });
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [gasToLeavePerWallet, setGasToLeavePerWallet] = useState(0);
  const [gasToFundToEachDispersionWallet, setGasToFundToEachDispersionWallet] =
    useState(0);
  const [poolInputData, setPoolInputData] = useState({
    marketId: "",
    totalTokenSupply: 0,
    percentageOfTokenSupplyToAddToPool: 1,
    totalTokensInPool: 0,
    solToAddToPool: 10,
    pricePerTokenInSol: 0,
    jitoFeesInSol: 0.015,
  });

  return {
    addToken,
    tokens,
    setTokens,
    activeToken,
    setActiveToken,
    poolKeys,
    setPoolKeys,
    poolInputData,
    setPoolInputData,
    userAccounts,
    setUserAccounts,
    newTokenInfo,
    setNewTokenInfo,
    gasToLeavePerWallet,
    setGasToLeavePerWallet,
    gasToFundToEachDispersionWallet,
    setGasToFundToEachDispersionWallet,
    payers,
    setPayers,
    solDistributorConfig,
    setSolDistributorConfig,
  };
}
export const store = createContainer(useStore);
