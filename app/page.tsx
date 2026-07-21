import type { Metadata } from "next";
import { PortfolioDashboard } from "./PortfolioDashboard";

export const metadata: Metadata = {
  title: { absolute: "Atlas — Multi-Chain Portfolio Explorer" },
  description: "A unified view of token balances across wallets and EVM networks.",
};

export default function Home() {
  return <PortfolioDashboard />;
}
