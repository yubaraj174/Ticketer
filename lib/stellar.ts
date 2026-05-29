import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Account,
  xdr,
} from "@stellar/stellar-sdk";

export const getNetworkConfig = () => ({
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
});

export const getFreighterPublicKey = async (): Promise<string> => {
  const connected = await isConnected();
  if (!connected) throw new Error("Freighter not found");
  const access = await requestAccess();
  if (access.error) throw new Error(access.error);
  return access; // which resolves to the string public key
};

export const fundWithFriendbot = async (publicKey: string) => {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
  if (!res.ok) throw new Error("Friendbot funding failed");
  return res.json();
};

export const signAndSubmitTransaction = async (
  txXdr: string,
): Promise<SorobanRpc.Api.SendTransactionResponse> => {
  const { rpcUrl, networkPassphrase } = getNetworkConfig();

  // Sign the base64 XDR string via Freighter
  const signedResponse = await signTransaction(txXdr, { networkPassphrase });
  if (signedResponse.error) throw new Error(signedResponse.error);

  const signedXdr =
    typeof signedResponse === "string"
      ? signedResponse
      : signedResponse.signedTxXdr;
  if (!signedXdr) throw new Error("Failed to extract signed tx signature.");

  const server = new SorobanRpc.Server(rpcUrl);
  // Deserialize the signed XDR envelope back into a transaction
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  // Submit via Soroban RPC
  const sendResponse = await server.sendTransaction(tx);

  // Wait for completion
  if (sendResponse.status === "PENDING" || sendResponse.status === "SUCCESS") {
    let txStatus = await server.getTransaction(sendResponse.hash);
    while (txStatus.status === "NOT_FOUND") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      txStatus = await server.getTransaction(sendResponse.hash);
    }
    if (txStatus.status === "FAILED") {
      throw new Error("Transaction submission failed on network.");
    }
  } else if (sendResponse.errorResultXdr) {
    throw new Error("Submission declined.");
  }

  return sendResponse;
};
