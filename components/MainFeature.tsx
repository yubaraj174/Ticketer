"use client";
import React, { useState, useEffect } from "react";
import {
  buyTicket,
  mintTicket,
  scanTicket,
  transferTicket,
  getTotalTickets,
  getTicketDetails,
  getPrice,
} from "../lib/contract";
import {
  Ticket as TicketIcon,
  QrCode,
  Send,
  RefreshCw,
  Loader,
} from "lucide-react";

export default function MainFeature({ pubkey }: { pubkey: string | null }) {
  const [totalTickets, setTotalTickets] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"BUYER" | "ORGANIZER">("BUYER");

  // Forms
  const [buyId, setBuyId] = useState<string>("");
  const [mintEvent, setMintEvent] = useState<string>("");
  const [mintDate, setMintDate] = useState<string>("");
  const [mintSeat, setMintSeat] = useState<string>("");
  const [scanId, setScanId] = useState<string>("");
  const [txTarget, setTxTarget] = useState<string>("");
  const [txId, setTxId] = useState<string>("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_CONTRACT_ID) {
        setErrorMSG("Contract ID is missing in .env.local.");
        setLoading(false);
        return;
      }
      const total = await getTotalTickets();
      setTotalTickets(total);

      const p = await getPrice();
      setPrice(p);

      const items = [];
      for (let i = 1; i <= total; i++) {
        const tic = await getTicketDetails(i);
        if (tic) items.push(tic);
      }
      setInventory(items);
    } catch (err: any) {
      setErrorMSG("Failed fetching data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const wrapAction = async (actionId: string, fn: () => Promise<any>) => {
    setActionLoading(actionId);
    setErrorMSG(null);
    try {
      await fn();
      await fetchData();
    } catch (err: any) {
      setErrorMSG(`Operation failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && inventory.length === 0)
    return (
      <div className="text-gray-400 p-8 flex justify-center">
        <Loader className="animate-spin" size={32} />
      </div>
    );

  const myTickets = inventory.filter((t) => t.owner === pubkey);
  const availableTickets = inventory.filter(
    (t) => t.owner !== pubkey && t.owner.startsWith("C"),
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mt-6 shadow-xl">
      <div className="flex border-b border-gray-800 bg-gray-950">
        <button
          className={`flex-1 py-4 font-semibold ${activeTab === "BUYER" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:bg-gray-900"}`}
          onClick={() => setActiveTab("BUYER")}
        >
          Customer Dashboard
        </button>
        <button
          className={`flex-1 py-4 font-semibold ${activeTab === "ORGANIZER" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:bg-gray-900"}`}
          onClick={() => setActiveTab("ORGANIZER")}
        >
          Organizer Tools
        </button>
      </div>

      <div className="p-6">
        {errorMSG && (
          <div className="mb-4 bg-red-900/40 p-3 rounded border border-red-800 text-red-200 text-sm whitespace-pre-wrap">
            {errorMSG}
          </div>
        )}

        <div className="mb-6 flex justify-between items-center text-gray-300">
          <div>
            Total Minted:{" "}
            <span className="text-white font-bold">{totalTickets}</span>
          </div>
          <div>
            Ticket Cost:{" "}
            <span className="text-green-400 font-bold">
              {price / 10000000} XLM
            </span>
          </div>
          <button
            onClick={fetchData}
            className="text-gray-400 hover:text-white"
            title="Refresh state"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {activeTab === "BUYER" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TicketIcon size={20} /> Buy Ticket
              </h3>
              <div className="flex flex-col gap-3">
                <select
                  value={buyId}
                  onChange={(e) => setBuyId(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                >
                  <option value="">Select a ticket to buy...</option>
                  {availableTickets.map((t) => (
                    <option key={Number(t.id)} value={Number(t.id)}>
                      Ticket {Number(t.id)}: {t.event_name.toString()} (
                      {t.seat_number.toString()})
                    </option>
                  ))}
                </select>
                <button
                  disabled={!buyId || !pubkey || actionLoading === "buy"}
                  onClick={() =>
                    wrapAction("buy", () => buyTicket(Number(buyId)))
                  }
                  className="bg-blue-600 hover:bg-blue-500 rounded p-3 text-white font-bold disabled:opacity-50"
                >
                  {actionLoading === "buy"
                    ? "Processing..."
                    : "Purchase Ticket"}
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Send size={20} /> Transfer Ticket
              </h3>
              <div className="flex flex-col gap-3">
                <input
                  placeholder="Ticket ID"
                  type="number"
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <input
                  placeholder="Recipient Address (G...)"
                  value={txTarget}
                  onChange={(e) => setTxTarget(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <button
                  disabled={
                    !txId ||
                    !txTarget ||
                    !pubkey ||
                    actionLoading === "transfer"
                  }
                  onClick={() =>
                    wrapAction("transfer", () =>
                      transferTicket(txTarget, Number(txId)),
                    )
                  }
                  className="bg-purple-600 hover:bg-purple-500 rounded p-3 text-white font-bold disabled:opacity-50"
                >
                  {actionLoading === "transfer"
                    ? "Transferring..."
                    : "Send to Friend"}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 mt-4 bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4">
                Your Owned Tickets
              </h3>
              {!pubkey && (
                <p className="text-gray-400">
                  Please connect wallet to view tickets.
                </p>
              )}
              {pubkey && myTickets.length === 0 && (
                <p className="text-gray-400">You do not own any tickets.</p>
              )}
              <div className="flex gap-4 flex-wrap">
                {myTickets.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded shadow-md w-full md:w-64 ${t.is_scanned ? "border-red-900 bg-red-900/20 opacity-50" : "border-blue-900 bg-blue-900/20"}`}
                  >
                    <h4 className="font-bold text-xl text-white">
                      #{Number(t.id)} {t.event_name.toString()}
                    </h4>
                    <p className="text-sm text-gray-300 mt-2">
                      Seat: {t.seat_number.toString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Date: {t.date.toString()}
                    </p>
                    <span
                      className={`inline-block mt-3 px-2 py-1 text-xs rounded font-bold ${t.is_scanned ? "bg-red-800 text-red-200" : "bg-green-800 text-green-200"}`}
                    >
                      {t.is_scanned ? "SCANNED / USED" : "VALID"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "ORGANIZER" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <QrCode size={20} /> Mark Ticket as Scanned
              </h3>
              <div className="flex flex-col gap-3">
                <input
                  placeholder="Ticket ID to scan"
                  type="number"
                  value={scanId}
                  onChange={(e) => setScanId(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <button
                  disabled={!scanId || !pubkey || actionLoading === "scan"}
                  onClick={() =>
                    wrapAction("scan", () => scanTicket(Number(scanId)))
                  }
                  className="bg-orange-600 hover:bg-orange-500 rounded p-3 text-white font-bold disabled:opacity-50"
                >
                  {actionLoading === "scan"
                    ? "Scanning..."
                    : "Scan / Consume Ticket"}
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-dashed border-gray-600">
              <h3 className="text-lg font-bold text-white mb-4">
                Mint New Ticket
              </h3>
              <div className="flex flex-col gap-3">
                <input
                  placeholder="Event Name (e.g. Node Congress)"
                  value={mintEvent}
                  onChange={(e) => setMintEvent(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <input
                  placeholder="Date (e.g. 2026-10-31)"
                  value={mintDate}
                  onChange={(e) => setMintDate(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <input
                  placeholder="Seat Number (e.g. A1)"
                  value={mintSeat}
                  onChange={(e) => setMintSeat(e.target.value)}
                  className="p-3 rounded bg-gray-900 border border-gray-700 text-white"
                />
                <button
                  disabled={
                    !mintEvent ||
                    !mintDate ||
                    !mintSeat ||
                    !pubkey ||
                    actionLoading === "mint"
                  }
                  onClick={() =>
                    wrapAction("mint", () =>
                      mintTicket(mintEvent, mintDate, mintSeat),
                    )
                  }
                  className="bg-green-600 hover:bg-green-500 rounded p-3 text-white font-bold disabled:opacity-50"
                >
                  {actionLoading === "mint" ? "Minting..." : "Mint Ticket"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
