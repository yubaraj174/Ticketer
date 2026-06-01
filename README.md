# Stellar Ticketing NFT Platform

This project is a decentralized application (dApp) built on the Stellar network that enables organizers to mint fixed supplies of non-fungible ticket tokens to represent event seats. Buyers can purchase tickets directly from the contract via native XLM, transfer them peer-to-peer securely, and the event organizer has an administrative tool to scan/invalidate these tickets during admission.

## Tech Stack

- Rust / Soroban Smart Contracts
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Stellar JS SDK v12
- Freighter Browser Wallet

## Prerequisites

- Rust installed: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Wasm target: `rustup target add wasm32-unknown-unknown`
- Stellar CLI: `cargo install --locked stellar-cli --features opt`
- Node.js 18+
- [Freighter Wallet](https://freighter.app/) extension installed in your browser.

## Project Structure

```text
/contracts
  /src
    lib.rs           # Core Soroban Ticket Contract logic containing mint, buy, and scan functions.
  Cargo.toml         # Rust package and Soroban dependencies.
/frontend
  /app
    page.tsx         # Next.js main layout incorporating the entire dashboard.
    layout.tsx       # Standard Next.js server layout.
  /components
    WalletConnect.tsx # Freighter connector component allowing auto-funding via Friendbot.
    MainFeature.tsx   # Dashboard segregations containing Buyer and Organizer views.
  /lib
    stellar.ts       # Utility wrappers targeting Freighter APIs and tx submission mechanisms.
    contract.ts      # Strictly typed RPC interaction bindings interacting with Soroban RPC.
  package.json       # Next.js workspace configurations.
.env.example         # Testnet configurations.
```

## Step 1 — Build the Smart Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

This command cross-compiles your Rust contract code into a WebAssembly binary. The output file `.wasm` runs atop the Soroban Environment natively. The generated `.wasm` file will be securely found inside the `target/wasm32-unknown-unknown/release/ticketing_contract.wasm` path.

## Step 2 — Set Up a Testnet Identity

Inside your terminal run the following commands to create a globally accessible identity tied to testnet and output it.

```bash
stellar keys generate --global my-key --network testnet
stellar keys address my-key
```

This creates a keypair directly on your machine stored securely by the CLI and funds it systematically using Friendbot via a generic testnet request, placing automated XLM balances into this wallet.

## Step 3 — Deploy Contract to Testnet

Use the CLI to deploy the contract. You must execute an initialization call immediately to properly define the organizer and price!

```bash
# 1. Deploy WASM
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
  --source my-key \
  --network testnet
```

_Copy the returned string! This is your Contract ID. You'll need it within Step 5!_

```bash
# 2. Initialize the contract state
stellar contract invoke \
  --id <PASTE_CONTRACT_ID> \
  --source my-key \
  --network testnet \
  -- \
  init \
  --organizer <PASTE_YOUR_PUBLIC_KEY> \
  --native_token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --price 100000000
```

_(The native token passed above is the standard Testnet XLM token SAC address. Price is 10 XLM inside stroops)._

## Step 4 — Install Frontend Dependencies

```bash
frontend
npm install
```

## Step 5 — Configure Environment Variables

Inside the `frontend` folder:

```bash
cp ../.env.example .env.local
```

Open `.env.local` and paste the Contract ID from Step 3 into the `NEXT_PUBLIC_CONTRACT_ID=` variable.

## Step 6 — Run the Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) inside your web browser.

## Step 7 — Using the App

- Install the [Freighter browser extension](https://freighter.app) and set it to correctly point to Testnet Mode inside settings (Settings → Preferences → Network → Testnet).
- Click "Connect Wallet" atop the site to pair your Freighter extension.
- Click "Get Testnet XLM" to fund your session wallet via Friendbot seamlessly.
- Navigate the Customer and Organizer Dashboards. Ensure you mint some test ticket blocks first via traversing to the Organizer tab as the deployer identity!

## Smart Contract Functions

- `init(organizer, native_token, price) [Write]` - Registers contract root parameters preventing double initialization attempts structurally.
- `mint(event_name, date, seat_number) [Write]` - Creates a contract-owned ticket inventory token with descriptive data properties. Restricted essentially to organizer.
- `buy_ticket(buyer, ticket_id) [Write]` - Initiates direct transfer bounds sending X stroops to the organizer dynamically and modifying structural ownership towards the caller simultaneously mapping the asset.
- `transfer(from, to, ticket_id) [Write]` - Peer-to-peer ownership validation altering ticket.owner exclusively for current valid holders.
- `scan(ticket_id) [Write]` - Mutates internal `is_scanned` booleans disabling future validity. Organizer restricted bounds.
- `get_ticket(ticket_id) [Read]` - Queries structural layout containing event, seat, dates, and ownership records.
- `get_total_tickets() [Read]` - Evaluates sequential ID indexes estimating current mint capacity deployed.
- `get_organizer() [Read]` - Public view lookup retrieving contract deployer settings.
- `get_price() [Read]` - Public view lookup evaluating set price constants.

## Common Errors & Fixes

- **"Transaction simulation failed"** → Your contract isn't deployed properly or `CONTRACT_ID` string isn't updated in `.env.local`. Make sure contract states are initialized.
- **"Freighter not found"** → The browser extension missing hooks. Install Freighter and physically refresh the DOM.
- **"Account not found"** → Address lacks reserve balances. Click "Get Testnet XLM" physically bridging Friendbot injections prior to attempting blockchain calls.
- **"wasm32 target not found"** → Your rust compiler lacks WebAssembly features structurally. Execute safely: `rustup target add wasm32-unknown-unknown`
- **Missing Token SAC:** XLM on testnet translates fundamentally to `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`. Failing to register correct underlying assets will throw authentication bounds failures!

## Testnet Resources

- Stellar Testnet Explorer: https://stellar.expert/explorer/testnet
- Stellar Lab (manual transactions): https://lab.stellar.org
- Friendbot: https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
