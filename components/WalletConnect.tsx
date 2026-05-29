"use client";
import React, { useState } from "react";
import { getFreighterPublicKey, fundWithFriendbot } from "../lib/stellar";
import { Wallet, Coins, LogOut } from "lucide-react";

export default function WalletConnect({
  setPubkey,
}: {
  setPubkey: (key: string | null) => void;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const key = await getFreighterPublicKey();
      setAddress(key);
      setPubkey(key);
    } catch (e: any) {
      setError(e.message || "Failed to connect to Freighter");
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    if (!address) return;
    try {
      setLoading(true);
      setError(null);
      await fundWithFriendbot(address);
      alert("Successfully funded wallet with Testnet XLM!");
    } catch (e: any) {
      setError(e.message || "Failed to fund via Friendbot");
    } finally {
      setLoading(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-gray-900 rounded-lg border border-gray-800 shadow-sm">
      {!address ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          <Wallet size={18} />
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-mono text-sm text-gray-200">
              {truncate(address)}
            </span>
          </div>

          <button
            onClick={handleFund}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            <Coins size={18} />
            {loading ? "Funding..." : "Get Testnet XLM"}
          </button>

          <button
            onClick={() => {
              setAddress(null);
              setPubkey(null);
            }}
            className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <LogOut size={18} />
            Disconnect
          </button>
        </>
      )}

      {error && <div className="text-red-400 text-sm ml-auto">{error}</div>}
    </div>
  );
}
