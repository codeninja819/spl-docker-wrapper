import {
  Liquidity,
  LiquidityPoolKeysV4,
  ONE,
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID,
  Token,
  TokenAccount,
  TokenAmount,
  findProgramAddress,
  parseBigNumberish,
} from "@raydium-io/raydium-sdk";
import { buildAndSendTx, buildSwapInstructions } from "./swap";
// import { } from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetConfig,
} from "@solana/web3.js";
import { toast } from "react-toastify";
import { TransferRequest } from "../someTypes";
const WSOL = new Token(
  TOKEN_PROGRAM_ID,
  new PublicKey("So11111111111111111111111111111111111111112"),
  9,
  "WSOL",
  "WSOL"
);
import axios from "axios";

export async function sendTokens(
  connection: Connection,
  amount: number,
  to: PublicKey,
  sender: Keypair,
  token_mint_address: PublicKey
) {
  try {
    console.log(
      `Sending ${amount} ${token_mint_address} from ${sender.publicKey.toString()} to ${to}.`
    );

    //Step 1
    console.log(`1 - Getting Source Token Account`);
    let sourceAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      token_mint_address,
      sender.publicKey
    );
    console.log(`    Source Account: ${sourceAccount.address.toString()}`);

    //Step 2
    console.log(`2 - Getting Destination Token Account`);
    let destinationAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      sender,
      to,
      sender.publicKey
    );
    console.log(
      `    Destination Account: ${destinationAccount.address.toString()}`
    );

    //Step 3
    console.log(
      `3 - Fetching Number of Decimals for Mint: ${token_mint_address}`
    );
    const numberDecimals = await getNumberDecimals(
      connection,
      token_mint_address
    );
    console.log(`    Number of Decimals: ${numberDecimals}`);

    //Step 4
    console.log(`4 - Creating and Sending Transaction`);
    const tx = new Transaction();
    tx.add(
      createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        sender.publicKey,
        amount * Math.pow(10, numberDecimals)
      )
    );

    const latestBlockHash = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = await latestBlockHash.blockhash;
    const signature = await sendAndConfirmTransaction(connection, tx, [sender]);
    toast.success(`Send Token TX Success!🎉`);
    console.log(
      "\x1b[32m", //Green Text
      `   Transaction Success!🎉`,
      `\n    https://explorer.solana.com/tx/${signature}`
    );
    return signature;
  } catch (e: unknown) {
    toast.error(`Send Token TX Failed!🚨`);

    console.log(`[TRANSFER - ERROR] ${e}`);
    return null;
  }
}

export async function transferSolBulk(
  connection: Connection,
  transferRequests: TransferRequest[],
  sender: Keypair
) {
  console.log("transferRequests", transferRequests);
  try {
    const transaction = new Transaction();
    for (const transferRequest of transferRequests) {
      const sendSolInstruction = SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: transferRequest.destination,
        lamports: Number(transferRequest.amount),
      });

      transaction.add(sendSolInstruction);
    }

    const tx = await sendAndConfirmTransaction(connection, transaction, [
      sender,
    ]);
    console.log(
      `You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${tx}?cluster=mainnet-beta`
    );
    toast.success(`Send SOL TXs Success!🎉`);
    return tx;
  } catch (e: unknown) {
    toast.error(`Send SOL TXs Failed!🚨 ${e}`);
    console.log(`[TRANSFER - ERROR] ${e}`);
    return null;
  }
}
export async function transferSol(
  connection: Connection,
  amount: number,
  to: PublicKey,
  sender: Keypair
) {
  try {
    const transaction = new Transaction();

    const sendSolInstruction = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: to,
      lamports: amount,
    });

    transaction.add(sendSolInstruction);

    const tx = await sendAndConfirmTransaction(connection, transaction, [
      sender,
    ]);
    console.log(
      `You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${tx}`
    );
    toast.success(`Send SOL TX Success!🎉`);
    return tx;
  } catch (e: unknown) {
    toast.error(`Send SOL TX Failed!🚨`);
    console.log(`[TRANSFER - ERROR] ${e}`);
    return null;
  }
}

export async function getSolBalanceInLamports(
  connection: Connection,
  userAddress: PublicKey | string
) {
  try {
    if (typeof userAddress === "string") {
      userAddress = new PublicKey(userAddress);
    }
    const solAccount = await connection.getBalance(userAddress);
    console.log("SOL Balance: ", solAccount / LAMPORTS_PER_SOL);
    return solAccount;
  } catch (e: unknown) {
    console.log(`[GET SOL BALANCE - ERROR] ${e}`);
    toast.error(`Get SOL Balance Failed!🚨, ${e}`);
  }
  return null;
}
export async function getTokenBalance(
  connection: Connection,
  userAddress: PublicKey,
  mintAddress: PublicKey
) {
  try {
    const tokenAddress = await getAssociatedTokenAddress(
      mintAddress,
      userAddress
    );
    const tokenAccount = await connection.getTokenAccountBalance(
      tokenAddress,
      "confirmed"
    );
    console.log("Token Balance: ", tokenAccount.value.amount);
    return tokenAccount.value.amount;
  } catch (e: unknown) {
    console.log(`[GET TOKEN BALANCE - ERROR] ${e}`);
  }
  return null;
}
export async function getTokenWorth(
  connection: Connection,
  poolKeys: LiquidityPoolKeysV4,
  inputTokenAmount,
  outputToken,
  slippage
) {
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    amountIn: inputTokenAmount,
    currencyOut: outputToken,
    slippage: slippage,
  });
  return amountOut.raw / 10 ** amountOut.currency.decimals;
}

export const getLpQuoteWorth = async (
  connection: Connection,
  poolKeys: LiquidityPoolKeysV4
) => {
  //  const getQuoteBalance = (connection, poolKeys) ({

  return (
    (await connection.getBalance(poolKeys.quoteVault)) /
    10 ** poolKeys.quoteDecimals
  );
};

export async function sellTokens(
  connection: Connection,
  walletSecretKey: Uint8Array,
  poolKeys: LiquidityPoolKeysV4,
  PercentageAsDecimal: number
) {
  try {
    const walletKeypair = Keypair.fromSecretKey(walletSecretKey);
    const tokenAccountRawInfos_Swap = await getWalletTokenAccount(
      connection,
      walletKeypair.publicKey
    );

    const swapToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys.baseMint,
      poolKeys.baseDecimals
    );
    const swapTokenAccount = getATAAddress(
      TOKEN_PROGRAM_ID,
      walletKeypair.publicKey,
      poolKeys.baseMint
    );
    let swap_account_balance1 = await connection.getTokenAccountBalance(
      swapTokenAccount.publicKey
    );
    console.log(
      "[SWAP] Total tokens in wallet: ",
      swapTokenAccount.publicKey.toString(),
      " - ",
      swap_account_balance1.value.amount
    );
    const percentBalance = percentAmount(
      swap_account_balance1.value.amount,
      PercentageAsDecimal
    );
    console.log(
      `[Swap amount] swap_account_balance1 After Total: ${percentBalance}`
    );
    let inputTokenAmount = new TokenAmount(swapToken, percentBalance);
    const minAmountOut = new TokenAmount(WSOL, parseBigNumberish(ONE));

    const swap_ix = await buildSwapInstructions(
      connection,
      poolKeys,
      tokenAccountRawInfos_Swap,
      walletKeypair,
      inputTokenAmount,
      minAmountOut
    );
    const txids = await buildAndSendTx(connection, walletKeypair, swap_ix, {
      skipPreflight: false,
      maxRetries: 30,
    });
    console.log(`Sell - Signature ${txids[0]}`);
    return txids[0];
  } catch (e: unknown) {
    toast.error(`Sell Token TX Failed!🚨`);
    console.log(`[SWAP - SELL - ERROR] ${e}`);
  }
}

export async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

function percentAmount(amount: string, percent: number): string {
  const inputNum = BigInt(amount); // Convert string to BigInt
  const result = inputNum * BigInt(percent * 100); // Multiply by percent
  return (result / BigInt(100)).toString(); // Round down to the nearest integer
}

export function getATAAddress(
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

async function getNumberDecimals(
  connection: Connection,
  mintAddress: PublicKey
): Promise<number> {
  const info = await connection.getParsedAccountInfo(mintAddress);
  const result = (info.value?.data as ParsedAccountData).parsed.info
    .decimals as number;
  return result;
}

interface SolanaFeeInfo {
  min: number;
  max: number;
  avg: number;
  priorityTx: number;
  nonVotes: number;
  priorityRatio: number;
  avgCuPerBlock: number;
  blockspaceUsageRatio: number;
}
type SolanaFeeInfoJson = {
  "1": SolanaFeeInfo;
  "5": SolanaFeeInfo;
  "15": SolanaFeeInfo;
};

export async function getComputeBudgetConfigHigh(): Promise<
  ComputeBudgetConfig | undefined
> {
  const response = await axios.get<SolanaFeeInfoJson>(
    "https://solanacompass.com/api/fees"
  );
  const json = response.data;
  const { avg } = json?.[15] ?? {};
  if (!avg) return undefined; // fetch error
  return {
    units: 5000000,
    microLamports: Math.min(Math.ceil((avg * 1000000) / 600000), 25000),
  } as ComputeBudgetConfig;
}
