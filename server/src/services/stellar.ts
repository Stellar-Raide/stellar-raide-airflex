import {
  Horizon,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  Contract,
} from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE =
  process.env["STELLAR_NETWORK"] === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

const HORIZON_URL =
  process.env["HORIZON_URL"] ?? "https://horizon-testnet.stellar.org";

const SOROBAN_RPC_URL =
  process.env["SOROBAN_RPC_URL"] ?? "https://soroban-testnet.stellar.org";

const horizonServer = new Horizon.Server(HORIZON_URL, { allowHttp: false });
const sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL, {
  allowHttp: false,
});

/**
 * Calls the smart contract's `create_listing` function.
 *
 * In a real system the seller's keypair would come from a secure vault or
 * be signed client-side. Here we derive it from the seller's stored secret
 * or a platform hot-wallet for demonstration purposes.
 *
 * @returns The contract listing ID (stringified i128 sequence number)
 */
export async function createListing(params: {
  sellerPublicKey: string;
  sellerSecretKey: string;
  assetType: string;
  amount: number;
  expiresAt: Date;
}): Promise<string> {
  const contractAddress = process.env["ESCROW_CONTRACT_ADDRESS"];
  if (!contractAddress) {
    throw new Error("ESCROW_CONTRACT_ADDRESS environment variable is not set");
  }

  const keypair = Keypair.fromSecret(params.sellerSecretKey);
  const account = await horizonServer.loadAccount(params.sellerPublicKey);

  const contract = new Contract(contractAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "create_listing",
        new Address(params.sellerPublicKey).toScVal(),
        nativeToScVal(params.assetType, { type: "symbol" }),
        nativeToScVal(BigInt(params.amount * 1_000_000), { type: "i128" }),
        nativeToScVal(
          BigInt(Math.floor(params.expiresAt.getTime() / 1000)),
          { type: "u64" }
        )
      )
    )
    .setTimeout(30)
    .build();

  const preparedTx = await sorobanServer.prepareTransaction(tx);
  preparedTx.sign(keypair);

  const response = await sorobanServer.sendTransaction(preparedTx);

  if (response.status === "ERROR") {
    throw new Error(
      `Contract create_listing failed: ${JSON.stringify(response.errorResult)}`
    );
  }

  // Poll until the transaction is confirmed
  const listingId = await pollForResult(response.hash);
  return listingId;
}

/**
 * Calls the smart contract's `deposit_to_escrow` function to lock
 * a buyer's funds against a specific listing.
 *
 * @returns Transaction hash of the confirmed escrow deposit
 */
export async function depositToEscrow(params: {
  buyerPublicKey: string;
  buyerSecretKey: string;
  listingId: string;
  amount: number;
}): Promise<string> {
  const contractAddress = process.env["ESCROW_CONTRACT_ADDRESS"];
  if (!contractAddress) {
    throw new Error("ESCROW_CONTRACT_ADDRESS environment variable is not set");
  }

  const keypair = Keypair.fromSecret(params.buyerSecretKey);
  const account = await horizonServer.loadAccount(params.buyerPublicKey);

  const contract = new Contract(contractAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "deposit_to_escrow",
        nativeToScVal(params.listingId, { type: "symbol" }),
        new Address(params.buyerPublicKey).toScVal(),
        nativeToScVal(BigInt(params.amount * 1_000_000), { type: "i128" })
      )
    )
    .setTimeout(30)
    .build();

  const preparedTx = await sorobanServer.prepareTransaction(tx);
  preparedTx.sign(keypair);

  const response = await sorobanServer.sendTransaction(preparedTx);

  if (response.status === "ERROR") {
    throw new Error(
      `Contract deposit_to_escrow failed: ${JSON.stringify(response.errorResult)}`
    );
  }

  await pollForResult(response.hash);
  return response.hash;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Polls Soroban RPC until a submitted transaction reaches a terminal state.
 * Returns the stringified return value on SUCCESS, throws on FAILED.
 */
async function pollForResult(hash: string): Promise<string> {
  const MAX_ATTEMPTS = 20;
  const INTERVAL_MS = 1_500;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await sleep(INTERVAL_MS);
    const result = await sorobanServer.getTransaction(hash);

    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      // Extract the first return value from the transaction meta
      const returnValue = (result as SorobanRpc.Api.GetSuccessfulTransactionResponse)
        .returnValue;
      if (returnValue) {
        return scValToString(returnValue);
      }
      return hash;
    }

    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction ${hash} failed on-chain`);
    }
    // NOT_FOUND means still pending — keep polling
  }

  throw new Error(`Transaction ${hash} did not confirm within timeout`);
}

function scValToString(val: xdr.ScVal): string {
  try {
    // i128 / u64 return values
    if (
      val.switch() === xdr.ScValType.scvI128() ||
      val.switch() === xdr.ScValType.scvU64()
    ) {
      return val.value()?.toString() ?? "";
    }
    if (val.switch() === xdr.ScValType.scvSymbol()) {
      return val.sym()?.toString() ?? "";
    }
    if (val.switch() === xdr.ScValType.scvString()) {
      return val.str()?.toString() ?? "";
    }
  } catch {
    // fall through
  }
  return "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
