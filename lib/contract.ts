import {
  SorobanRpc,
  Address,
  nativeToScVal,
  scValToNative,
  Contract,
  TransactionBuilder,
  Account,
  xdr,
} from "@stellar/stellar-sdk";
import {
  getNetworkConfig,
  signAndSubmitTransaction,
  getFreighterPublicKey,
} from "./stellar";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;

async function formulateWriteTx(
  publicKey: string,
  method: string,
  args: xdr.ScVal[] = [],
) {
  const { rpcUrl, networkPassphrase } = getNetworkConfig();
  const server = new SorobanRpc.Server(rpcUrl);

  // Load account
  const source = await server.getAccount(publicKey);
  const account = new Account(publicKey, source.sequenceNumber());
  const contract = new Contract(CONTRACT_ID);

  // Initial simulation tx
  let tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate execution
  const simulated = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simulated)) {
    throw new Error(`Transaction simulation failed: ${simulated.error}`);
  }

  // Assemble with valid fee and footprint
  const preparedTx = SorobanRpc.assembleTransaction(
    tx,
    networkPassphrase,
    simulated,
  );
  return preparedTx.toXDR();
}

async function runSimulatedRead(method: string, args: xdr.ScVal[] = []) {
  const { rpcUrl } = getNetworkConfig();
  const server = new SorobanRpc.Server(rpcUrl);
  const contract = new Contract(CONTRACT_ID);

  // Create an arbitrary transaction structure for simulation solely
  const txCall = contract.call(method, ...args);

  const sourceAccount = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: getNetworkConfig().networkPassphrase,
  })
    .addOperation(txCall)
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationSuccess(simulated)) {
    if (simulated.result && simulated.result.retval) {
      return scValToNative(simulated.result.retval);
    }
  } else {
    throw new Error(`Simulation read error`);
  }
  return null;
}

// ---------------- WRITE METHODS ---------------- //

export async function buyTicket(ticketId: number) {
  const pubKey = await getFreighterPublicKey();
  const txXdr = await formulateWriteTx(pubKey, "buy_ticket", [
    new Address(pubKey).toScVal(),
    nativeToScVal(ticketId, { type: "u64" }),
  ]);
  return await signAndSubmitTransaction(txXdr);
}

export async function mintTicket(
  eventName: string,
  date: string,
  seatNumber: string,
) {
  const pubKey = await getFreighterPublicKey();
  const txXdr = await formulateWriteTx(pubKey, "mint", [
    nativeToScVal(eventName, { type: "string" }),
    nativeToScVal(date, { type: "string" }),
    nativeToScVal(seatNumber, { type: "string" }),
  ]);
  return await signAndSubmitTransaction(txXdr);
}

export async function transferTicket(to: string, ticketId: number) {
  const pubKey = await getFreighterPublicKey();
  const txXdr = await formulateWriteTx(pubKey, "transfer", [
    new Address(pubKey).toScVal(),
    new Address(to).toScVal(),
    nativeToScVal(ticketId, { type: "u64" }),
  ]);
  return await signAndSubmitTransaction(txXdr);
}

export async function scanTicket(ticketId: number) {
  const pubKey = await getFreighterPublicKey();
  const txXdr = await formulateWriteTx(pubKey, "scan", [
    nativeToScVal(ticketId, { type: "u64" }),
  ]);
  return await signAndSubmitTransaction(txXdr);
}

// ---------------- READ METHODS ---------------- //

export async function getTicketDetails(ticketId: number) {
  try {
    return await runSimulatedRead("get_ticket", [
      nativeToScVal(ticketId, { type: "u64" }),
    ]);
  } catch (e) {
    return null; // Might not exist
  }
}

export async function getTotalTickets(): Promise<number> {
  const amount = await runSimulatedRead("get_total_tickets");
  return Number(amount || 0);
}

export async function getPrice(): Promise<number> {
  const amount = await runSimulatedRead("get_price");
  return Number(amount || 0);
}
