"use client";
import React, { useState } from "react";
import WalletConnect from "../components/WalletConnect";
import MainFeature from "../components/MainFeature";

export default function Home() {
  const [pubkey, setPubkey] = useState<string | null>(null);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent inline-block">
          Stellar Ticketing Platform
        </h1>
        <p className="text-gray-400 mt-4 text-lg">
          Secure, transparent, and immutable on-chain event tickets.
        </p>
      </header>

      <div className="flex justify-center mb-8">
        <WalletConnect setPubkey={setPubkey} />
      </div>

      <MainFeature pubkey={pubkey} />

      <footer className="mt-20 text-center text-sm text-gray-600">
        <p>Running entirely on the Stellar Testnet</p>
      </footer>
    </main>
  );
}
