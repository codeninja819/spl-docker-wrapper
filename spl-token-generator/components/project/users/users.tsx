import styles from "styles/pages/Token.module.scss"; // Page styles

import {
  Button,
  ButtonGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@nextui-org/react";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getComputeBudgetConfigHigh } from "components/project/users/buySellTransferMonitor";
import * as bs58 from "bs58";
import { MyCard } from "components/MyCard";
import { CsvDataService } from "components/utils/csvDataService";
import { useState } from "react";
import { toast } from "react-toastify";
import { Id } from "react-toastify/dist/types";
import { web3Connection } from "state/ConnectionProvider";
import { store } from "../../../state/StateProvider";
import {
  getSolBalanceInLamports,
  getTokenBalance,
  sellTokens,
  transferSol,
} from "./buySellTransferMonitor";
import { buildAndSendTx } from "components/project/users/swap";
import { getWalletTokenAccount } from "components/project/users/buySellTransferMonitor";
import {
  LiquidityPoolKeysV4,
  Liquidity,
  Token,
  TOKEN_PROGRAM_ID,
  findProgramAddress,
  TokenAmount,
  TxVersion,
} from "@raydium-io/raydium-sdk";
interface SellerHandler {
  id: number | null;
  amountAsPercentageWholeNumber: number;
}
export default function Users() {
  const {
    poolInputData,
    payers,
    poolKeys,
    userAccounts,
    setUserAccounts,
    activeToken,
    solDistributorConfig,
    setSolDistributorConfig,
  } = store.useContainer();
  const [currentSellerHandler, setCurrentSellerHandler] =
    useState<SellerHandler>({
      id: null,
      amountAsPercentageWholeNumber: 0,
    });

  const { rpcConnection } = web3Connection.useContainer();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const alertClearWalletsModal = useDisclosure();
  const sellTokensModal = useDisclosure();
  const [newAddressesConfig, setNewAddressesConfig] = useState({
    gasToLeavePerWallet: 0.015,
    minPercentageOfSupplyToPurchase: 1,
    maxPercentageOfSupplyToPurchase: 2,
    userCount: 3,
    collectorAddress: "",
  });
  const getUserByID = (id: number) => {
    console.log("Getting user by id", id);
    const userAccount = userAccounts.find(
      (account) => String(account.id) === String(id)
    );
    console.log("User account", userAccount);
    return userAccount;
  };

  const performSellTokens = () => {
    if (currentSellerHandler.amountAsPercentageWholeNumber === 0) {
      toast.error("Cannot sell 0 tokens");
      return;
    }

    if (!poolKeys) {
      toast.error("Pool info not available");
      return;
    }
    const sellingToast = toast.loading("Selling tokens");

    console.log(
      `Selling ${currentSellerHandler.amountAsPercentageWholeNumber}% of tokens in wallet`
    );
    const userAccount = getUserByID(currentSellerHandler.id!);

    if (!userAccount) {
      toast.error("User account not found");
      return;
    }

    sellTokens(
      rpcConnection,
      userAccount!.secretKey,
      poolKeys,
      currentSellerHandler.amountAsPercentageWholeNumber
    ).then(async (txid) => {
      rpcConnection
        .confirmTransaction(txid, "confirmed")
        .then(async (res) => {
          toast.success(`Sell Token TX Success!🎉`);
          await updateUserBalances();
        })
        .catch((e) => {
          toast.error(`Failed to sell tokens ${e}`);
        });
    });
    toast.dismiss(sellingToast);
  };
  const handleRowClicked = async (id: number) => {
    console.log("Clicked", id);
    await updateSingleUserBalance(id);

    sellTokensModal.onOpen();
    setCurrentSellerHandler({ ...currentSellerHandler, id: id });
  };
  const getRequiredSol = (percentageToPurchaseAsWholeNumber: number) => {
    return (
      (percentageToPurchaseAsWholeNumber / 100) *
      poolInputData.totalTokensInPool *
      poolInputData.pricePerTokenInSol
    );
  };

  const amountOfTokensToBuy = (
    percentageOfSUpplyToPurchaseAsWholeNumber: number
  ) => {
    return (
      (percentageOfSUpplyToPurchaseAsWholeNumber / 100) *
      poolInputData.totalTokensInPool
    );
  };

  const generateAddress = () => {
    return Keypair.generate();
  };
  const updateSingleAccount = (id, updatedParamDict) => {
    setUserAccounts((userAccounts) =>
      userAccounts.map((acc) =>
        acc.id === id ? { ...acc, ...updatedParamDict } : acc
      )
    );
  };

  const updateSingleUserBalance = async (id: any) => {
    const userAccount = getUserByID(id);
    if (!userAccount) {
      toast.error("User account not found");
      return;
    }
    if (!activeToken.address) {
      toast.error("Token not set");
      return;
    }
    const solBalance = await getSolBalanceInLamports(
      rpcConnection,
      userAccount.publicKey
    );

    if (solBalance == null) {
      toast.error("Failed to get sol balance");
      return;
    }
    userAccount.solBalance = solBalance / LAMPORTS_PER_SOL;

    let tokenBalance = await getTokenBalance(
      rpcConnection,
      userAccount.publicKey,
      new PublicKey(activeToken.address)
    );

    userAccount.tokenBalance = Number(tokenBalance || 0) / LAMPORTS_PER_SOL;

    updateSingleAccount(userAccount.id, userAccount);
  };

  const updateUserBalances = async () => {
    if (activeToken.address === "") {
      toast.error("Token not set");
      return;
    }
    const loadingToast = toast.loading("Updating balances", {
      autoClose: 20000,
    });

    const updatedUserAccounts: any = [];
    for (let i = 0; i < userAccounts.length; i++) {
      const account = userAccounts[i];
      const newAccount = account;
      const solBalance = await getSolBalanceInLamports(
        rpcConnection,
        account.publicKey
      );

      if (solBalance == null) {
        toast.error("Failed to get sol balance");
        return;
      }
      newAccount.solBalance = solBalance / LAMPORTS_PER_SOL;

      let tokenBalance = await getTokenBalance(
        rpcConnection,
        account.publicKey,
        new PublicKey(activeToken.address)
      );

      newAccount.tokenBalance = Number(tokenBalance || 0) / LAMPORTS_PER_SOL;

      updatedUserAccounts.push(newAccount);
    }

    setUserAccounts(updatedUserAccounts);

    toast.dismiss(loadingToast);
    toast.success("Balances updated");
    console.log("Updated user accounts", updatedUserAccounts);
    // console.log("Updated user accounts", updatedUserAccounts);
  };

  const collectAllSolToCollectorAddress = () => {
    if (!newAddressesConfig.collectorAddress) {
      toast.error("Collector Address not set");
      return;
    }

    if (userAccounts.length == 0) {
      toast.error("No accounts selected to collect from");
      return;
    }

    userAccounts.forEach(async (account) => {
      const collectorPublicKey = new PublicKey(
        newAddressesConfig.collectorAddress
      );
      const minBalance = Math.max(
        newAddressesConfig.gasToLeavePerWallet,
        0.001
      );
      const currentBalanceInLamports = await getSolBalanceInLamports(
        rpcConnection,
        account.publicKey
      );
      if (!currentBalanceInLamports) {
        toast.error("Failed to get balance");
        return;
      }
      console.log("Current balance in lamports", currentBalanceInLamports);
      const currentBalanceInSol = currentBalanceInLamports / LAMPORTS_PER_SOL;

      const amountToTransfer = Math.floor(
        (currentBalanceInSol - minBalance) * LAMPORTS_PER_SOL
      );
      console.log("Amount to transfer", amountToTransfer);
      console.log("Total Balance", currentBalanceInSol);
      if (amountToTransfer <= 0) {
        toast.error("Insufficient balance to transfer");
        return;
      }
      toast.success("Transferring SOL");
      //TODO: Enabling this will transfer the sol
      const txid = await transferSol(
        rpcConnection,
        amountToTransfer,
        collectorPublicKey,
        account.keypair
      );
      if (txid) {
        toast.success(
          `Transferred ${amountToTransfer / LAMPORTS_PER_SOL} SOL to collector`
        );
      } else {
        toast.error("Failed to collect SOL");
      }
    });
  };
  // Handler for button click to generate 10 GUIDs and update state
  const handleGenerateUserAddresses = () => {
    const newAccounts: any[] = [];

    for (let i = 0; i < newAddressesConfig.userCount; i++) {
      const account = generateAddress();
      const percentageOfPoolToPurchase = randomBetweenRange(
        newAddressesConfig.minPercentageOfSupplyToPurchase,
        newAddressesConfig.maxPercentageOfSupplyToPurchase
      );
      const userData = {
        id: i,
        publicKey: account.publicKey,
        privateKey: bs58.encode(account.secretKey),
        keypair: account,
        secretKey: account.secretKey,
        totalSolRequired: getRequiredSol(percentageOfPoolToPurchase),
        percentageOfPoolToPurchase: percentageOfPoolToPurchase,
        gasToLeavePerWallet: newAddressesConfig.gasToLeavePerWallet,
        tokenBalance: 0,
        solBalance: 0,
        tokenAmountToSell: 0,
        amountOfTokensToBuy: amountOfTokensToBuy(percentageOfPoolToPurchase),
      };
      console.log(userData);
      newAccounts.push(userData);
    }
    setUserAccounts(newAccounts);

    const solRequiredForAllWallets =
      calculateTotalSolRequiredToFundSubWallets();
    setSolDistributorConfig({
      ...solDistributorConfig,
      solRequiredToFundWallets: solRequiredForAllWallets,
    });
    console.log(
      "Seting user accounts",
      newAccounts,
      newAddressesConfig.userCount
    );
    CsvDataService.exportToCsv("exportedAccounts.csv", newAccounts);
  };

  const calculateTotalSolRequiredToFundSubWallets = () => {
    let totalSolRequired = 0;
    userAccounts.forEach((account) => {
      totalSolRequired +=
        account.totalSolRequired + solDistributorConfig.gasToDepositPerWallet;
    });
    console.log("Total sol required", totalSolRequired);
    return totalSolRequired;
  };

  async function ammRemoveLiquidity() {
    const loadingToast = toast.loading("Removing liquidity");
    console.log("starting AMM remove liq");
    if (!poolKeys) {
      toast.error("Pool info not available");
      return;
    }
    if (!payers.poolCreator.keypair) {
      toast.error("Pool Private Key is not set");
      return;
    }
    try {
      const lpToken = new Token(
        TOKEN_PROGRAM_ID,
        poolKeys.lpMint,
        poolKeys.lpDecimals
      ); // LP

      const lpTokenAccount = getATAAddress(
        TOKEN_PROGRAM_ID,
        payers.poolCreator.keypair.publicKey,
        poolKeys.lpMint
      );
      console.log("lpTokenAccount", lpTokenAccount.toString());
      let LP_account_balance1 = await rpcConnection.getTokenAccountBalance(
        lpTokenAccount.publicKey
      );
      toast.info(`LP Balance Total: ${LP_account_balance1.value.amount}`);
      const percentBalance = percentAmount(LP_account_balance1.value.amount, 1);
      toast.info(`Removing: ${percentBalance}`);

      const tokenAccountRawInfos_LP = await getWalletTokenAccount(
        rpcConnection,
        payers.poolCreator.keypair.publicKey
      );
      // const computeBudgetConfig = getComputeBudgetConfigHigh();
      const lp_ix = await Liquidity.makeRemoveLiquidityInstructionSimple({
        connection: rpcConnection,
        poolKeys: poolKeys as LiquidityPoolKeysV4,
        userKeys: {
          owner: payers.poolCreator.keypair.publicKey,
          payer: payers.poolCreator.keypair.publicKey,
          tokenAccounts: tokenAccountRawInfos_LP,
        },
        amountIn: new TokenAmount(lpToken, percentBalance),
        makeTxVersion: TxVersion.V0,
        computeBudgetConfig: { units: 50000, microLamports: 20000 },
      });

      let txids = await buildAndSendTx(
        rpcConnection,
        payers.poolCreator.keypair,
        lp_ix.innerTransactions,
        { skipPreflight: true, maxRetries: 30 }
      );
      toast.dismiss(loadingToast);
      toast.success(`LP Removal success - Signature: ${txids[0]}`);
    } catch (e: unknown) {
      toast.dismiss(loadingToast);
      toast.error(`LP Removal failed: ${e}`);
    }
  }
  function percentAmount(amount: string, percent: number): string {
    const inputNum = BigInt(amount); // Convert string to BigInt
    const result = inputNum * BigInt(percent * 100); // Multiply by percent
    return (result / BigInt(100)).toString(); // Round down to the nearest integer
  }

  function getATAAddress(
    programId: PublicKey,
    owner: PublicKey,
    mint: PublicKey
  ) {
    const { publicKey, nonce } = findProgramAddress(
      [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
    return { publicKey, nonce };
  }

  const randomBetweenRange = (min: number, max: number) => {
    let difference = max - min;

    let rand = Math.random();

    rand = rand * difference;

    rand = rand + min;

    return rand;
  };

  const userAccountColumnHeaders = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Private Key",
      dataIndex: "privateKey",
      key: "privateKey",
    },
    {
      title: "Public Key",
      dataIndex: "publicKey",
      key: "publicKey",
    },
    {
      title: "Sol Required",
      dataIndex: "totalSolRequired",
      key: "totalSolRequired",
    },
    {
      title: "Percentage of Pool",
      dataIndex: "percentageOfPoolToPurchase",
      key: "percentageOfPoolToPurchase",
    },
    {
      title: "Amount of Tokens to Buy",
      dataIndex: "amountOfTokensToBuy",
      key: "amountOfTokensToBuy",
    },
    {
      title: "Token Balance",
      dataIndex: "tokenBalance",
      key: "tokenBalance",
    },
    {
      title: "Sol Balance",
      dataIndex: "solBalance",
      key: "solBalance",
    },
  ];

  return (
    <MyCard name="Buyers / Sellers" fullWidth={true}>
      <div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-3  column-gap-2">
            <Button onPress={onOpen} isDisabled={userAccounts.length > 0}>
              Create New Users
            </Button>
            <Button
              isDisabled={userAccounts.length == 0}
              onPress={alertClearWalletsModal.onOpen}
            >
              Clear all current wallets
            </Button>
          </div>
          <div className="flex flex-row gap-3  column-gap-2">
            <Button
              onClick={collectAllSolToCollectorAddress}
              isDisabled={userAccounts.length == 0}
            >
              Collect All Sol
            </Button>
            <Button
              isDisabled={userAccounts.length == 0}
              onClick={updateUserBalances}
            >
              Refresh wallet balances
            </Button>
          </div>
          <div className="flex flex-row gap-3  column-gap-2">
            <Button onClick={ammRemoveLiquidity} color="danger">
              Remove Liquidity
            </Button>
          </div>
        </div>
        <Modal
          isOpen={alertClearWalletsModal.isOpen}
          onOpenChange={alertClearWalletsModal.onOpenChange}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Clear existing user wallets
                </ModalHeader>
                <ModalBody>
                  <p>
                    Are you sure you want to clear all existing user wallets?
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button color="default" variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="danger"
                    onPress={onClose}
                    onClick={() => {
                      setUserAccounts([]);
                    }}
                  >
                    Action
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          className="dark text-foreground border border-white"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Generate New Addresses
                </ModalHeader>
                <ModalBody>
                  <div className={styles.token}>
                    <div className={styles.form} style={{ width: "100%" }}>
                      <label>
                        Residual gas to leave per wallet when collecting
                      </label>

                      <input
                        type="number"
                        step={0.0}
                        value={newAddressesConfig.gasToLeavePerWallet}
                        onChange={(e) => {
                          setNewAddressesConfig({
                            ...newAddressesConfig,
                            gasToLeavePerWallet: Number(e.target.value),
                          });
                        }}
                      ></input>

                      <label>User Count</label>
                      <input
                        type="number"
                        value={newAddressesConfig.userCount}
                        onChange={(e) => {
                          setNewAddressesConfig({
                            ...newAddressesConfig,
                            userCount: Number(e.target.value),
                          });
                        }}
                      ></input>
                      <label>Percentage of supply to purchase per wallet</label>
                      <div className="group">
                        <label>Min</label>
                        <input
                          type="number"
                          placeholder="Min"
                          step={0.1}
                          min={0}
                          value={
                            newAddressesConfig.minPercentageOfSupplyToPurchase
                          }
                          onChange={(e) => {
                            setNewAddressesConfig({
                              ...newAddressesConfig,
                              minPercentageOfSupplyToPurchase: Number(
                                e.target.value
                              ),
                            });
                          }}
                        ></input>
                      </div>
                      <div className="group">
                        <label>Max</label>
                        <input
                          type="number"
                          placeholder="Max"
                          step={0.1}
                          min={0}
                          value={
                            newAddressesConfig.maxPercentageOfSupplyToPurchase
                          }
                          onChange={(e) => {
                            setNewAddressesConfig({
                              ...newAddressesConfig,
                              maxPercentageOfSupplyToPurchase: Number(
                                e.target.value
                              ),
                            });
                          }}
                        ></input>
                      </div>

                      <input
                        placeholder="Address to send SOL when you collect"
                        value={newAddressesConfig.collectorAddress}
                        onChange={(e) => {
                          let collectorAddress = e.target.value;
                          try {
                            const collectorPublicKey = new PublicKey(
                              collectorAddress
                            );
                            toast.success("Valid collector address");
                          } catch (e) {
                            toast.error("Invalid collector address");
                            collectorAddress = "";
                          }

                          setNewAddressesConfig({
                            ...newAddressesConfig,
                            collectorAddress: collectorAddress,
                          });
                        }}
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Close
                  </Button>
                  <Button
                    color="primary"
                    onPress={onClose}
                    onClick={handleGenerateUserAddresses}
                    isDisabled={
                      newAddressesConfig.collectorAddress === "" ||
                      newAddressesConfig.userCount === 0 ||
                      newAddressesConfig.maxPercentageOfSupplyToPurchase ===
                        0 ||
                      newAddressesConfig.minPercentageOfSupplyToPurchase === 0
                    }
                  >
                    Generate Addresses
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
        <Modal
          isOpen={sellTokensModal.isOpen}
          onOpenChange={sellTokensModal.onOpenChange}
          className="dark text-foreground border border-white"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Sell</ModalHeader>
                <ModalBody>
                  <div className={styles.token}>
                    <div className={styles.form} style={{ width: "100%" }}>
                      <div className="flex flex-col gap-3">
                        <h2>
                          {userAccounts[
                            currentSellerHandler.id!
                          ].publicKey.toString()}
                        </h2>
                        <br></br>
                      </div>
                      <label>Current Sol Balance</label>
                      <input
                        value={
                          userAccounts[currentSellerHandler.id!].solBalance
                        }
                        readOnly={true}
                      ></input>
                      <label>Current Token Balance</label>
                      <input
                        value={
                          userAccounts[currentSellerHandler.id!].tokenBalance
                        }
                        readOnly={true}
                      ></input>
                      <label>Percentage to sell</label>
                      <ButtonGroup>
                        <Button
                          onClick={() => {
                            setCurrentSellerHandler({
                              ...currentSellerHandler,
                              amountAsPercentageWholeNumber: Number(0.1),
                            });
                          }}
                        >
                          10%
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentSellerHandler({
                              ...currentSellerHandler,
                              amountAsPercentageWholeNumber: Number(0.2),
                            });
                          }}
                        >
                          20%
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentSellerHandler({
                              ...currentSellerHandler,
                              amountAsPercentageWholeNumber: Number(0.5),
                            });
                          }}
                        >
                          50%
                        </Button>
                        <Button
                          onClick={() => {
                            setCurrentSellerHandler({
                              ...currentSellerHandler,
                              amountAsPercentageWholeNumber: Number(1),
                            });
                          }}
                        >
                          100%
                        </Button>
                      </ButtonGroup>
                      <label>Tokens to sell</label>
                      <input
                        readOnly={true}
                        value={
                          currentSellerHandler.amountAsPercentageWholeNumber *
                          (userAccounts[currentSellerHandler.id!]
                            ?.tokenBalance || 0)
                        }
                      ></input>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Close
                  </Button>
                  <Button
                    color="primary"
                    onPress={onClose}
                    onClick={performSellTokens}
                    isDisabled={
                      currentSellerHandler.amountAsPercentageWholeNumber === 0
                    }
                  >
                    Sell
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>

      <Table
        aria-label="Tokens in current LP account"
        onRowAction={(key) => handleRowClicked(key as number)}
      >
        <TableHeader columns={userAccountColumnHeaders}>
          {(column) => (
            <TableColumn key={column.key}>{column.title} </TableColumn>
          )}
        </TableHeader>
        <TableBody>
          {userAccounts.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.id}</TableCell>
              <TableCell>{item.privateKey} </TableCell>
              <TableCell>{item.publicKey.toString()}</TableCell>
              <TableCell>{item.totalSolRequired.toFixed(2)}</TableCell>
              <TableCell>
                {item.percentageOfPoolToPurchase.toFixed(2)}
              </TableCell>
              <TableCell>{item.amountOfTokensToBuy.toFixed(2)}</TableCell>
              <TableCell>{item.tokenBalance}</TableCell>
              <TableCell>{item.solBalance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MyCard>
  );
}
